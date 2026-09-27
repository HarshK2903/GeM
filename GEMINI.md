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

## Current Work Status (Updated Sept 27, 2026 10:00PM)

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

### Officer TenderManagement.tsx (11-step wizard) - OLD INLINE FORM (still exists but button redirects to wizard)
### Bidder TenderBrowse.tsx - ALL COMPLETE ✅

### Bug Fixes Applied ✅
- TenderManagement.tsx: Fixed tenders.map crash (API returns {items:[...]})
- OfficerDashboard.tsx: Fixed operator precedence bug in pending_review
- Auth pages (all 4): Replaced <a href> with React Router <Link to>
- toast.tsx (both apps): Type-only import fix
- useWebSocket.ts (both apps): Stored onMessage in useRef
- main.tsx (both apps): Custom ErrorBoundary
- ComplianceDeepDive.tsx: Fixed type-only import

### Backend Architecture (runs via scripts/dev.sh)
- Go Gateway (port 8000): Fiber v2, PostgreSQL, Redis, MinIO, gRPC
- AI Service (port 50051): Python gRPC, pytesseract OCR, Groq/Llama 3.3
- Mock Gov API (port 8001): FastAPI simulating 9 Indian registries
