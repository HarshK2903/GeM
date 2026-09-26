package handlers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/config"
	"github.com/gemverify/gateway/internal/database"
	"github.com/gemverify/gateway/internal/grpcclient"
	"github.com/gemverify/gateway/internal/ws"
	pb "github.com/gemverify/gateway/proto/ai"
)

type ComplianceHandler struct {
	cfg *config.Config
}

func NewComplianceHandler(cfg *config.Config) *ComplianceHandler {
	return &ComplianceHandler{cfg: cfg}
}

// GetComplianceResult returns the AI compliance result for a bid
func (h *ComplianceHandler) GetComplianceResult(c *fiber.Ctx) error {
	bidID := c.Params("bidId")

	var id uuid.UUID
	var overallScore, eligScore, compScore, riskScore, completeScore, qualityScore float64
	var riskLevel string
	var aiRec, reasonTrace *string
	var pipelineDuration *int64
	var generatedAt time.Time

	err := database.Pool.QueryRow(context.Background(),
		`SELECT id, overall_score, eligibility_score, compliance_score, risk_score,
			completeness_score, quality_score, risk_level,
			ai_recommendation, reasoning_trace,
			pipeline_duration_ms, generated_at
		 FROM compliance_results WHERE bid_id = $1`, bidID,
	).Scan(&id, &overallScore, &eligScore, &compScore, &riskScore,
		&completeScore, &qualityScore, &riskLevel,
		&aiRec, &reasonTrace,
		&pipelineDuration, &generatedAt)

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "No compliance result found for this bid"})
	}

	return c.JSON(fiber.Map{
		"id": id.String(), "bid_id": bidID,
		"overall_score": overallScore, "eligibility_score": eligScore,
		"compliance_score": compScore, "risk_score": riskScore,
		"completeness_score": completeScore, "quality_score": qualityScore,
		"risk_level": riskLevel, "ai_recommendation": aiRec,
		"reasoning_trace": reasonTrace, "pipeline_duration_ms": pipelineDuration,
		"generated_at": generatedAt.Format(time.RFC3339),
	})
}

