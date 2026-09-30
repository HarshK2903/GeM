package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

var Pool *pgxpool.Pool

func Connect(databaseURL string) error {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("failed to parse database URL: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 2

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Pool = pool
	log.Info().Msg("✅ PostgreSQL connected")
	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
		log.Info().Msg("PostgreSQL connection closed")
	}
}

// RunMigrations creates tables if they don't exist (dev mode)
func RunMigrations(ctx context.Context) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
		`CREATE EXTENSION IF NOT EXISTS "vector"`,

		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			full_name VARCHAR(255) NOT NULL,
			role VARCHAR(20) NOT NULL DEFAULT 'bidder' CHECK (role IN ('bidder', 'officer', 'admin')),
			organization VARCHAR(255),
			phone VARCHAR(20),
			profile_data JSONB DEFAULT '{}',
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Tenders table
		`CREATE TABLE IF NOT EXISTS tenders (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			created_by UUID NOT NULL REFERENCES users(id),
			title VARCHAR(500) NOT NULL,
			reference_number VARCHAR(50) UNIQUE NOT NULL,
			description TEXT NOT NULL,
			tender_type VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (tender_type IN ('open', 'limited', 'single', 'two_part')),
			status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'open', 'under_evaluation', 'evaluation', 'awarded', 'closed', 'suspended', 'cancelled')),
			department VARCHAR(255) NOT NULL,
			category VARCHAR(255),
			estimated_value NUMERIC(15,2),
			emd_amount NUMERIC(15,2),
			eligibility_requirements JSONB DEFAULT '{}',
			ai_parsed_requirements JSONB DEFAULT '{}',
			required_documents JSONB DEFAULT '[]',
			make_in_india_required BOOLEAN DEFAULT false,
			msme_required BOOLEAN DEFAULT false,
			startup_required BOOLEAN DEFAULT false,
			min_turnover NUMERIC(15,2),
			local_content_percentage NUMERIC(5,2),
			submission_deadline TIMESTAMPTZ NOT NULL,
			opening_date TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Bids table
		`CREATE TABLE IF NOT EXISTS bids (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			tender_id UUID NOT NULL REFERENCES tenders(id),
			bidder_id UUID NOT NULL REFERENCES users(id),
			status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'ai_processing', 'under_review', 'approved', 'rejected', 'clarification', 'withdrawn')),
			bid_amount NUMERIC(15,2),
			technical_proposal JSONB DEFAULT '{}',
			financial_proposal JSONB DEFAULT '{}',
			bidder_info JSONB DEFAULT '{}',
			clarification_reason TEXT,
			clarification_response TEXT,
			officer_decision_by UUID REFERENCES users(id),
			officer_override_reason TEXT,
			decision_at TIMESTAMPTZ,
			emd_paid BOOLEAN DEFAULT false,
			emd_transaction_id VARCHAR(100),
			withdrawn_at TIMESTAMPTZ,
			withdrawal_reason TEXT,
			submitted_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(tender_id, bidder_id)
		)`,

		// Documents table
		`CREATE TABLE IF NOT EXISTS documents (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
			doc_type VARCHAR(50) NOT NULL,
			file_path VARCHAR(500) NOT NULL,
			original_filename VARCHAR(255) NOT NULL,
			file_size BIGINT,
			mime_type VARCHAR(100),
			ocr_raw_text TEXT,
			ocr_extracted_data JSONB DEFAULT '{}',
			ocr_confidence FLOAT,
			verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'processing', 'verified', 'failed', 'mismatch', 'not_found', 'expired')),
			verification_result JSONB DEFAULT '{}',
			verification_errors JSONB DEFAULT '[]',
			verified_at TIMESTAMPTZ,
			uploaded_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Compliance results table
		`CREATE TABLE IF NOT EXISTS compliance_results (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			bid_id UUID UNIQUE NOT NULL REFERENCES bids(id),
			overall_score FLOAT NOT NULL DEFAULT 0,
			eligibility_score FLOAT NOT NULL DEFAULT 0,
			compliance_score FLOAT NOT NULL DEFAULT 0,
			risk_score FLOAT NOT NULL DEFAULT 0,
			completeness_score FLOAT NOT NULL DEFAULT 0,
			quality_score FLOAT NOT NULL DEFAULT 0,
			risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
			requirement_matches JSONB DEFAULT '{}',
			flags JSONB DEFAULT '[]',
			issues JSONB DEFAULT '[]',
			evidence JSONB DEFAULT '{}',
			ai_recommendation TEXT,
			reasoning_trace TEXT,
			reasoning_trace_structured JSONB DEFAULT '{}',
			pipeline_duration_ms BIGINT,
			pipeline_steps_completed JSONB DEFAULT '[]',
			raw_scoring_data JSONB DEFAULT '{}',
			generated_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Audit trail table
		`CREATE TABLE IF NOT EXISTS audit_trail (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id UUID REFERENCES users(id),
			tender_id UUID REFERENCES tenders(id),
			bid_id UUID REFERENCES bids(id),
			action VARCHAR(100) NOT NULL,
			entity_type VARCHAR(50) NOT NULL,
			entity_id VARCHAR(36),
			description TEXT,
			before_state JSONB,
			after_state JSONB,
			metadata_extra JSONB DEFAULT '{}',
			ip_address VARCHAR(45),
			user_agent VARCHAR(500),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Mock registry table
		`CREATE TABLE IF NOT EXISTS mock_registry (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			registry_type VARCHAR(50) NOT NULL,
			registration_number VARCHAR(100) NOT NULL,
			entity_name VARCHAR(500) NOT NULL,
			data JSONB NOT NULL DEFAULT '{}',
			is_active BOOLEAN DEFAULT true,
			last_updated TIMESTAMPTZ DEFAULT NOW()
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status)`,
		`CREATE INDEX IF NOT EXISTS idx_tenders_department ON tenders(department)`,
		`CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id)`,
		`CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id)`,
		`CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status)`,
		`CREATE INDEX IF NOT EXISTS idx_documents_bid ON documents(bid_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_trail(action)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_mock_registry_type ON mock_registry(registry_type)`,
		`CREATE INDEX IF NOT EXISTS idx_mock_registry_number ON mock_registry(registration_number)`,
	}

	for _, q := range queries {
		if _, err := Pool.Exec(ctx, q); err != nil {
			log.Warn().Err(err).Str("query", q[:min(80, len(q))]).Msg("Migration query warning")
		}
	}

	log.Info().Msg("✅ Database migrations complete")
	return nil
}
