// ============================================
// GemVerify Shared Type Definitions
// Used by both web-bidder and web-officer
// ============================================

// --- Auth ---
export interface User {
  id: string
  email: string
  full_name: string
  role: 'bidder' | 'officer' | 'admin'
  organization?: string | null
  phone?: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'organization'>
}

// --- Tenders ---
export type TenderType = 'open' | 'limited' | 'single' | 'two_part'
export type TenderStatus = 'draft' | 'published' | 'evaluation' | 'awarded' | 'cancelled'

export interface TechnicalCriterion {
  criterion_type: string
  criterion_description: string
  criterion_documents: string
}

export interface RequiredDocument {
  document_type: string  // 'Technical Bid' | 'Financial Bid' | 'Qualification Document'
  document_name: string
  is_mandatory: boolean
}

export interface TenderItem {
  item_code: string
  item_name: string
  unit_of_measurement: string
  quantity: number
  estimated_unit_price?: number | null
}

export interface TenderGroup {
  group_name: string
  is_mandatory: boolean
  all_items_mandatory: boolean
  items: TenderItem[]
}

export interface DeliveryScheduleItem {
  item_code: string
  object_name: string
  scheduled_quantity: number
  delivery_location?: string | null
  expected_delivery_date?: string | null
}

export interface Tender {
  id: string
  created_by: string
  created_by_user?: User
  title: string
  reference_number: string
  description: string
  tender_type: TenderType
  status: TenderStatus
  department: string
  category?: string | null
  estimated_value?: number | null
  emd_amount?: number | null
  eligibility_requirements: Record<string, any>
  ai_parsed_requirements: Record<string, any>
  required_documents: string[]
  make_in_india_required: boolean
  msme_required: boolean
  startup_required: boolean
  min_turnover?: number | null
  local_content_percentage?: number | null
  submission_deadline: string
  opening_date?: string | null
  created_at: string
  updated_at: string
  bid_count?: number
  
  // New fields for comprehensive tender information:
  tender_denomination?: string | null  // 'Goods' | 'Services' | 'Works' | 'Consultancy'
  location_name?: string | null
  tender_scope?: string | null
  commercial_bid_type?: string | null  // 'Itemwise' | 'Percentage' | 'Lumpsum'
  evaluation_method?: string | null
  price_list_type?: string | null  // 'Open' | 'Closed'
  ecv_type?: string | null  // 'ECV' | 'Non-ECV'
  currency_type?: string | null
  itemwise_technical_evaluation?: boolean
  highest_bidder_selection?: boolean
  multiple_currencies_allowed?: boolean
  file_number?: string | null
  sample_remarks?: string | null
  procurement_entity_type?: string | null

  // Eligibility conditions (array of condition strings)
  eligibility_conditions?: string[]

  // Technical qualification criteria
  technical_criteria?: TechnicalCriterion[]

  // Documents required from bidder
  required_documents_detailed?: RequiredDocument[]

  // Tender items/groups
  tender_groups?: TenderGroup[]

  // Delivery schedule
  delivery_schedule?: DeliveryScheduleItem[]

  // Contact information
  contact_person_name?: string | null
  contact_designation?: string | null
  contact_phone?: string | null
  contact_mobile?: string | null
  contact_email?: string | null
  contact_address?: string | null

  // Tender amount details
  tender_fee?: number | null
  advance_deposit_amount?: number | null
  security_deposit_percentage?: number | null
  performance_security_percentage?: number | null

  // Tender schedule / important dates
  bid_validity_period?: string | null
  last_date_queries?: string | null
  last_date_receipt?: string | null
  technical_bid_open_date?: string | null
  financial_bid_open_date?: string | null
  pre_bid_meeting_date?: string | null
  technical_bid_approver?: string | null
  technical_bid_approved_date?: string | null
  financial_bid_opened_by?: string | null
  financial_bid_opened_date?: string | null
  financial_bid_approver?: string | null
  financial_bid_approved_date?: string | null
  tender_awarded_date?: string | null

  // Published user details
  published_user_name?: string | null
  published_user_post?: string | null

  // Policy compliance
  gem_registration_required?: boolean

  // Additional
  special_instructions?: string | null
  terms_and_conditions?: string | null
}

export interface CreateTenderRequest {
  title: string
  description: string
  tender_type: TenderType
  department: string
  category?: string
  estimated_value?: number
  emd_amount?: number
  required_documents: string[]
  make_in_india_required?: boolean
  msme_required?: boolean
  startup_required?: boolean
  min_turnover?: number
  local_content_percentage?: number
  submission_deadline: string
  
  // New fields for comprehensive tender information:
  tender_denomination?: string | null
  location_name?: string | null
  tender_scope?: string | null
  commercial_bid_type?: string | null
  evaluation_method?: string | null
  price_list_type?: string | null
  ecv_type?: string | null
  currency_type?: string | null
  itemwise_technical_evaluation?: boolean
  highest_bidder_selection?: boolean
  multiple_currencies_allowed?: boolean
  file_number?: string | null
  sample_remarks?: string | null
  procurement_entity_type?: string | null

  eligibility_conditions?: string[]
  technical_criteria?: TechnicalCriterion[]
  required_documents_detailed?: RequiredDocument[]
  tender_groups?: TenderGroup[]
  delivery_schedule?: DeliveryScheduleItem[]

