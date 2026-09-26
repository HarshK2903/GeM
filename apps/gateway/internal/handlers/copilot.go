package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/grpcclient"
	pb "github.com/gemverify/gateway/proto/ai"
)

type CopilotHandler struct {
	// grpcClient wrapper package doesn't have an instance struct, it uses global funcs, 
	// so we don't strictly need a field, but keeping it empty struct for pattern consistency,
	// or we can just make it an empty struct.
}

func NewCopilotHandler() *CopilotHandler {
	return &CopilotHandler{}
}

// POST /api/copilot/ask
func (h *CopilotHandler) AskCopilot(c *fiber.Ctx) error {
	var req struct {
		BidID         string   `json:"bid_id"`
		TenderID      string   `json:"tender_id"`
		Question      string   `json:"question"`
		ContextDocIDs []string `json:"context_doc_ids"`
		Department    string   `json:"department"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	if req.Question == "" {
		return c.Status(400).JSON(fiber.Map{"error": "question is required"})
	}

	// Call gRPC AskCopilot
	pbReq := &pb.CopilotRequest{
		BidId:         req.BidID,
		TenderId:      req.TenderID,
		Question:      req.Question,
		ContextDocIds: req.ContextDocIDs,
		Department:    req.Department,
	}

	resp, err := grpcclient.AskCopilot(c.Context(), pbReq)
	if err != nil {
		log.Error().Err(err).Msg("Failed to call Copilot")
		return c.Status(500).JSON(fiber.Map{"error": "failed to ask copilot"})
	}

	// Format citations
	citations := make([]fiber.Map, 0, len(resp.Citations))
	for _, cit := range resp.Citations {
		citations = append(citations, fiber.Map{
			"source": cit.Source,
			"text":   cit.Text,
			"page":   cit.Page,
		})
	}

	return c.JSON(fiber.Map{
		"answer":     resp.Answer,
		"citations":  citations,
		"confidence": resp.Confidence,
	})
}
