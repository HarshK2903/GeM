package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/config"
	"github.com/gemverify/gateway/internal/database"
	"github.com/gemverify/gateway/internal/ws"
)

type TenderHandler struct {
	cfg *config.Config
}

func NewTenderHandler(cfg *config.Config) *TenderHandler {
	return &TenderHandler{cfg: cfg}
}

type CreateTenderRequest struct {
	Title               string   `json:"title"`
	Description         string   `json:"description"`
	TenderType          string   `json:"tender_type"`
	Department          string   `json:"department"`
	Category            string   `json:"category,omitempty"`
	EstimatedValue      *float64 `json:"estimated_value,omitempty"`
	EMDAmount           *float64 `json:"emd_amount,omitempty"`
	RequiredDocuments   []string `json:"required_documents"`
	MakeInIndiaRequired bool     `json:"make_in_india_required"`
	MSMERequired        bool     `json:"msme_required"`
	StartupRequired     bool     `json:"startup_required"`
	MinTurnover         *float64 `json:"min_turnover,omitempty"`
	LocalContentPct     *float64 `json:"local_content_percentage,omitempty"`
	SubmissionDeadline  string   `json:"submission_deadline"`
}

func (h *TenderHandler) ListTenders(c *fiber.Ctx) error {
	role, _ := c.Locals("user_role").(string)
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	offset := (page - 1) * perPage

	var query string
	var args []interface{}

	if role == "bidder" {
		query = `SELECT t.id, t.title, t.reference_number, t.tender_type, t.status, t.department,
				t.estimated_value, t.submission_deadline, t.created_at, u.full_name,
				(SELECT COUNT(*) FROM bids WHERE bids.tender_id = t.id) as bid_count
				FROM tenders t JOIN users u ON t.created_by = u.id
				WHERE t.status IN ('published', 'open') ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`
		args = []interface{}{perPage, offset}
	} else {
		query = `SELECT t.id, t.title, t.reference_number, t.tender_type, t.status, t.department,
				t.estimated_value, t.submission_deadline, t.created_at, u.full_name,
				(SELECT COUNT(*) FROM bids WHERE bids.tender_id = t.id) as bid_count
				FROM tenders t JOIN users u ON t.created_by = u.id
				ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`
		args = []interface{}{perPage, offset}
	}

	rows, err := database.Pool.Query(context.Background(), query, args...)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list tenders")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	tenders := []fiber.Map{}
	for rows.Next() {
		var id uuid.UUID
		var title, refNum, tType, status, dept, officerName string
		var estValue *float64
		var deadline, createdAt time.Time
		var bidCount int
		if err := rows.Scan(&id, &title, &refNum, &tType, &status, &dept, &estValue, &deadline, &createdAt, &officerName, &bidCount); err != nil {
			continue
		}
		tenders = append(tenders, fiber.Map{
			"id": id.String(), "title": title, "reference_number": refNum,
			"tender_type": tType, "status": status, "department": dept,
			"estimated_value": estValue, "submission_deadline": deadline.Format(time.RFC3339),
			"created_at": createdAt.Format(time.RFC3339), "officer_name": officerName, "bid_count": bidCount,
		})
	}
	return c.JSON(fiber.Map{"items": tenders, "total": len(tenders), "page": page, "per_page": perPage})
}

