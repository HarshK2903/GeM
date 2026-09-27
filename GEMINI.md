# GemVerify Project Context (Auto-generated)

## Quick Summary
GemVerify is an AI-Powered Government Bid Compliance Platform. Monorepo with:
- `apps/web-officer` - Officer portal (React/TS/Vite/shadcn) for creating tenders & reviewing bids
- `apps/web-bidder` - Bidder portal for browsing tenders & submitting bids
- `packages/shared-types` - Shared TypeScript type definitions
- `docker/` - Python FastAPI backend (empty dir - services run locally via scripts/dev.sh)

## Design System
- Dark navy theme (Clerk-inspired), oklch color spaces, shadcn/ui, Tailwind CSS v4
- Icons: lucide-react, Font: Geist Variable
- Native HTML selects/textareas styled with inputClass/textareaClass/checkboxClass patterns
- Standard classes: `inputClass`, `textareaClass`, `checkboxClass` (defined at top of components)

## Reference UI
Modeled after Karnataka e-Procurement portal. Tenders have 10+ sections:
General Details (20+ fields), Eligibility Conditions (23+), Technical Criteria table, Required Documents table, Tender Group Items table, Delivery Schedule table, Contact Info, Amount Details, Tender Schedule (10+ dates), Published User Details.
Reference screenshots at: /home/bugulnoz/Pictures/Screenshots/Screenshot from 2026-09-27 18-*

## Current Work Status (Updated Sept 28, 2026 2:50AM)

### NEW: Multi-Page Tender Creation Wizard ✅ COMPLETE
Route: `/officer/tenders/new/*` — 12 separate pages with sidebar stepper + floating AI chatbot
Files at: `apps/web-officer/src/pages/officer/tender-create/`
- TenderFormContext.tsx — React Context with all form state (311 lines)
- TenderCreateLayout.tsx — Wizard shell with sidebar stepper + save/publish (200 lines)
- TenderChatbot.tsx — Floating AI assistant with context-aware help (375 lines)
- components/FieldWithHelp.tsx — Input wrapper with descriptions/tooltips (61 lines)
- steps/Step01General.tsx — General Details (25+ fields, 216 lines)
- steps/Step02Eligibility.tsx — Eligibility Conditions (editable list, 71 lines)
- steps/Step03Technical.tsx — Technical Criteria (cards, 101 lines)
- steps/Step04Documents.tsx — Required Documents (table, 110 lines)
- steps/Step05Items.tsx — Tender Items/Groups (nested cards, 135 lines)
- steps/Step06Delivery.tsx — Delivery Schedule (table form, 86 lines)
- steps/Step07Contact.tsx — Contact Information (2-col grid, 49 lines)
- steps/Step08Amounts.tsx — Budget & Amounts (2 sections, 72 lines)
- steps/Step09Schedule.tsx — Tender Schedule (10 date fields, 149 lines)
- steps/Step10Compliance.tsx — Policy Compliance (checkboxes, 86 lines)
- steps/Step11Additional.tsx — Additional Info + uploads (91 lines)
- steps/Step12Review.tsx — Read-only review + validation (130 lines)

### NEW: Officer Tender Detail View ✅ COMPLETE
Route: `/officer/tenders/:tenderId`
File: `apps/web-officer/src/pages/officer/TenderDetailView.tsx` (759 lines)
- Comprehensive read-only view of published tender with 10+ sections
- Sticky header with Publish/Edit/View Bids actions
- **Lifecycle Management Panel**: Status timeline, action buttons per status
  - DRAFT→PUBLISHED→OPEN→UNDER_EVALUATION→AWARDED→CLOSED
  - Actions: Publish, Open, Suspend, Resume, Extend Deadline, Close, Cancel, Award, Clone
- **Action Confirmation Dialogs**: With mandatory reason for destructive actions
- **Extend Deadline Dialog**: datetime-local input
- **Statistics Summary Card**: Total bids, by status, days remaining, value
- **Activity/Audit Log Timeline**: Status change history
- **Enhanced Bids Table**: With compliance scores, risk levels, review/approve/reject actions
- Bids received table at bottom fetched from /tenders/:id/bids

### NEW: Bidder Tender Detail View ✅ COMPLETE
Route: `/bidder/tenders/:tenderId`
File: `apps/web-bidder/src/pages/bidder/TenderDetail.tsx` (633 lines)
- Left sidebar with scroll-anchor section navigation
- 12 comprehensive sections with all tender data
- Sticky bottom bar with Quick Upload + Start Full Submission buttons
- Deadline countdown timer

### NEW: Bidder Multi-Step Bid Submission Wizard ✅ COMPLETE
Route: `/bidder/tenders/:tenderId/submit`
File: `apps/web-bidder/src/pages/bidder/BidSubmission.tsx` (1441 lines)
- 11-step sequential wizard with sidebar stepper
- Step 1: Company Profile (org type, address, contact)
- Step 2: Udyam/MSME Registration (number validation, certificate upload)
- Step 3: GST Registration (GSTIN format validation, returns upload)
- Step 4: PAN & Income Tax (PAN format validation, ITR for 3 years)
- Step 5: Company Registration (MCA21/CIN, incorporation cert)
- Step 6: Financial Documents (balance sheets, turnover, net worth, bank details)
- Step 7: Experience & Certifications (ISO, work orders, OEM authorization)
- Step 8: Statutory Compliance (EPFO, ESIC, labour license)
- Step 9: Policy Declarations (Make in India, MSME, Startup, blacklisting declaration)
- Step 10: Financial Bid (itemwise/lumpsum pricing, EMD proof)
- Step 11: Review & Submit (validation summary, final declaration)
- Regex validation for GSTIN, PAN, Udyam numbers
- File uploads at each step with drag-drop zones
- FormData submission to /bids API

### NEW: Bidder TenderBrowse Refactored ✅ COMPLETE
File: `apps/web-bidder/src/pages/bidder/TenderBrowse.tsx` (360 lines, rewritten)
- Rich 2-column card grid replacing old table
- Filter chips (All/Open/Closed/Expired) + sort options
- Each card shows full tender info with badges, stats, deadline countdown
- Links to dedicated /bidder/tenders/:id detail page

### Bug Fixes Applied ✅
- TenderManagement.tsx: Fixed tenders.map crash (API returns {items:[...]})
- TenderManagement.tsx: Fixed View Details button (was missing onClick handler)
- OfficerDashboard.tsx: Fixed operator precedence bug in pending_review
- Auth pages (all 4): Replaced <a href> with React Router <Link to>
- toast.tsx (both apps): Type-only import fix
- useWebSocket.ts (both apps): Stored onMessage in useRef
- main.tsx (both apps): Custom ErrorBoundary
- ComplianceDeepDive.tsx: Fixed type-only import
- TenderDetail.tsx (bidder): Fixed @gemverify/shared-types import

### Backend Architecture (runs via scripts/dev.sh)
- Go Gateway (port 8000): Fiber v2, PostgreSQL, Redis, MinIO, gRPC
- AI Service (port 50051): Python gRPC, pytesseract OCR, Groq/Llama 3.3
- Mock Gov API (port 8001): FastAPI simulating 9 Indian registries
