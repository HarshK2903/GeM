import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Tender Form Context — Shared state across all wizard steps
// ─────────────────────────────────────────────────────────────────────────────

export interface TenderFormData {
  // Step 1: General Details
  title: string
  tender_type: string
  tender_denomination: string
  department_name: string
  location: string
  description: string
  commercial_bid_type: string
  evaluation_method: string
  price_list_type: string
  estimated_value: string
  emd_amount: string
  ecv_status: string
  currency: string
  itemwise_technical: boolean
  highest_bidder: boolean
  multiple_currencies: boolean
  reference_number: string
  remarks: string
  procurement_entity: string
  category: string
  // Extended general fields
  nit_date: string
  tender_classification: string
  work_category: string
  sub_category: string
  boq_type: string
  allow_withdrawal: boolean
  pre_qualification_required: boolean
  two_cover_system: boolean
  itemwise_emd: boolean
  number_of_covers: string
  form_of_contract: string
  bid_opening_place: string

  // Step 2: Eligibility Conditions
  conditions: string[]

  // Step 3: Technical Criteria
  technical_criteria: Array<{
    id: string
    type: string
    description: string
    documents: string
  }>

  // Step 4: Required Documents
  required_documents: Array<{
    id: string
    type: string
    description: string
    is_mandatory: boolean
  }>

  // Step 5: Tender Items / Groups
  tender_items: Array<{
    group_name: string
    is_mandatory: boolean
    all_items_mandatory: boolean
    items: Array<{
      item_code: string
      item_name: string
      unit_of_measurement: string
      quantity: string
      estimated_unit_price: string
      make_brand: string
      specifications: string
    }>
  }>

  // Step 6: Delivery Schedule
  delivery_schedule: Array<{
    item_code: string
    object_name: string
    scheduled_quantity: string
    delivery_location: string
    expected_delivery_date: string
    inspection_required: boolean
    penalty_clause: string
  }>

  // Step 7: Contact Information
  contact_name: string
  contact_designation: string
  contact_phone: string
  contact_mobile: string
  contact_email: string
  contact_address: string
  contact_fax: string
  alternate_contact_name: string
  alternate_contact_phone: string

  // Step 8: Amount & Budget Details
  tender_fee: string
  advance_deposit: string
  security_deposit_pct: string
  performance_security_pct: string
  processing_fee: string
  budget_head: string
  sanction_number: string
  sanction_date: string
  budget_allocation: string
  previous_year_expenditure: string
  current_year_budget: string
  fund_source: string

  // Step 9: Tender Schedule
  bid_validity: string
  queries_deadline: string
  submission_deadline: string
  tech_bid_open: string
  fin_bid_open: string
  pre_bid_meeting: string
  pre_bid_meeting_place: string
  document_sale_start: string
  document_sale_end: string
  corrigendum_date: string

  // Step 10: Policy Compliance
  make_in_india: boolean
  msme_required: boolean
  startup_preference: boolean
  min_turnover: string
  local_content_pct: string
  gem_required: boolean
  women_owned_preference: boolean
  sc_st_preference: boolean
  local_supplier_preference: boolean
  integrity_pact_required: boolean
  epbg_required: boolean

  // Step 11: Additional Info
  special_instructions: string
  terms_conditions: string
  uploaded_files: File[]

  // Step 12 meta
  published_user_name: string
  published_user_post: string
}

const DEFAULT_CONDITIONS = [
  "EMD details have to be attached",
  "Bidders must keep tender open for 90 days from the date of acceptance of rates",
  "It shall be the responsibility of the Bidder to ensure credit of Tender Processing Fee and EMD into the respective receiving bank accounts on or before the last date and time of bid submission",
  "EMD Payments through e-Payment mode shall be made as one single transaction and payments made in part are liable for rejection",
  "The quantity shown against each item is approximate and may vary as per requirement",
  "Bidders from a country which shares a land border with India must be registered with the competent authority for eligible supply of goods",
  "Successful tenderer should deposit a sum equal to 5% of the total value as Security Deposit in addition to EMD",
  "Registered Branded Manufacturers/Authorized dealers can also quote with authorization",
  "The successful tenderer shall execute an agreement on a stamp paper within 21 days from the date of LOA",
  "Successful tenderer should complete the work within stipulated period as mentioned in the supply order",
  "The authority reserves all rights to accept, reject or postpone any or all of the Tenders without assigning any reason thereof",
  "The agencies may withdraw any or all items invited under the subject notification at any time before issuing the supply order",
  "Non-compliance by the tenderer to any of the conditions will entail forfeiture of EMD and rejection of tender",
  "The quantities of the items to be supplied may vary as per the budget allocation",
  "In case of any dispute, the decision of the competent authority is final",
  "The net rate quoted per unit shall be for F.O.R. Destination, which should include all taxes, GST, insurance, freight and installation charges",
  "The agency should quote the price in Indian currency only",
  "Bidders must upload OEMs ISO/CE certificate",
  "The supplier must have service centre in the state. Details shall be attached",
  "All bidders shall get updated with corrigendum/addendum received from time to time during the entire tender process",
  "The agency please note the place of delivery as mentioned in tender and supply order"
]