func (h *TenderHandler) CreateTender(c *fiber.Ctx) error {
	var req CreateTenderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Title == "" || req.Department == "" || req.SubmissionDeadline == "" {
		return c.Status(400).JSON(fiber.Map{"error": "title, department, submission_deadline required"})
	}

	userID, _ := c.Locals("user_id").(string)
	tenderID := uuid.New()
	refNumber := fmt.Sprintf("GEM/%s/%s/%04d", time.Now().Format("2006"), req.Department[:min(3, len(req.Department))], time.Now().UnixNano()%10000)

	deadline, err := time.Parse(time.RFC3339, req.SubmissionDeadline)
	if err != nil {
		deadline, _ = time.Parse("2006-01-02", req.SubmissionDeadline)
	}

	_, err = database.Pool.Exec(context.Background(),
		`INSERT INTO tenders (id, created_by, title, reference_number, description, tender_type, status, department, category, estimated_value, emd_amount, required_documents, make_in_india_required, msme_required, startup_required, min_turnover, local_content_percentage, submission_deadline)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		tenderID, userID, req.Title, refNumber, req.Description, req.TenderType, "published", req.Department, req.Category, req.EstimatedValue, req.EMDAmount, req.RequiredDocuments, req.MakeInIndiaRequired, req.MSMERequired, req.StartupRequired, req.MinTurnover, req.LocalContentPct, deadline)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create tender")
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create tender"})
	}

	// Audit trail
	database.Pool.Exec(context.Background(),
		`INSERT INTO audit_trail (user_id, tender_id, action, entity_type, entity_id, description) VALUES ($1,$2,$3,$4,$5,$6)`,
		userID, tenderID, "tender.created", "tender", tenderID.String(), fmt.Sprintf("Tender '%s' created", req.Title))

	// Real-time broadcast to bidders
	ws.GlobalHub.BroadcastToRole("bidder", ws.Message{Type: "tender.created", Data: fiber.Map{"id": tenderID.String(), "title": req.Title, "department": req.Department}})

	return c.Status(201).JSON(fiber.Map{"id": tenderID.String(), "reference_number": refNumber, "status": "published"})
}

func (h *TenderHandler) GetTender(c *fiber.Ctx) error {
	tenderID := c.Params("id")
	row := database.Pool.QueryRow(context.Background(),
		`SELECT t.id, t.created_by, t.title, t.reference_number, t.description, t.tender_type, t.status, t.department, t.category, t.estimated_value, t.emd_amount, t.make_in_india_required, t.msme_required, t.startup_required, t.min_turnover, t.local_content_percentage, t.submission_deadline, t.created_at, u.full_name
		 FROM tenders t JOIN users u ON t.created_by = u.id WHERE t.id = $1`, tenderID)

	var id uuid.UUID
	var createdBy, title, refNum, desc, tType, status, dept string
	var category *string
	var estVal, emd, minTurn, localPct *float64
	var mii, msme, startup bool
	var deadline, createdAt time.Time
	var officerName string

	if err := row.Scan(&id, &createdBy, &title, &refNum, &desc, &tType, &status, &dept, &category, &estVal, &emd, &mii, &msme, &startup, &minTurn, &localPct, &deadline, &createdAt, &officerName); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Tender not found"})
	}

	return c.JSON(fiber.Map{
		"id": id.String(), "created_by": createdBy, "title": title, "reference_number": refNum,
		"description": desc, "tender_type": tType, "status": status, "department": dept,
		"category": category, "estimated_value": estVal, "emd_amount": emd,
		"make_in_india_required": mii, "msme_required": msme, "startup_required": startup,
		"min_turnover": minTurn, "local_content_percentage": localPct,
		"submission_deadline": deadline.Format(time.RFC3339), "created_at": createdAt.Format(time.RFC3339),
		"officer_name": officerName,
	})
}

func (h *TenderHandler) UpdateTenderStatus(c *fiber.Ctx) error {
	tenderID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)
	var body struct{ Status string `json:"status"` }
	if err := c.BodyParser(&body); err != nil || body.Status == "" {
		return c.Status(400).JSON(fiber.Map{"error": "status required"})
	}
	result, err := database.Pool.Exec(context.Background(), `UPDATE tenders SET status=$1, updated_at=NOW() WHERE id=$2`, body.Status, tenderID)
	if err != nil || result.RowsAffected() == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Tender not found"})
	}
	database.Pool.Exec(context.Background(), `INSERT INTO audit_trail (user_id, tender_id, action, entity_type, entity_id, description) VALUES ($1,$2,$3,$4,$5,$6)`,
		userID, tenderID, "tender.status_updated", "tender", tenderID, fmt.Sprintf("Status → %s", body.Status))
	return c.JSON(fiber.Map{"message": "Status updated", "status": body.Status})
}
