package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://gemuser:gempass123@localhost:5432/gemverify?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		fmt.Println("❌ DB connect failed:", err)
		os.Exit(1)
	}
	defer pool.Close()

	ctx := context.Background()
	fmt.Println("🌱 GemVerify Seed — Populating demo data...")

	// --------------------------------------------------
	// 0. Fix constraints and create missing tables
	// --------------------------------------------------
	fmt.Println("\n[0/8] Fixing constraints & creating tables...")
	pool.Exec(ctx, `ALTER TABLE tenders DROP CONSTRAINT IF EXISTS tenders_status_check`)
	pool.Exec(ctx, `ALTER TABLE tenders ADD CONSTRAINT tenders_status_check CHECK (status IN ('draft','published','open','under_evaluation','evaluation','awarded','closed','suspended','cancelled'))`)
	pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS support_messages (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tender_id UUID NOT NULL REFERENCES tenders(id),
		sender_id UUID NOT NULL REFERENCES users(id),
		receiver_id UUID REFERENCES users(id),
		message TEXT NOT NULL,
		message_type VARCHAR(50) DEFAULT 'text',
		metadata JSONB DEFAULT '{}',
		is_read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMPTZ DEFAULT NOW()
	)`)

	// Full cleanup of ALL seeded data
	fmt.Println("  Cleaning previous seed data...")
	pool.Exec(ctx, `DELETE FROM support_messages`)
	pool.Exec(ctx, `DELETE FROM compliance_results`)
	pool.Exec(ctx, `DELETE FROM documents`)
	pool.Exec(ctx, `DELETE FROM audit_trail`)
	pool.Exec(ctx, `DELETE FROM bids`)
	pool.Exec(ctx, `DELETE FROM tenders`)
	pool.Exec(ctx, `DELETE FROM users`)

	// --------------------------------------------------
	// 1. Seed Users
	// --------------------------------------------------
	fmt.Println("[1/8] Seeding users...")
	hash, _ := bcrypt.GenerateFromPassword([]byte("Demo@1234"), bcrypt.DefaultCost)
	pw := string(hash)

	type User struct {
		ID, Email, Name, Role, Org, Phone string
	}
	users := []User{
		{"11111111-0000-0000-0000-000000000001", "rajesh.kumar@gem.gov.in", "Dr. Rajesh Kumar", "officer", "Ministry of Electronics & IT", "+91 98765 43210"},
		{"11111111-0000-0000-0000-000000000002", "sunita.sharma@gem.gov.in", "Sunita Sharma", "officer", "Ministry of Health & Family Welfare", "+91 98765 43211"},
		{"22222222-0000-0000-0000-000000000001", "amit@techflow.in", "Amit Kumar", "bidder", "TechFlow Systems Pvt Ltd", "+91 99887 76655"},
		{"22222222-0000-0000-0000-000000000002", "priya@mediequip.in", "Priya Patel", "bidder", "MediEquip Solutions", "+91 99887 76656"},
		{"22222222-0000-0000-0000-000000000003", "rahul@apexcon.in", "Rahul Sharma", "bidder", "Apex Constructions Ltd", "+91 99887 76657"},
		{"22222222-0000-0000-0000-000000000004", "anita@greenbuild.in", "Anita Desai", "bidder", "GreenBuild Infrastructure", "+91 99887 76658"},
		{"22222222-0000-0000-0000-000000000005", "vikram@cloudnet.in", "Vikram Singh", "bidder", "CloudNet India Pvt Ltd", "+91 99887 76659"},
	}
	for _, u := range users {
		_, err := pool.Exec(ctx, `INSERT INTO users (id, email, password_hash, full_name, role, organization, phone) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			u.ID, u.Email, pw, u.Name, u.Role, u.Org, u.Phone)
		if err != nil {
			fmt.Printf("  ⚠ User %s: %v\n", u.Email, err)
		}
	}
	fmt.Println("  ✅ 7 users created (password: Demo@1234)")

	// --------------------------------------------------
	// 2. Seed Tenders
	// --------------------------------------------------
	fmt.Println("[2/8] Seeding tenders...")
	type Tender struct {
		ID, Title, Ref, Desc, Type, Status, Dept, Category string
		Value, EMD, Turnover                                float64
		MakeInIndia, MSME                                   bool
		CreatedBy                                           string
		DaysAgo                                             int
		DeadlineDays                                        int
	}
	tenders := []Tender{
		{
			"33333333-0000-0000-0000-000000000001",
			"Procurement of High-End Servers for National Data Center",
			"GEM/2026/B/10001",
			"Supply, installation, and commissioning of 500 enterprise-grade rack servers with minimum 64-core processors, 512GB RAM, and 10TB NVMe storage each. Includes 5-year comprehensive AMC with 4-hour response time SLA. Must comply with MeitY guidelines for government data centers. Delivery at NIC Data Center, CGO Complex, New Delhi.",
			"open", "open",
			"Ministry of Electronics & IT", "IT Hardware",
			50000000, 2500000, 10000000, true, true,
			"11111111-0000-0000-0000-000000000001", 15, 20,
		},
		{
			"33333333-0000-0000-0000-000000000002",
			"Annual Maintenance Contract for Medical Equipment",
			"GEM/2026/Hea/9070",
			"Comprehensive annual maintenance contract for CT scanners (3 units), MRI machines (2 units), and digital X-ray systems (8 units) across AIIMS campus hospitals. Includes preventive maintenance, breakdown response within 2 hours, and replacement of all spare parts except tubes. OEM-trained engineers required.",
			"open", "under_evaluation",
			"Ministry of Health & Family Welfare", "Medical Equipment",
			15000000, 750000, 5000000, false, true,
			"11111111-0000-0000-0000-000000000002", 30, -2,
		},
		{
			"33333333-0000-0000-0000-000000000003",
			"Smart City IoT Sensor Network Deployment — Phase II",
			"GEM/2026/SC/4521",
			"Design, supply, install, and maintain IoT sensor network across 200km of roads in Smart City Bhubaneswar. Includes 5,000 environmental sensors, 2,000 traffic monitoring nodes, 500 flood detection sensors, and central command & control software platform with real-time dashboards.",
			"two_part", "published",
			"Ministry of Housing & Urban Affairs", "Smart City",
			120000000, 6000000, 25000000, true, false,
			"11111111-0000-0000-0000-000000000001", 5, 45,
		},
		{
			"33333333-0000-0000-0000-000000000004",
			"Cloud Migration Services for Income Tax Department",
			"GEM/2026/IT/7788",
			"End-to-end cloud migration of Income Tax Department's legacy applications (12 apps, 500TB data) to Government Cloud (MeghRaj). Includes assessment, re-architecture, migration, testing, and 1-year post-migration support. Must maintain zero-downtime during migration windows.",
			"limited", "awarded",
			"Ministry of Finance", "Cloud Services",
			85000000, 4250000, 20000000, true, false,
			"11111111-0000-0000-0000-000000000001", 60, -15,
		},
		{
			"33333333-0000-0000-0000-000000000005",
			"Construction of District Hospital — Varanasi",
			"GEM/2026/Con/3345",
			"Construction of 200-bed district hospital with OPD, IPD, Emergency, OT complex, diagnostic center, pharmacy, and administrative block. Total built-up area approximately 25,000 sq.m. IGBC Green Building certification required. Completion within 18 months.",
			"open", "open",
			"Ministry of Health & Family Welfare", "Construction",
			250000000, 12500000, 50000000, true, true,
			"11111111-0000-0000-0000-000000000002", 10, 30,
		},
		{
			"33333333-0000-0000-0000-000000000006",
			"Supply of Electric Buses — Jaipur BRTS",
			"GEM/2026/Trn/1190",
			"Supply and delivery of 100 electric buses (12m standard floor, AC, 200km range) for Jaipur BRTS corridor. Includes charging infrastructure setup at 4 depots, training of drivers and maintenance staff, and 10-year battery warranty.",
			"open", "draft",
			"Ministry of Road Transport & Highways", "Transport",
			350000000, 17500000, 75000000, true, true,
			"11111111-0000-0000-0000-000000000001", 2, 60,
		},
	}

	reqDocs := `[
		{"name": "Udyam Registration Certificate", "type": "udyam", "mandatory": true},
		{"name": "GST Registration Certificate", "type": "gst", "mandatory": true},
		{"name": "PAN Card", "type": "pan", "mandatory": true},
		{"name": "Income Tax Returns (3 years)", "type": "itr", "mandatory": true},
		{"name": "Company Registration (MCA21)", "type": "mca21", "mandatory": true},
		{"name": "Balance Sheet (last 3 years)", "type": "balance_sheet", "mandatory": true},
		{"name": "Work Experience Certificates", "type": "experience", "mandatory": true},
		{"name": "ISO 9001 Certificate", "type": "iso", "mandatory": false},
		{"name": "EMD Proof", "type": "emd", "mandatory": true},
		{"name": "EPFO Registration", "type": "epfo", "mandatory": true},
		{"name": "ESIC Registration", "type": "esic", "mandatory": false}
	]`
	eligibility := `{
		"min_years_experience": 5,
		"min_annual_turnover": "As per tender",
		"required_certifications": ["ISO 9001:2015"],
		"blacklist_check": true,
		"msme_preference": true,
		"make_in_india": true
	}`

	for _, t := range tenders {
		createdAt := time.Now().AddDate(0, 0, -t.DaysAgo)
		deadline := time.Now().AddDate(0, 0, t.DeadlineDays)
		openingDate := deadline.AddDate(0, 0, 2)
		_, err := pool.Exec(ctx, `INSERT INTO tenders
			(id, created_by, title, reference_number, description, tender_type, status,
			 department, category, estimated_value, emd_amount, min_turnover,
			 make_in_india_required, msme_required, required_documents, eligibility_requirements,
			 submission_deadline, opening_date, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)`,
			t.ID, t.CreatedBy, t.Title, t.Ref, t.Desc, t.Type, t.Status,
			t.Dept, t.Category, t.Value, t.EMD, t.Turnover,
			t.MakeInIndia, t.MSME, reqDocs, eligibility,
			deadline, openingDate, createdAt)
		if err != nil {
			fmt.Printf("  ⚠ Tender %s: %v\n", t.Ref, err)
		}
	}
	fmt.Println("  ✅ 6 tenders created (draft, published, open, under_evaluation, awarded)")

	// --------------------------------------------------
	// 3. Seed Bids
	// --------------------------------------------------
	fmt.Println("[3/8] Seeding bids...")
	type Bid struct {
		ID, TenderID, BidderID, Status string
		Amount                         float64
		DaysAgo                        int
	}
	bids := []Bid{
		// Tender 1 (open) — 3 bids
		{"44444444-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001", "under_review", 48500000, 5},
		{"44444444-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000005", "submitted", 49200000, 3},
		{"44444444-0000-0000-0000-000000000003", "33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000003", "submitted", 51000000, 2},
		// Tender 2 (under_evaluation) — 3 bids
		{"44444444-0000-0000-0000-000000000004", "33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002", "approved", 14200000, 20},
		{"44444444-0000-0000-0000-000000000005", "33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000001", "under_review", 14800000, 18},
		{"44444444-0000-0000-0000-000000000006", "33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000004", "rejected", 19000000, 16},
		// Tender 4 (awarded) — 2 bids
		{"44444444-0000-0000-0000-000000000007", "33333333-0000-0000-0000-000000000004", "22222222-0000-0000-0000-000000000001", "approved", 82000000, 45},
		{"44444444-0000-0000-0000-000000000008", "33333333-0000-0000-0000-000000000004", "22222222-0000-0000-0000-000000000005", "rejected", 88000000, 42},
		// Tender 5 (open) — 2 bids
		{"44444444-0000-0000-0000-000000000009", "33333333-0000-0000-0000-000000000005", "22222222-0000-0000-0000-000000000003", "submitted", 240000000, 4},
		{"44444444-0000-0000-0000-000000000010", "33333333-0000-0000-0000-000000000005", "22222222-0000-0000-0000-000000000004", "submitted", 248000000, 3},
	}

	bidderInfo := `{
		"company_name": "Demo Company",
		"company_type": "private_limited",
		"address": "123 Business Park, Sector 62, Noida, UP 201301",
		"udyam_number": "UDYAM-UP-00-0012345",
		"gstin": "09AAACH7409R1ZS",
		"pan": "AAACH7409R",
		"cin": "U72200UP2015PTC123456",
		"epfo_number": "DLCPM0012345000",
		"esic_number": "12345678901234567"
	}`

	for _, b := range bids {
		submittedAt := time.Now().AddDate(0, 0, -b.DaysAgo)
		_, err := pool.Exec(ctx, `INSERT INTO bids
			(id, tender_id, bidder_id, status, bid_amount, bidder_info, emd_paid, emd_transaction_id, submitted_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
			b.ID, b.TenderID, b.BidderID, b.Status, b.Amount, bidderInfo, true, "EMD-TXN-"+b.ID[:8], submittedAt)
		if err != nil {
			fmt.Printf("  ⚠ Bid %s: %v\n", b.ID[:8], err)
		}
	}
	fmt.Println("  ✅ 10 bids created across 4 tenders")

	// --------------------------------------------------
	// 4. Seed Documents (metadata only — no real files)
	// --------------------------------------------------
	fmt.Println("[4/8] Seeding document records...")
	docTypes := []struct {
		DocType, FileName string
	}{
		{"udyam", "Udyam_Certificate.pdf"},
		{"gst", "GST_Registration.pdf"},
		{"pan", "PAN_Card.pdf"},
		{"itr", "ITR_2023-24.pdf"},
		{"mca21", "MCA21_Certificate.pdf"},
		{"balance_sheet", "Balance_Sheet_2024.pdf"},
		{"experience", "Work_Experience_Certificate.pdf"},
		{"iso", "ISO_9001_Certificate.pdf"},
		{"emd", "EMD_Receipt.pdf"},
		{"epfo", "EPFO_Registration.pdf"},
	}

	bidIDs := []string{
		"44444444-0000-0000-0000-000000000001",
		"44444444-0000-0000-0000-000000000004",
		"44444444-0000-0000-0000-000000000005",
		"44444444-0000-0000-0000-000000000007",
		"44444444-0000-0000-0000-000000000009",
	}

	verificationStatuses := []string{"verified", "verified", "verified", "verified", "verified", "verified", "verified", "pending", "verified", "verified"}
	docCount := 0
	for _, bidID := range bidIDs {
		for i, dt := range docTypes {
			vStatus := verificationStatuses[i]
			ocrData := `{"extracted_number": "DEMO12345", "entity_name": "Demo Company", "valid_until": "2027-03-31", "confidence": 0.96}`
			vResult := fmt.Sprintf(`{"registry_match": true, "status": "active", "verified_name": "Demo Company", "verification_source": "Mock Registry"}`)
			_, err := pool.Exec(ctx, `INSERT INTO documents
				(bid_id, doc_type, file_path, original_filename, file_size, mime_type,
				 ocr_raw_text, ocr_extracted_data, ocr_confidence, verification_status, verification_result, verified_at)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
				bidID, dt.DocType, "uploads/demo/"+dt.FileName, dt.FileName,
				256000, "application/pdf",
				"[OCR Placeholder] Document recognized. Registration number: DEMO12345. Entity: Demo Company. Status: Active. Valid until: 31-Mar-2027.",
				ocrData, 0.96, vStatus, vResult, time.Now().AddDate(0, 0, -3))
			if err == nil {
				docCount++
			}
		}
	}
	fmt.Printf("  ✅ %d document records created\n", docCount)

	// --------------------------------------------------
	// 5. Seed Compliance Results (AI scores)
	// --------------------------------------------------
	fmt.Println("[5/8] Seeding compliance scores...")
	type Score struct {
		BidID                                                   string
		Overall, Eligibility, Compliance, Risk, Complete, Qual float64
		RiskLevel, Recommendation                              string
	}
	scores := []Score{
		{"44444444-0000-0000-0000-000000000001", 92.5, 95.0, 90.0, 15.0, 98.0, 88.0, "low", "RECOMMEND APPROVAL — Strong compliance across all parameters. All documents verified. Company meets turnover and experience requirements. Make in India certified."},
		{"44444444-0000-0000-0000-000000000002", 78.0, 82.0, 75.0, 35.0, 85.0, 72.0, "medium", "NEEDS REVIEW — Generally compliant but ISO certificate is pending verification. Turnover meets minimum threshold. Recommend requesting clarification on work experience."},
		{"44444444-0000-0000-0000-000000000003", 65.5, 70.0, 60.0, 55.0, 72.0, 62.0, "high", "CAUTION — Multiple documents pending verification. Turnover is borderline. Experience certificates cover only 3 out of 5 required years. EMD amount verified."},
		{"44444444-0000-0000-0000-000000000004", 96.0, 98.0, 95.0, 8.0, 100.0, 92.0, "low", "APPROVED — Excellent compliance. All 11 documents verified against government registries. OEM authorization confirmed. 8+ years relevant experience."},
		{"44444444-0000-0000-0000-000000000005", 85.0, 88.0, 82.0, 22.0, 90.0, 80.0, "low", "RECOMMEND APPROVAL — Good overall compliance. Minor issue with ESIC certificate expiry date (expires in 45 days). All other documents fully verified."},
		{"44444444-0000-0000-0000-000000000006", 42.0, 45.0, 38.0, 72.0, 55.0, 35.0, "critical", "REJECT — Critical non-compliance. GST returns show mismatch. PAN verification failed (entity name mismatch). Turnover below minimum threshold. Blacklist check flagged."},
		{"44444444-0000-0000-0000-000000000007", 94.0, 96.0, 93.0, 10.0, 98.0, 90.0, "low", "APPROVED — Winner. Best technical and financial score. All documents verified. Highest compliance rating. L1 bidder."},
		{"44444444-0000-0000-0000-000000000008", 71.0, 75.0, 68.0, 40.0, 78.0, 65.0, "medium", "REJECTED — Did not meet minimum technical score. Missing OEM authorization. Work experience insufficient for cloud migration at this scale."},
		{"44444444-0000-0000-0000-000000000009", 88.0, 90.0, 86.0, 18.0, 95.0, 82.0, "low", "RECOMMEND APPROVAL — Strong construction track record. All certifications valid. IGBC membership confirmed. Financial capacity adequate."},
		{"44444444-0000-0000-0000-000000000010", 76.0, 80.0, 74.0, 30.0, 82.0, 70.0, "medium", "NEEDS REVIEW — Good overall but missing latest balance sheet. Experience is primarily in road construction, not hospital construction. Request additional references."},
	}

	flags := `[{"type":"info","message":"All mandatory documents submitted"},{"type":"success","message":"Make in India compliance verified"}]`
	issues := `[{"severity":"low","message":"ISO certificate expires in 6 months — recommend renewal tracking"}]`
	steps := `["document_collection","ocr_extraction","registry_verification","eligibility_check","compliance_scoring","risk_assessment","ai_recommendation"]`

	for _, s := range scores {
		_, err := pool.Exec(ctx, `INSERT INTO compliance_results
			(bid_id, overall_score, eligibility_score, compliance_score, risk_score,
			 completeness_score, quality_score, risk_level, ai_recommendation,
			 flags, issues, pipeline_steps_completed, pipeline_duration_ms,
			 reasoning_trace, generated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
			s.BidID, s.Overall, s.Eligibility, s.Compliance, s.Risk,
			s.Complete, s.Qual, s.RiskLevel, s.Recommendation,
			flags, issues, steps, 4500+int(s.Overall*30),
			"Step 1: Document collection complete. Step 2: OCR extraction 96% confidence. Step 3: Registry verification passed. Step 4: Eligibility check passed. Step 5: Compliance scoring complete. Step 6: Risk assessment done. Step 7: AI recommendation generated.")
		if err != nil {
			fmt.Printf("  ⚠ Score %s: %v\n", s.BidID[:8], err)
		}
	}
	fmt.Println("  ✅ 10 compliance scores created")

	// --------------------------------------------------
	// 6. Seed Support Messages
	// --------------------------------------------------
	fmt.Println("[6/8] Seeding support conversations...")
	type Msg struct {
		TenderID, SenderID, ReceiverID, Message, MsgType string
		HoursAgo                                         int
		IsRead                                           bool
	}
	msgs := []Msg{
		// Conversation: Amit <-> Rajesh on Tender 1 (servers)
		{"33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001",
			"Hello, regarding the tender requirement for turnover, does it apply to individual consortium members?", "text", 72, true},
		{"33333333-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001",
			"As per clause 4.2 of the tender document, the lead member must meet 50% of the turnover requirement, and other members must meet 25% each.", "text", 70, true},
		{"33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001",
			"Thank you for the clarification. We will submit the consortium agreement accordingly.", "text", 68, true},
		{"33333333-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001",
			"We noticed the GST certificate uploaded is slightly blurry. Could you please re-upload a clearer scanned copy?", "text", 24, true},
		{"33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001",
			"Sure, I will upload a better scanned copy right away. Please check in 10 minutes.", "text", 23, true},
		{"33333333-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001",
			"Received and verified. Your GST registration is now marked as verified. Thank you.", "text", 22, true},
		{"33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001",
			"Can you confirm if the OEM authorization letter from Dell needs to be notarized?", "text", 2, false},

		// Conversation: Priya <-> Sunita on Tender 2 (medical AMC)
		{"33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002",
			"Is the EMD exemption applicable for MSME registered companies for this tender?", "text", 120, true},
		{"33333333-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002",
			"Yes, MSME registered bidders with valid Udyam certificate are exempt from EMD as per Government of India Public Procurement Policy.", "text", 118, true},
		{"33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002",
			"Thank you! I have uploaded my Udyam certificate. Could you verify it at your earliest?", "text", 96, true},
		{"33333333-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002",
			"Your Udyam certificate (UDYAM-MH-00-0098765) has been verified against the MSME registry. EMD exemption approved.", "text", 90, true},
		{"33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002",
			"Your bid has been technically evaluated and approved. Congratulations! Financial bid opening is scheduled for next week.", "text", 48, true},

		// Conversation: Rahul <-> Rajesh on Tender 1 (servers)
		{"33333333-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000003", "11111111-0000-0000-0000-000000000001",
			"We have submitted the revised BOQ as requested. Please find the attached updated pricing.", "text", 48, true},
		{"33333333-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000001", "22222222-0000-0000-0000-000000000003",
			"Received. The revised BOQ is under review. We will update you within 2 working days.", "text", 46, true},

		// Conversation: Amit <-> Sunita on Tender 2 (medical)
		{"33333333-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000001", "11111111-0000-0000-0000-000000000002",
			"Please find attached the OEM authorization letter from Siemens for CT scanner maintenance.", "text", 60, true},
		{"33333333-0000-0000-0000-000000000002", "11111111-0000-0000-0000-000000000002", "22222222-0000-0000-0000-000000000001",
			"OEM authorization verified. Your technical bid is now complete. Awaiting financial evaluation.", "text", 55, true},
	}

	for _, m := range msgs {
		createdAt := time.Now().Add(-time.Duration(m.HoursAgo) * time.Hour)
		_, err := pool.Exec(ctx, `INSERT INTO support_messages (tender_id, sender_id, receiver_id, message, message_type, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			m.TenderID, m.SenderID, m.ReceiverID, m.Message, m.MsgType, m.IsRead, createdAt)
		if err != nil {
			fmt.Printf("  ⚠ Msg: %v\n", err)
		}
	}
	fmt.Println("  ✅ 16 support messages seeded across 4 conversations")

	// --------------------------------------------------
	// 7. Seed Audit Trail
	// --------------------------------------------------
	fmt.Println("[7/8] Seeding audit trail...")
	type Audit struct {
		UserID, TenderID, Action, Entity, Desc string
		DaysAgo                                 int
	}
	audits := []Audit{
		{"11111111-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "tender_created", "tender", "Tender 'Procurement of High-End Servers' created as draft", 15},
		{"11111111-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "status_changed", "tender", "Status changed from draft → published", 14},
		{"11111111-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "status_changed", "tender", "Status changed from published → open", 13},
		{"22222222-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "bid_submitted", "bid", "Bid submitted by TechFlow Systems — ₹4,85,00,000", 5},
		{"22222222-0000-0000-0000-000000000005", "33333333-0000-0000-0000-000000000001", "bid_submitted", "bid", "Bid submitted by CloudNet India — ₹4,92,00,000", 3},
		{"22222222-0000-0000-0000-000000000003", "33333333-0000-0000-0000-000000000001", "bid_submitted", "bid", "Bid submitted by Apex Constructions — ₹5,10,00,000", 2},
		{"11111111-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000001", "ai_analysis_completed", "bid", "AI compliance analysis completed for 3 bids", 1},
		{"11111111-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "tender_created", "tender", "Tender 'AMC for Medical Equipment' created", 30},
		{"11111111-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "status_changed", "tender", "Status changed from draft → published → open", 28},
		{"22222222-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "bid_submitted", "bid", "Bid submitted by MediEquip Solutions — ₹1,42,00,000", 20},
		{"11111111-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "bid_approved", "bid", "Bid by MediEquip Solutions approved — highest compliance score 96%", 10},
		{"11111111-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "bid_rejected", "bid", "Bid by GreenBuild Infrastructure rejected — critical non-compliance", 10},
		{"11111111-0000-0000-0000-000000000002", "33333333-0000-0000-0000-000000000002", "status_changed", "tender", "Status changed to under_evaluation", 8},
		{"11111111-0000-0000-0000-000000000001", "33333333-0000-0000-0000-000000000004", "tender_awarded", "tender", "Tender awarded to TechFlow Systems — L1 bidder", 15},
	}

	for _, a := range audits {
		createdAt := time.Now().AddDate(0, 0, -a.DaysAgo)
		pool.Exec(ctx, `INSERT INTO audit_trail (user_id, tender_id, action, entity_type, description, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
			a.UserID, a.TenderID, a.Action, a.Entity, a.Desc, createdAt)
	}
	fmt.Println("  ✅ 14 audit trail entries created")

	// --------------------------------------------------
	// 8. Summary
	// --------------------------------------------------
	fmt.Println("\n[8/8] Verifying seed data...")
	var userCount, tenderCount, bidCount, docCount2, scoreCount, msgCount, auditCount int
	pool.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&userCount)
	pool.QueryRow(ctx, `SELECT count(*) FROM tenders`).Scan(&tenderCount)
	pool.QueryRow(ctx, `SELECT count(*) FROM bids`).Scan(&bidCount)
	pool.QueryRow(ctx, `SELECT count(*) FROM documents`).Scan(&docCount2)
	pool.QueryRow(ctx, `SELECT count(*) FROM compliance_results`).Scan(&scoreCount)
	pool.QueryRow(ctx, `SELECT count(*) FROM support_messages`).Scan(&msgCount)
	pool.QueryRow(ctx, `SELECT count(*) FROM audit_trail`).Scan(&auditCount)

	fmt.Println("\n╔═══════════════════════════════════════════════╗")
	fmt.Println("║  🌱 GemVerify Demo Data — Seed Complete!      ║")
	fmt.Println("╠═══════════════════════════════════════════════╣")
	fmt.Printf("║  👤 Users:              %3d                   ║\n", userCount)
	fmt.Printf("║  📋 Tenders:            %3d                   ║\n", tenderCount)
	fmt.Printf("║  📝 Bids:               %3d                   ║\n", bidCount)
	fmt.Printf("║  📄 Documents:          %3d                   ║\n", docCount2)
	fmt.Printf("║  📊 Compliance Scores:  %3d                   ║\n", scoreCount)
	fmt.Printf("║  💬 Support Messages:   %3d                   ║\n", msgCount)
	fmt.Printf("║  📜 Audit Trail:        %3d                   ║\n", auditCount)
	fmt.Println("╠═══════════════════════════════════════════════╣")
	fmt.Println("║                                               ║")
	fmt.Println("║  Login credentials (all accounts):            ║")
	fmt.Println("║  Password: Demo@1234                          ║")
	fmt.Println("║                                               ║")
	fmt.Println("║  Officers:                                    ║")
	fmt.Println("║    rajesh.kumar@gem.gov.in                    ║")
	fmt.Println("║    sunita.sharma@gem.gov.in                   ║")
	fmt.Println("║                                               ║")
	fmt.Println("║  Bidders:                                     ║")
	fmt.Println("║    amit@techflow.in                           ║")
	fmt.Println("║    priya@mediequip.in                         ║")
	fmt.Println("║    rahul@apexcon.in                           ║")
	fmt.Println("║    anita@greenbuild.in                        ║")
	fmt.Println("║    vikram@cloudnet.in                         ║")
	fmt.Println("╚═══════════════════════════════════════════════╝")
}
