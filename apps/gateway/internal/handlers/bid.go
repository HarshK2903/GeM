package handlers

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/config"
	"github.com/gemverify/gateway/internal/database"
	"github.com/gemverify/gateway/internal/storage"
	"github.com/gemverify/gateway/internal/ws"
)

type BidHandler struct {
	cfg *config.Config
}

func NewBidHandler(cfg *config.Config) *BidHandler {
	return &BidHandler{cfg: cfg}
}

func (h *BidHandler) SubmitBid(c *fiber.Ctx) error {
	bidderID, _ := c.Locals("user_id").(string)
	tenderID := c.FormValue("tender_id")
	bidAmount := c.FormValue("bid_amount")

	if tenderID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "tender_id required"})
	}

	// Check tender exists and is open
	var tStatus string
	var deadline time.Time
	err := database.Pool.QueryRow(context.Background(),
		`SELECT status, submission_deadline FROM tenders WHERE id = $1`, tenderID,
	).Scan(&tStatus, &deadline)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Tender not found"})
	}
	if tStatus != "published" {
		return c.Status(400).JSON(fiber.Map{"error": "Tender is not open for bidding"})
	}
	if time.Now().After(deadline) {
		return c.Status(400).JSON(fiber.Map{"error": "Submission deadline has passed"})
	}

	// Check duplicate bid
	var exists bool
	database.Pool.QueryRow(context.Background(),
		`SELECT EXISTS(SELECT 1 FROM bids WHERE tender_id=$1 AND bidder_id=$2 AND status != 'withdrawn')`,
		tenderID, bidderID).Scan(&exists)
	if exists {
		return c.Status(409).JSON(fiber.Map{"error": "You have already submitted a bid for this tender"})
	}

	bidID := uuid.New()
	_, err = database.Pool.Exec(context.Background(),
		`INSERT INTO bids (id, tender_id, bidder_id, status, bid_amount) VALUES ($1,$2,$3,$4,$5)`,
		bidID, tenderID, bidderID, "submitted", bidAmount)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create bid")
		return c.Status(500).JSON(fiber.Map{"error": "Failed to submit bid"})
	}

	// Handle file uploads
	form, err := c.MultipartForm()
	docIDs := []string{}
	if err == nil && form != nil {
		for docType, files := range form.File {
			for _, file := range files {
				docID := uuid.New()
				ext := filepath.Ext(file.Filename)
				objectName := fmt.Sprintf("bids/%s/%s/%s%s", tenderID, bidID.String(), docID.String(), ext)

				f, err := file.Open()
				if err != nil {
					continue
				}

				if storage.Client != nil {
					_, err = storage.UploadFile(context.Background(), objectName, f, file.Size, file.Header.Get("Content-Type"))
					f.Close()
					if err != nil {
						log.Warn().Err(err).Str("doc", docType).Msg("Failed to upload to MinIO")
						continue
					}
				} else {
					f.Close()
					objectName = fmt.Sprintf("local://%s", objectName)
				}

				_, err = database.Pool.Exec(context.Background(),
					`INSERT INTO documents (id, bid_id, doc_type, file_path, original_filename, file_size, mime_type)
					 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
					docID, bidID, docType, objectName, file.Filename, file.Size, file.Header.Get("Content-Type"))
				if err != nil {
					log.Warn().Err(err).Msg("Failed to save document record")
				}
				docIDs = append(docIDs, docID.String())
			}
		}
	}

	// Audit
	database.Pool.Exec(context.Background(),
		`INSERT INTO audit_trail (user_id, tender_id, bid_id, action, entity_type, entity_id, description)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		bidderID, tenderID, bidID, "bid.submitted", "bid", bidID.String(),
		fmt.Sprintf("Bid submitted with %d documents", len(docIDs)))

	// Notify officers
	ws.GlobalHub.BroadcastToRole("officer", ws.Message{
		Type: "bid.submitted",
		Data: fiber.Map{"bid_id": bidID.String(), "tender_id": tenderID, "documents": len(docIDs)},
	})

	// Notify bidder
	ws.GlobalHub.SendToUser(bidderID, ws.Message{
		Type: "bid.status_changed",
		Data: fiber.Map{"bid_id": bidID.String(), "status": "submitted"},
	})

	return c.Status(201).JSON(fiber.Map{
		"bid_id":    bidID.String(),
		"status":    "submitted",
		"documents": len(docIDs),
		"message":   "Bid submitted successfully. AI verification will begin shortly.",
	})
}

func (h *BidHandler) ListBidsForTender(c *fiber.Ctx) error {
	tenderID := c.Params("tenderId")
	rows, err := database.Pool.Query(context.Background(),
		`SELECT b.id, b.bidder_id, b.status, b.bid_amount, b.submitted_at, u.full_name, u.organization,
			cr.overall_score, cr.risk_level
		 FROM bids b
		 JOIN users u ON b.bidder_id = u.id
		 LEFT JOIN compliance_results cr ON cr.bid_id = b.id
		 WHERE b.tender_id = $1
		 ORDER BY COALESCE(cr.overall_score, 0) DESC`, tenderID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	bids := []fiber.Map{}
	for rows.Next() {
		var bidID, bidderID uuid.UUID
		var status, bidderName string
		var org *string
		var amount *float64
		var submittedAt time.Time
		var score *float64
		var riskLevel *string
		if err := rows.Scan(&bidID, &bidderID, &status, &amount, &submittedAt, &bidderName, &org, &score, &riskLevel); err != nil {
			continue
		}
		bids = append(bids, fiber.Map{
			"id": bidID.String(), "bidder_id": bidderID.String(), "status": status,
			"bid_amount": amount, "submitted_at": submittedAt.Format(time.RFC3339),
			"bidder_name": bidderName, "organization": org,
			"compliance_score": score, "risk_level": riskLevel,
		})
	}
	return c.JSON(fiber.Map{"items": bids, "total": len(bids)})
}

func (h *BidHandler) GetMyBids(c *fiber.Ctx) error {
	bidderID, _ := c.Locals("user_id").(string)
	rows, err := database.Pool.Query(context.Background(),
		`SELECT b.id, b.tender_id, b.status, b.bid_amount, b.submitted_at,
			b.clarification_reason, b.officer_override_reason,
			t.title, t.reference_number, t.department,
			cr.overall_score, cr.risk_level
		 FROM bids b
		 JOIN tenders t ON b.tender_id = t.id
		 LEFT JOIN compliance_results cr ON cr.bid_id = b.id
		 WHERE b.bidder_id = $1 ORDER BY b.submitted_at DESC`, bidderID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	bids := []fiber.Map{}
	for rows.Next() {
		var bidID, tenderID uuid.UUID
		var status string
		var amount *float64
		var submittedAt time.Time
		var clarReason, overrideReason *string
		var tTitle, tRef, tDept string
		var score *float64
		var riskLevel *string
		if err := rows.Scan(&bidID, &tenderID, &status, &amount, &submittedAt, &clarReason, &overrideReason, &tTitle, &tRef, &tDept, &score, &riskLevel); err != nil {
			continue
		}
		bids = append(bids, fiber.Map{
			"id": bidID.String(), "tender_id": tenderID.String(), "status": status,
			"bid_amount": amount, "submitted_at": submittedAt.Format(time.RFC3339),
			"clarification_reason": clarReason, "officer_override_reason": overrideReason,
			"tender_title": tTitle, "tender_ref": tRef, "department": tDept,
			"compliance_score": score, "risk_level": riskLevel,
		})
	}
	return c.JSON(fiber.Map{"items": bids, "total": len(bids)})
}

func (h *BidHandler) OfficerDecision(c *fiber.Ctx) error {
	bidID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)

	var body struct {
		Decision      string `json:"decision"`
		Reason        string `json:"reason"`
		OverrideAI    bool   `json:"override_ai"`
		OverrideReason string `json:"override_reason"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}

	statusMap := map[string]string{
		"approve": "approved", "reject": "rejected", "clarify": "clarification",
	}
	newStatus, ok := statusMap[body.Decision]
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "decision must be approve, reject, or clarify"})
	}

	overrideReason := ""
	if body.OverrideAI {
		if body.OverrideReason == "" {
			return c.Status(400).JSON(fiber.Map{"error": "override_reason required when overriding AI"})
		}
		overrideReason = body.OverrideReason
	}

	clarReason := ""
	if body.Decision == "clarify" {
		clarReason = body.Reason
	}

	_, err := database.Pool.Exec(context.Background(),
		`UPDATE bids SET status=$1, officer_decision_by=$2, officer_override_reason=$3,
			clarification_reason=$4, decision_at=NOW(), updated_at=NOW() WHERE id=$5`,
		newStatus, userID, overrideReason, clarReason, bidID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update bid"})
	}

	// Get bidder ID for notification
	var bidderID string
	database.Pool.QueryRow(context.Background(), `SELECT bidder_id FROM bids WHERE id=$1`, bidID).Scan(&bidderID)

	// Audit
	database.Pool.Exec(context.Background(),
		`INSERT INTO audit_trail (user_id, bid_id, action, entity_type, entity_id, description)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		userID, bidID, "officer."+body.Decision, "bid", bidID,
		fmt.Sprintf("Officer decision: %s. Override: %v", body.Decision, body.OverrideAI))

	// Notify bidder in real-time
	ws.GlobalHub.SendToUser(bidderID, ws.Message{
		Type: "bid.status_changed",
		Data: fiber.Map{"bid_id": bidID, "status": newStatus, "reason": body.Reason},
	})

	return c.JSON(fiber.Map{"message": "Decision recorded", "status": newStatus})
}

// POST /api/bids/:id/withdraw
func (h *BidHandler) WithdrawBid(c *fiber.Ctx) error {
	bidID := c.Params("id")
	bidderID, _ := c.Locals("user_id").(string)

	var req struct {
		Reason string `json:"withdrawal_reason"`
	}
	if err := c.BodyParser(&req); err != nil {
		req.Reason = "Withdrawn by bidder"
	}

	// Verify bid belongs to bidder and is in allowed state
	var status, tenderID string
	err := database.Pool.QueryRow(context.Background(),
		`SELECT status, tender_id FROM bids WHERE id = $1 AND bidder_id = $2`, bidID, bidderID,
	).Scan(&status, &tenderID)
	
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Bid not found or access denied"})
	}

	if status != "submitted" && status != "under_review" {
		return c.Status(400).JSON(fiber.Map{"error": "Only submitted or under_review bids can be withdrawn"})
	}

	// Update bid
	_, err = database.Pool.Exec(context.Background(),
		`UPDATE bids SET status = 'withdrawn', withdrawn_at = NOW(), withdrawal_reason = $1, updated_at = NOW() WHERE id = $2`,
		req.Reason, bidID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to withdraw bid")
		return c.Status(500).JSON(fiber.Map{"error": "Failed to withdraw bid"})
	}

	// Audit log
	database.Pool.Exec(context.Background(),
		`INSERT INTO audit_trail (user_id, bid_id, action, entity_type, entity_id, description)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		bidderID, bidID, "bid.withdrawn", "bid", bidID,
		fmt.Sprintf("Bid withdrawn: %s", req.Reason))

	// Notify officers
	ws.GlobalHub.BroadcastToRole("officer", ws.Message{
		Type: "bid.withdrawn",
		Data: fiber.Map{"bid_id": bidID, "tender_id": tenderID, "reason": req.Reason},
	})

	return c.JSON(fiber.Map{"message": "Bid withdrawn successfully", "status": "withdrawn"})
}

// GET /api/bids/all
func (h *BidHandler) ListAllBids(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	statusFilter := c.Query("status")
	offset := (page - 1) * perPage

	var args []interface{}
	query := `
		SELECT b.id, b.status, b.bid_amount, b.submitted_at, b.withdrawn_at, b.withdrawal_reason,
			t.id as tender_id, t.title as tender_title, t.reference_number as tender_ref,
			u.id as bidder_id, u.full_name as bidder_name, u.organization,
			cr.overall_score, cr.risk_level
		FROM bids b
		JOIN tenders t ON b.tender_id = t.id
		JOIN users u ON b.bidder_id = u.id
		LEFT JOIN compliance_results cr ON cr.bid_id = b.id
	`

	if statusFilter != "" {
		query += ` WHERE b.status = $1 ORDER BY b.submitted_at DESC LIMIT $2 OFFSET $3`
		args = []interface{}{statusFilter, perPage, offset}
	} else {
		query += ` ORDER BY b.submitted_at DESC LIMIT $1 OFFSET $2`
		args = []interface{}{perPage, offset}
	}

	rows, err := database.Pool.Query(context.Background(), query, args...)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list all bids")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	var bids []fiber.Map
	for rows.Next() {
		var bidID, tenderID, bidderID uuid.UUID
		var status, tenderTitle, tenderRef, bidderName string
		var org, withdrawalReason *string
		var amount, score *float64
		var submittedAt time.Time
		var withdrawnAt *time.Time
		var riskLevel *string

		err := rows.Scan(&bidID, &status, &amount, &submittedAt, &withdrawnAt, &withdrawalReason,
			&tenderID, &tenderTitle, &tenderRef,
			&bidderID, &bidderName, &org,
			&score, &riskLevel)
		if err != nil {
			continue
		}

		bid := fiber.Map{
			"id": bidID.String(),
			"status": status,
			"bid_amount": amount,
			"submitted_at": submittedAt.Format(time.RFC3339),
			"tender": fiber.Map{
				"id": tenderID.String(),
				"title": tenderTitle,
				"reference_number": tenderRef,
			},
			"bidder": fiber.Map{
				"id": bidderID.String(),
				"name": bidderName,
				"organization": org,
			},
			"compliance_score": score,
			"risk_level": riskLevel,
		}

		if withdrawnAt != nil {
			bid["withdrawn_at"] = withdrawnAt.Format(time.RFC3339)
			bid["withdrawal_reason"] = withdrawalReason
		}

		bids = append(bids, bid)
	}

	return c.JSON(fiber.Map{
		"items": bids,
		"total": len(bids),
		"page": page,
		"per_page": perPage,
	})
}
