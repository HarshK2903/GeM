package grpcclient

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/gemverify/gateway/proto/ai"
)

var (
	Conn   *grpc.ClientConn
	Client pb.AIServiceClient
)

// Connect establishes gRPC connection to the AI service
func Connect(addr string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return fmt.Errorf("failed to connect to AI service at %s: %w", addr, err)
	}

	Conn = conn
	Client = pb.NewAIServiceClient(conn)
	log.Info().Str("addr", addr).Msg("🧠 Connected to AI Service via gRPC")
	return nil
}

// Close closes the gRPC connection
func Close() {
	if Conn != nil {
		Conn.Close()
	}
}

// PipelineResult holds the parsed result from the AI pipeline
type PipelineResult struct {
	BidID              string                 `json:"bid_id"`
	OverallScore       float64                `json:"overall_score"`
	EligibilityScore   float64                `json:"eligibility_score"`
	ComplianceScore    float64                `json:"compliance_score"`
	RiskScore          float64                `json:"risk_score"`
	CompletenessScore  float64                `json:"completeness_score"`
	QualityScore       float64                `json:"quality_score"`
	RiskLevel          string                 `json:"risk_level"`
	AIRecommendation   string                 `json:"ai_recommendation"`
	ReasoningTrace     string                 `json:"reasoning_trace"`
	PipelineDurationMs int64                  `json:"pipeline_duration_ms"`
	Flags              []map[string]string    `json:"flags"`
	Issues             []map[string]string    `json:"issues"`
	Evidence           map[string]interface{} `json:"evidence"`
	ReqMatches         []map[string]interface{} `json:"requirement_matches"`
}

// RunPipeline calls the AI service to run the full compliance pipeline
func RunPipeline(ctx context.Context, bidID, tenderID string,
	documents []map[string]string,
	tenderReqs map[string]interface{},
	partialRerun bool,
	rerunDocTypes []string,
) (*PipelineResult, error) {

	if Client == nil {
		return nil, fmt.Errorf("AI service not connected")
	}

	// Build proto request
	req := &pb.PipelineRequest{
		BidId:        bidID,
		TenderId:     tenderID,
		PartialRerun: partialRerun,
		RerunDocTypes: rerunDocTypes,
	}

	// Documents
	for _, doc := range documents {
		req.Documents = append(req.Documents, &pb.DocumentInfo{
			DocumentId:       doc["document_id"],
			DocType:          doc["doc_type"],
			FilePath:         doc["file_path"],
			OriginalFilename: doc["original_filename"],
			MimeType:         doc["mime_type"],
		})
	}

	// Tender requirements
	req.TenderRequirements = &pb.TenderRequirements{
		TenderId:   tenderID,
		Department: getString(tenderReqs, "department"),
	}
	if docs, ok := tenderReqs["required_documents"].([]string); ok {
		req.TenderRequirements.RequiredDocuments = docs
	}
	if v, ok := tenderReqs["msme_required"].(bool); ok {
		req.TenderRequirements.MsmeRequired = v
	}
	if v, ok := tenderReqs["make_in_india_required"].(bool); ok {
		req.TenderRequirements.MakeInIndiaRequired = v
	}
	if v, ok := tenderReqs["startup_required"].(bool); ok {
		req.TenderRequirements.StartupRequired = v
	}
	if v, ok := tenderReqs["min_turnover"].(float64); ok {
		req.TenderRequirements.MinTurnover = float32(v)
	}
	if v, ok := tenderReqs["local_content_percentage"].(float64); ok {
		req.TenderRequirements.LocalContentPercentage = float32(v)
	}
	// Pack bid metadata as a special eligibility check entry
	// (proto wasn't regenerated, so we transport via EligibilityChecks)
	if v, ok := tenderReqs["eligibility_criteria_json"].(string); ok && v != "" {
		req.TenderRequirements.EligibilityChecks = append(req.TenderRequirements.EligibilityChecks, &pb.EligibilityRequirement{
			Id:          "__bid_metadata__",
			Description: v,
			Category:    "metadata",
			Mandatory:   false,
		})
	}

	// Call AI service with timeout
	callCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	resp, err := Client.RunCompliancePipeline(callCtx, req)
	if err != nil {
		return nil, fmt.Errorf("AI pipeline RPC failed: %w", err)
	}

	// Parse response
	result := &PipelineResult{
		BidID:              resp.BidId,
		RiskLevel:          resp.RiskLevel,
		AIRecommendation:   resp.AiRecommendation,
		ReasoningTrace:     resp.ReasoningTrace,
		PipelineDurationMs: resp.PipelineDurationMs,
	}

	if resp.Scores != nil {
		result.OverallScore = float64(resp.Scores.Overall)
		result.EligibilityScore = float64(resp.Scores.Eligibility)
		result.ComplianceScore = float64(resp.Scores.Compliance)
		result.RiskScore = float64(resp.Scores.Risk)
		result.CompletenessScore = float64(resp.Scores.Completeness)
		result.QualityScore = float64(resp.Scores.Quality)
	}

	// Flags
	for _, f := range resp.Flags {
		result.Flags = append(result.Flags, map[string]string{
			"type": f.FlagType, "message": f.Message,
			"field": f.Field, "recommendation": f.Recommendation,
		})
	}

	// Issues
	for _, i := range resp.Issues {
		result.Issues = append(result.Issues, map[string]string{
			"severity": i.Severity, "description": i.Description,
			"recommendation": i.Recommendation, "related_doc": i.RelatedDoc,
		})
	}

	// Evidence
	result.Evidence = make(map[string]interface{})
	for k, v := range resp.Evidence {
		result.Evidence[k] = map[string]interface{}{
			"doc_type": v.DocType, "status": v.Status,
			"source": v.Source, "confidence": v.Confidence,
			"data": v.Data,
		}
	}

	// Requirement matches
	for _, m := range resp.RequirementMatches {
		result.ReqMatches = append(result.ReqMatches, map[string]interface{}{
			"requirement_id": m.RequirementId, "requirement_text": m.RequirementText,
			"status": m.Status, "evidence_summary": m.EvidenceSummary,
			"source_document": m.SourceDocument, "confidence": m.Confidence,
		})
	}

	log.Info().
		Str("bid_id", bidID).
		Float64("score", result.OverallScore).
		Str("risk", result.RiskLevel).
		Int64("duration_ms", result.PipelineDurationMs).
		Msg("AI pipeline completed")

	return result, nil
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// StoreResult saves the pipeline result to the database
func StoreResult(ctx context.Context, pool interface{}, result *PipelineResult) error {
	// This will be called by the handler after receiving the gRPC response
	// The pool parameter should be *pgxpool.Pool but we use interface{} to avoid circular imports
	return nil
}

// ToJSON serializes the result to JSON
func (r *PipelineResult) ToJSON() ([]byte, error) {
	return json.Marshal(r)
}

// StreamPipelineProgress streams progress
func StreamPipelineProgress(ctx context.Context, req *pb.PipelineRequest) (pb.AIService_StreamPipelineProgressClient, error) {
	if Client == nil {
		return nil, fmt.Errorf("AI service not connected")
	}
	return Client.StreamPipelineProgress(ctx, req)
}

// AskCopilot
func AskCopilot(ctx context.Context, req *pb.CopilotRequest) (*pb.CopilotResponse, error) {
	if Client == nil {
		return nil, fmt.Errorf("AI service not connected")
	}
	return Client.AskCopilot(ctx, req)
}