const DEFAULT_DOCUMENTS = [
  { id: '1', type: 'Qualification Document', description: 'Declaration for not being disqualified/blacklisted/suspended from empanelment', is_mandatory: true },
  { id: '2', type: 'Qualification Document', description: 'Company should have ISO-9001:2015, IS 45001:2018, ISO 14001:2015', is_mandatory: true },
  { id: '3', type: 'Qualification Document', description: 'Firm registration certificate issued by Govt. of India/Concerned State', is_mandatory: true },
  { id: '4', type: 'Qualification Document', description: 'GST Registration Certificate', is_mandatory: true },
  { id: '5', type: 'Financial Bid', description: 'GST-RI returned file for 6 months of recent year', is_mandatory: true },
  { id: '6', type: 'Financial Bid', description: 'Income Tax returns for last three financial years', is_mandatory: true },
  { id: '7', type: 'Technical Bid', description: 'Manufactures authorization Form or Authorized Dealer Certificate', is_mandatory: true },
  { id: '8', type: 'Qualification Document', description: 'PAN card', is_mandatory: true },
  { id: '9', type: 'Experience Certificate', description: 'Performance and satisfactory reports from govt. institutions / PSU / universities', is_mandatory: true },
  { id: '10', type: 'Financial Bid', description: 'Minimum financial turnover certificate (CA audited) for last 3 years', is_mandatory: true },
]

export const INITIAL_FORM_DATA: TenderFormData = {
  title: '', tender_type: 'Open', tender_denomination: 'Goods', department_name: '', location: '',
  description: '', commercial_bid_type: 'Itemwise', evaluation_method: 'Two Tender Document System (Two Cover)',
  price_list_type: 'Open', estimated_value: '', emd_amount: '', ecv_status: 'Non-ECV', currency: 'Rupees',
  itemwise_technical: false, highest_bidder: false, multiple_currencies: false, reference_number: '',
  remarks: '', procurement_entity: 'Government Department', category: '',
  nit_date: '', tender_classification: 'Works', work_category: '', sub_category: '',
  boq_type: 'Item Rate', allow_withdrawal: false, pre_qualification_required: false,
  two_cover_system: true, itemwise_emd: false, number_of_covers: '2',
  form_of_contract: 'Lump Sum', bid_opening_place: '',

  conditions: [...DEFAULT_CONDITIONS],
  technical_criteria: [],
  required_documents: [...DEFAULT_DOCUMENTS],
  tender_items: [],
  delivery_schedule: [],

  contact_name: '', contact_designation: '', contact_phone: '', contact_mobile: '',
  contact_email: '', contact_address: '', contact_fax: '', alternate_contact_name: '', alternate_contact_phone: '',

  tender_fee: '', advance_deposit: '', security_deposit_pct: '5', performance_security_pct: '10',
  processing_fee: '', budget_head: '', sanction_number: '', sanction_date: '',
  budget_allocation: '', previous_year_expenditure: '', current_year_budget: '', fund_source: '',

  bid_validity: '90 days', queries_deadline: '', submission_deadline: '',
  tech_bid_open: '', fin_bid_open: '', pre_bid_meeting: '', pre_bid_meeting_place: '',
  document_sale_start: '', document_sale_end: '', corrigendum_date: '',

  make_in_india: false, msme_required: false, startup_preference: false,
  min_turnover: '', local_content_pct: '', gem_required: false,
  women_owned_preference: false, sc_st_preference: false,
  local_supplier_preference: false, integrity_pact_required: false, epbg_required: false,

  special_instructions: '', terms_conditions: '',
  uploaded_files: [],

  published_user_name: '', published_user_post: '',
}