  contact_person_name?: string | null
  contact_designation?: string | null
  contact_phone?: string | null
  contact_mobile?: string | null
  contact_email?: string | null
  contact_address?: string | null

  tender_fee?: number | null
  advance_deposit_amount?: number | null
  security_deposit_percentage?: number | null
  performance_security_percentage?: number | null

  bid_validity_period?: string | null
  last_date_queries?: string | null
  last_date_receipt?: string | null
  technical_bid_open_date?: string | null
  financial_bid_open_date?: string | null
  pre_bid_meeting_date?: string | null
  technical_bid_approver?: string | null
  technical_bid_approved_date?: string | null
  financial_bid_opened_by?: string | null
  financial_bid_opened_date?: string | null
  financial_bid_approver?: string | null
  financial_bid_approved_date?: string | null
  tender_awarded_date?: string | null

  published_user_name?: string | null
  published_user_post?: string | null

  gem_registration_required?: boolean

  special_instructions?: string | null
  terms_and_conditions?: string | null
}

// --- Bids ---
export type BidStatus =
  | 'submitted'
  | 'ai_processing'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'clarification'
  | 'withdrawn'

export interface Bid {
  id: string
  tender_id: string
  bidder_id: string
  tender?: Tender
  bidder?: User
  status: BidStatus
  bid_amount?: number | null
  technical_proposal: Record<string, any>
  financial_proposal: Record<string, any>
  bidder_info: Record<string, any>
  clarification_reason?: string | null
  clarification_response?: string | null
  officer_decision_by?: string | null
  officer_override_reason?: string | null
  decision_at?: string | null
  emd_paid: boolean
  emd_transaction_id?: string | null
  withdrawn_at?: string | null
  withdrawal_reason?: string | null
  submitted_at: string
  updated_at: string
  documents?: BidDocument[]
  compliance_result?: ComplianceResult | null
}

// --- Documents ---
export type DocumentType =
  | 'udyam' | 'gst' | 'pan' | 'income_tax' | 'oem_authorization'
  | 'epfo' | 'esic' | 'startup_certificate' | 'nsic' | 'bis'
  | 'make_in_india' | 'digilocker' | 'company_registration'
  | 'financial_statement' | 'technical_proposal' | 'other'

export type VerificationStatus =
  | 'pending' | 'processing' | 'verified' | 'failed'
  | 'mismatch' | 'not_found' | 'expired'

export interface BidDocument {
  id: string
  bid_id: string
  doc_type: DocumentType
  file_path: string
  original_filename: string
  file_size?: number | null
  mime_type?: string | null
  ocr_raw_text?: string | null
  ocr_extracted_data: Record<string, any>
  ocr_confidence?: number | null
  verification_status: VerificationStatus
  verification_result: Record<string, any>
  verification_errors: string[]
  verified_at?: string | null
  uploaded_at: string
}

// --- Compliance ---
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface ComplianceScore {
  overall: number
  eligibility: number
  compliance: number
  risk: number
  completeness: number
  quality: number
}

export interface ComplianceFlag {
  type: 'critical' | 'warning' | 'info'
  message: string
  field?: string
  recommendation?: string
}

export interface ComplianceIssue {
  severity: 'high' | 'medium' | 'low'
  description: string
  recommendation: string
  related_doc?: string
}

export interface RequirementMatch {
  requirement_id: string
  requirement_text: string
  status: 'met' | 'unmet' | 'partial'
  evidence_summary: string
  source_document?: string
  confidence: number
}

export interface ComplianceResult {
  id: string
  bid_id: string
  overall_score: number
  eligibility_score: number
  compliance_score: number
  risk_score: number
  completeness_score: number
  quality_score: number
  risk_level: RiskLevel
  requirement_matches: Record<string, RequirementMatch>
  flags: ComplianceFlag[]
  issues: ComplianceIssue[]
  evidence: Record<string, any>
  ai_recommendation?: string | null
  reasoning_trace?: string | null
  reasoning_trace_structured: ReasoningTraceStructured
  pipeline_duration_ms?: number | null
  pipeline_steps_completed: PipelineStep[]
  raw_scoring_data: Record<string, any>
  generated_at: string
  updated_at: string
}

export interface ReasoningTraceStructured {
  steps: ReasoningStep[]
}

export interface ReasoningStep {
  step_name: string
  input_summary: string
  output_summary: string
  confidence: number
  duration_ms: number
}

export interface PipelineStep {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  duration_ms?: number
}

// --- Audit ---
export interface AuditEntry {
  id: string
  user_id?: string | null
  tender_id?: string | null
  bid_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  description?: string | null
  before_state?: Record<string, any> | null
  after_state?: Record<string, any> | null
  metadata_extra: Record<string, any>
  ip_address?: string | null
  created_at: string
}

// --- WebSocket ---
export type WSMessageType =
  | 'tender.created'
  | 'tender.updated'
  | 'bid.submitted'
  | 'bid.status_changed'
  | 'pipeline.progress'
  | 'pipeline.completed'
  | 'compliance.scored'
  | 'notification'
  | 'echo'

export interface WSMessage {
  type: WSMessageType
  data?: any
  timestamp?: string
}

export interface PipelineProgressEvent {
  bid_id: string
  step_name: string
  status: 'started' | 'processing' | 'completed' | 'failed'
  progress_percent: number
  message: string
  detail?: string
}

// --- API Responses ---
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  error: string
  detail?: string
}