// GetBidDocuments returns all documents for a bid
func (h *ComplianceHandler) GetBidDocuments(c *fiber.Ctx) error {
	bidID := c.Params("bidId")
	rows, err := database.Pool.Query(context.Background(),
		`SELECT id, doc_type, original_filename, file_size, mime_type,
			verification_status, ocr_confidence, uploaded_at
		 FROM documents WHERE bid_id = $1 ORDER BY uploaded_at`, bidID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	docs := []fiber.Map{}
	for rows.Next() {
		var docID uuid.UUID
		var docType, origName string
		var fileSize *int64
		var mimeType, verStatus *string
		var ocrConf *float64
		var uploadedAt time.Time
		if err := rows.Scan(&docID, &docType, &origName, &fileSize, &mimeType, &verStatus, &ocrConf, &uploadedAt); err != nil {
			continue
		}
		docs = append(docs, fiber.Map{
			"id": docID.String(), "doc_type": docType, "original_filename": origName,
			"file_size": fileSize, "mime_type": mimeType,
			"verification_status": verStatus, "ocr_confidence": ocrConf,
			"uploaded_at": uploadedAt.Format(time.RFC3339),
		})
	}
	return c.JSON(fiber.Map{"items": docs, "total": len(docs)})
}

// TriggerPipeline triggers AI compliance pipeline for a bid via gRPC
func (h *ComplianceHandler) TriggerPipeline(c *fiber.Ctx) error {
	bidID := c.Params("bidId")
	userID, _ := c.Locals("user_id").(string)

	// Update bid status
	_, err := database.Pool.Exec(context.Background(),
		`UPDATE bids SET status = 'ai_processing', updated_at = NOW() WHERE id = $1`, bidID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update bid status"})
	}

	// Notify bidder via WebSocket
	var bidderID string
	database.Pool.QueryRow(context.Background(), `SELECT bidder_id FROM bids WHERE id=$1`, bidID).Scan(&bidderID)
	ws.GlobalHub.SendToUser(bidderID, ws.Message{Type: "bid.status_changed", Data: fiber.Map{"bid_id": bidID, "status": "ai_processing"}})

	// Audit
	database.Pool.Exec(context.Background(),
		`INSERT INTO audit_trail (user_id, bid_id, action, entity_type, entity_id, description)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, bidID, "pipeline.triggered", "bid", bidID, "AI compliance pipeline triggered")

	// Get documents and tender info for the pipeline
	var tenderID string
	database.Pool.QueryRow(context.Background(), `SELECT tender_id FROM bids WHERE id=$1`, bidID).Scan(&tenderID)

	// Fetch documents
	docRows, _ := database.Pool.Query(context.Background(),
		`SELECT id, doc_type, file_path, original_filename, mime_type FROM documents WHERE bid_id = $1`, bidID)
	var documents []map[string]string
	if docRows != nil {
		defer docRows.Close()
		for docRows.Next() {
			var dID uuid.UUID
			var dType, fPath, origName, mime string
			if err := docRows.Scan(&dID, &dType, &fPath, &origName, &mime); err != nil {
				continue
			}
			documents = append(documents, map[string]string{
				"document_id": dID.String(), "doc_type": dType,
				"file_path": fPath, "original_filename": origName, "mime_type": mime,
			})
		}
	}

	// Fetch tender requirements
	tenderReqs := map[string]interface{}{}
	var dept string
	var msme, mii, startup bool
	var minTurn, localPct *float64
	var reqDocs []byte
	err = database.Pool.QueryRow(context.Background(),
		`SELECT department, required_documents, msme_required, make_in_india_required,
			startup_required, min_turnover, local_content_percentage
		 FROM tenders WHERE id = $1`, tenderID,
	).Scan(&dept, &reqDocs, &msme, &mii, &startup, &minTurn, &localPct)
	if err == nil {
		tenderReqs["department"] = dept
		tenderReqs["msme_required"] = msme
		tenderReqs["make_in_india_required"] = mii
		tenderReqs["startup_required"] = startup
		if minTurn != nil { tenderReqs["min_turnover"] = *minTurn }
		if localPct != nil { tenderReqs["local_content_percentage"] = *localPct }
		var docList []string
		json.Unmarshal(reqDocs, &docList)
		tenderReqs["required_documents"] = docList
	}

	var bidAmount, estimatedValue float64
	var bidderName, bidderOrg string
	var bidCount int
	err = database.Pool.QueryRow(context.Background(), `SELECT b.bid_amount, COALESCE(t.estimated_value, 0), u.full_name, COALESCE(u.organization, ''), (SELECT COUNT(*) FROM bids WHERE bidder_id = b.bidder_id) FROM bids b JOIN tenders t ON b.tender_id = t.id JOIN users u ON b.bidder_id = u.id WHERE b.id = $1`, bidID).Scan(&bidAmount, &estimatedValue, &bidderName, &bidderOrg, &bidCount)
	if err == nil {
		bidMeta := map[string]interface{}{
			"bid_amount":          bidAmount,
			"estimated_value":     estimatedValue,
			"bidder_name":         bidderName,
			"bidder_organization": bidderOrg,
			"bidder_bid_count":    bidCount,
		}
		bidMetaJSON, _ := json.Marshal(bidMeta)
		tenderReqs["eligibility_criteria_json"] = string(bidMetaJSON)
	}

	// Send pipeline.started event immediately
	ws.GlobalHub.SendToUser(userID, ws.Message{
		Type: "pipeline.started",
		Data: map[string]interface{}{
			"bid_id": bidID,
			"steps": []string{"ocr", "verification", "matching", "fraud_detection", "scoring", "recommendation"},
		},
	})
	ws.GlobalHub.BroadcastToRole("officer", ws.Message{
		Type: "pipeline.started",
		Data: map[string]interface{}{
			"bid_id": bidID,
			"steps": []string{"ocr", "verification", "matching", "fraud_detection", "scoring", "recommendation"},
		},
	})

	// Run pipeline in goroutine (non-blocking)
	go func() {
		if grpcclient.Client == nil {
			log.Warn().Msg("AI service not connected — skipping pipeline")
			database.Pool.Exec(context.Background(),
				`UPDATE bids SET status = 'under_review', updated_at = NOW() WHERE id = $1`, bidID)
			return
		}

		go func() {
			stream, err := grpcclient.StreamPipelineProgress(context.Background(), &pb.PipelineRequest{
				BidId: bidID,
				TenderId: tenderID,
			})
			if err == nil {
				for {
					event, err := stream.Recv()
					if err != nil {
						break
					}
					ws.GlobalHub.SendToUser(userID, ws.Message{
						Type: "pipeline.progress",
						Data: map[string]interface{}{
							"bid_id": bidID,
							"step": event.GetStepName(),
							"status": event.GetStatus(), 
							"message": event.GetMessage(),
							"progress": event.GetProgressPercent(),
						},
					})
					ws.GlobalHub.BroadcastToRole("officer", ws.Message{
						Type: "pipeline.progress",
						Data: map[string]interface{}{
							"bid_id": bidID,
							"step": event.GetStepName(),
							"status": event.GetStatus(),
							"message": event.GetMessage(),
							"progress": event.GetProgressPercent(),
						},
					})
				}
			}
		}()

		result, err := grpcclient.RunPipeline(
			context.Background(), bidID, tenderID,
			documents, tenderReqs, false, nil,
		)
		if err != nil {
			log.Error().Err(err).Str("bid_id", bidID).Msg("Pipeline failed")
			database.Pool.Exec(context.Background(),
				`UPDATE bids SET status = 'under_review', updated_at = NOW() WHERE id = $1`, bidID)
			ws.GlobalHub.SendToUser(bidderID, ws.Message{Type: "pipeline.error", Data: fiber.Map{"bid_id": bidID, "error": err.Error()}})
			return
		}

		// Store results
		flagsJSON, _ := json.Marshal(result.Flags)
		issuesJSON, _ := json.Marshal(result.Issues)
		evidenceJSON, _ := json.Marshal(result.Evidence)
		matchesJSON, _ := json.Marshal(result.ReqMatches)
		stepsJSON, _ := json.Marshal([]string{})

		_, err = database.Pool.Exec(context.Background(),
			`INSERT INTO compliance_results (bid_id, overall_score, eligibility_score, compliance_score,
				risk_score, completeness_score, quality_score, risk_level,
				requirement_matches, flags, issues, evidence,
				ai_recommendation, reasoning_trace,
				pipeline_duration_ms, pipeline_steps_completed)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			 ON CONFLICT (bid_id) DO UPDATE SET
				overall_score=$2, eligibility_score=$3, compliance_score=$4,
				risk_score=$5, completeness_score=$6, quality_score=$7, risk_level=$8,
				requirement_matches=$9, flags=$10, issues=$11, evidence=$12,
				ai_recommendation=$13, reasoning_trace=$14,
				pipeline_duration_ms=$15, pipeline_steps_completed=$16, generated_at=NOW()`,
			bidID, result.OverallScore, result.EligibilityScore, result.ComplianceScore,
			result.RiskScore, result.CompletenessScore, result.QualityScore, result.RiskLevel,
			matchesJSON, flagsJSON, issuesJSON, evidenceJSON,
			result.AIRecommendation, result.ReasoningTrace,
			result.PipelineDurationMs, stepsJSON,
		)
		if err != nil {
			log.Error().Err(err).Msg("Failed to store compliance results")
		}

		// Update bid status
		database.Pool.Exec(context.Background(),
			`UPDATE bids SET status = 'under_review', updated_at = NOW() WHERE id = $1`, bidID)

		// Notify via WebSocket
		ws.GlobalHub.SendToUser(bidderID, ws.Message{
			Type: "pipeline.complete",
			Data: fiber.Map{"bid_id": bidID, "score": result.OverallScore, "risk_level": result.RiskLevel},
		})
		ws.GlobalHub.BroadcastToRole("officer", ws.Message{
			Type: "pipeline.complete",
			Data: fiber.Map{"bid_id": bidID, "score": result.OverallScore, "risk_level": result.RiskLevel},
		})

		log.Info().Str("bid_id", bidID).Float64("score", result.OverallScore).Msg("Pipeline results stored")
	}()

	return c.JSON(fiber.Map{
		"message": "AI compliance pipeline triggered",
		"bid_id":  bidID,
		"status":  "ai_processing",
	})
}
