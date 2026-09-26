package handlers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/gemverify/gateway/internal/cache"
)

type AnalyticsHandler struct {
	pool *pgxpool.Pool
}

func NewAnalyticsHandler(pool *pgxpool.Pool) *AnalyticsHandler {
	return &AnalyticsHandler{pool: pool}
}

// GET /api/analytics/summary
func (h *AnalyticsHandler) GetSummary(c *fiber.Ctx) error {
	cacheKey := "analytics:summary"
	var result fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	result = fiber.Map{
		"total_tenders": 0,
		"total_bids": 0,
		"avg_compliance_score": 0.0,
		"avg_pipeline_duration_ms": 0,
		"bids_by_status": map[string]int{},
		"tenders_by_status": map[string]int{},
	}

	ctx := context.Background()

	var totalTenders, totalBids int
	var avgScore float64
	var avgDuration int

	_ = h.pool.QueryRow(ctx, "SELECT COUNT(*) FROM tenders").Scan(&totalTenders)
	_ = h.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bids").Scan(&totalBids)
	_ = h.pool.QueryRow(ctx, "SELECT COALESCE(AVG(overall_score), 0), COALESCE(AVG(pipeline_duration_ms), 0) FROM compliance_results").
		Scan(&avgScore, &avgDuration)

	result["total_tenders"] = totalTenders
	result["total_bids"] = totalBids
	result["avg_compliance_score"] = avgScore
	result["avg_pipeline_duration_ms"] = avgDuration

	rows, _ := h.pool.Query(ctx, "SELECT status, COUNT(*) FROM bids GROUP BY status")
	bidsByStatus := make(map[string]int)
	if rows != nil {
		for rows.Next() {
			var status string
			var count int
			_ = rows.Scan(&status, &count)
			bidsByStatus[status] = count
		}
		rows.Close()
	}
	result["bids_by_status"] = bidsByStatus

	tRows, _ := h.pool.Query(ctx, "SELECT status, COUNT(*) FROM tenders GROUP BY status")
	tendersByStatus := make(map[string]int)
	if tRows != nil {
		for tRows.Next() {
			var status string
			var count int
			_ = tRows.Scan(&status, &count)
			tendersByStatus[status] = count
		}
		tRows.Close()
	}
	result["tenders_by_status"] = tendersByStatus

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}

// GET /api/analytics/department-stats
func (h *AnalyticsHandler) GetDepartmentStats(c *fiber.Ctx) error {
	cacheKey := "analytics:department-stats"
	var result []fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	query := `
		SELECT 
			t.department, 
			COALESCE(AVG(cr.overall_score), 0) as avg_score, 
			COUNT(b.id) as total_bids,
			SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) as approved,
			SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected
		FROM tenders t
		LEFT JOIN bids b ON t.id = b.tender_id
		LEFT JOIN compliance_results cr ON b.id = cr.bid_id
		GROUP BY t.department
	`
	rows, err := h.pool.Query(context.Background(), query)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query department stats")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	for rows.Next() {
		var dept string
		var avgScore float64
		var total, approved, rejected int
		if err := rows.Scan(&dept, &avgScore, &total, &approved, &rejected); err == nil {
			result = append(result, fiber.Map{
				"department": dept,
				"avg_score": avgScore,
				"total_bids": total,
				"approved": approved,
				"rejected": rejected,
			})
		}
	}

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}

// GET /api/analytics/risk-distribution
func (h *AnalyticsHandler) GetRiskDistribution(c *fiber.Ctx) error {
	cacheKey := "analytics:risk-distribution"
	var result []fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	query := `
		SELECT risk_level, COUNT(*) as count, 
		ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM compliance_results), 2) as percentage
		FROM compliance_results GROUP BY risk_level
	`
	rows, err := h.pool.Query(context.Background(), query)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query risk distribution")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	for rows.Next() {
		var risk string
		var count int
		var percentage float64
		if err := rows.Scan(&risk, &count, &percentage); err == nil {
			result = append(result, fiber.Map{
				"risk_level": risk,
				"count": count,
				"percentage": percentage,
			})
		}
	}

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}

// GET /api/analytics/requirement-compliance
func (h *AnalyticsHandler) GetRequirementCompliance(c *fiber.Ctx) error {
	cacheKey := "analytics:requirement-compliance"
	var result []fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	query := `SELECT requirement_matches FROM compliance_results WHERE requirement_matches IS NOT NULL`
	rows, err := h.pool.Query(context.Background(), query)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query requirement compliance")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	stats := make(map[string]map[string]int)

	for rows.Next() {
		var matchesJSON []byte
		if err := rows.Scan(&matchesJSON); err != nil {
			continue
		}
		
		var matches []map[string]interface{}
		if err := json.Unmarshal(matchesJSON, &matches); err != nil {
			continue
		}
		
		for _, match := range matches {
			reqID, _ := match["requirement_id"].(string)
			status, _ := match["status"].(string)
			if reqID == "" || status == "" {
				continue
			}
			
			if _, ok := stats[reqID]; !ok {
				stats[reqID] = map[string]int{"met": 0, "partial": 0, "unmet": 0}
			}
			stats[reqID][status]++
		}
	}

	for reqID, s := range stats {
		result = append(result, fiber.Map{
			"requirement": reqID,
			"met": s["met"],
			"partial": s["partial"],
			"unmet": s["unmet"],
		})
	}

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}

// GET /api/analytics/timeline
func (h *AnalyticsHandler) GetTimeline(c *fiber.Ctx) error {
	cacheKey := "analytics:timeline"
	var result []fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	query := `
		SELECT 
			DATE(b.submitted_at) as date,
			COUNT(b.id) as bids_submitted,
			COALESCE(AVG(cr.overall_score), 0) as avg_score
		FROM bids b
		LEFT JOIN compliance_results cr ON b.id = cr.bid_id
		WHERE b.submitted_at IS NOT NULL
		GROUP BY DATE(b.submitted_at)
		ORDER BY date ASC
	`
	rows, err := h.pool.Query(context.Background(), query)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query timeline")
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}
	defer rows.Close()

	for rows.Next() {
		var date time.Time
		var count int
		var avg float64
		if err := rows.Scan(&date, &count, &avg); err == nil {
			result = append(result, fiber.Map{
				"date": date.Format("2006-01-02"),
				"bids_submitted": count,
				"avg_score": avg,
			})
		}
	}

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}

// GET /api/analytics/score-dimensions
func (h *AnalyticsHandler) GetScoreDimensions(c *fiber.Ctx) error {
	cacheKey := "analytics:score-dimensions"
	var result fiber.Map
	
	if err := cache.Get(c.Context(), cacheKey, &result); err == nil {
		return c.JSON(result)
	}

	query := `
		SELECT 
			COALESCE(AVG(eligibility_score), 0),
			COALESCE(AVG(compliance_score), 0),
			COALESCE(AVG(risk_score), 0),
			COALESCE(AVG(completeness_score), 0),
			COALESCE(AVG(quality_score), 0),
			COALESCE(AVG(overall_score), 0)
		FROM compliance_results
	`
	
	result = fiber.Map{}
	var el, co, ri, cm, qu, ov float64
	err := h.pool.QueryRow(context.Background(), query).Scan(&el, &co, &ri, &cm, &qu, &ov)
	if err == nil {
		result["eligibility"] = el
		result["compliance"] = co
		result["risk"] = ri
		result["completeness"] = cm
		result["quality"] = qu
		result["overall"] = ov
	}

	cache.Set(c.Context(), cacheKey, result, 2*time.Minute)
	return c.JSON(result)
}