export const STEPS = [
  { key: 'general', label: 'General Details', path: 'general', description: 'Basic identification and classification' },
  { key: 'eligibility', label: 'Eligibility Conditions', path: 'eligibility', description: 'Standard bidder requirements' },
  { key: 'technical', label: 'Technical Criteria', path: 'technical', description: 'Qualification requirements' },
  { key: 'documents', label: 'Required Documents', path: 'documents', description: 'Bidder document uploads' },
  { key: 'items', label: 'Tender Items', path: 'items', description: 'Item groups and specifications' },
  { key: 'delivery', label: 'Delivery Schedule', path: 'delivery', description: 'Delivery timelines and locations' },
  { key: 'contact', label: 'Contact Info', path: 'contact', description: 'Officer contact details' },
  { key: 'amounts', label: 'Budget & Amounts', path: 'amounts', description: 'Fees, deposits and budget' },
  { key: 'schedule', label: 'Tender Schedule', path: 'schedule', description: 'Important dates and deadlines' },
  { key: 'compliance', label: 'Policy Compliance', path: 'compliance', description: 'Government policy preferences' },
  { key: 'additional', label: 'Additional Info', path: 'additional', description: 'Instructions and attachments' },
  { key: 'review', label: 'Review & Publish', path: 'review', description: 'Final review before publishing' },
]

interface TenderFormContextType {
  formData: TenderFormData
  updateField: (field: keyof TenderFormData, value: any) => void
  updateMultipleFields: (fields: Partial<TenderFormData>) => void
  currentStepIndex: number
  setCurrentStepIndex: (idx: number) => void
  isSaving: boolean
  setIsSaving: (v: boolean) => void
  chatOpen: boolean
  setChatOpen: (v: boolean) => void
  getFormSummary: () => string
}

const TenderFormContext = createContext<TenderFormContextType | null>(null)

export function useTenderForm() {
  const ctx = useContext(TenderFormContext)
  if (!ctx) throw new Error('useTenderForm must be used within TenderFormProvider')
  return ctx
}

export function TenderFormProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<TenderFormData>(INITIAL_FORM_DATA)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const updateField = useCallback((field: keyof TenderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateMultipleFields = useCallback((fields: Partial<TenderFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }))
  }, [])

  // Generate a text summary of all filled fields for the AI chatbot context
  const getFormSummary = useCallback(() => {
    const parts: string[] = []
    if (formData.title) parts.push(`Title: ${formData.title}`)
    if (formData.department_name) parts.push(`Department: ${formData.department_name}`)
    if (formData.tender_type) parts.push(`Type: ${formData.tender_type}`)
    if (formData.tender_denomination) parts.push(`Denomination: ${formData.tender_denomination}`)
    if (formData.category) parts.push(`Category: ${formData.category}`)
    if (formData.estimated_value) parts.push(`Estimated Value: ₹${formData.estimated_value}`)
    if (formData.emd_amount) parts.push(`EMD Amount: ₹${formData.emd_amount}`)
    if (formData.description) parts.push(`Description: ${formData.description.substring(0, 200)}`)
    if (formData.procurement_entity) parts.push(`Entity Type: ${formData.procurement_entity}`)
    if (formData.location) parts.push(`Location: ${formData.location}`)
    if (formData.conditions.length > 0) parts.push(`Eligibility Conditions: ${formData.conditions.length} defined`)
    if (formData.technical_criteria.length > 0) parts.push(`Technical Criteria: ${formData.technical_criteria.length} defined`)
    if (formData.required_documents.length > 0) parts.push(`Required Documents: ${formData.required_documents.length} specified`)
    if (formData.tender_items.length > 0) parts.push(`Tender Groups: ${formData.tender_items.length}, Total Items: ${formData.tender_items.reduce((sum, g) => sum + g.items.length, 0)}`)
    if (formData.submission_deadline) parts.push(`Submission Deadline: ${formData.submission_deadline}`)
    if (formData.make_in_india) parts.push('Make in India: Required')
    if (formData.msme_required) parts.push('MSME Preference: Yes')
    const currentStep = STEPS[currentStepIndex]
    parts.push(`\nCurrently on step: ${currentStep?.label || 'Unknown'}`)
    return parts.join('\n')
  }, [formData, currentStepIndex])

  return (
    <TenderFormContext.Provider value={{
      formData, updateField, updateMultipleFields,
      currentStepIndex, setCurrentStepIndex,
      isSaving, setIsSaving,
      chatOpen, setChatOpen,
      getFormSummary,
    }}>
      {children}
    </TenderFormContext.Provider>
  )
}
