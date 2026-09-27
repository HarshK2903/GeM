import React from 'react'
import { useTenderForm, STEPS } from '../TenderFormContext'
import { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const ReviewField = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
  <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="text-sm font-medium">{value === true ? 'Yes' : value === false ? 'No' : value || '---'}</span>
  </div>
)

export default function Step12Review() {
  const { formData } = useTenderForm()

  const missingFields = []
  if (!formData.title) missingFields.push('Tender Title')
  if (!formData.department_name) missingFields.push('Department Name')
  if (!formData.submission_deadline) missingFields.push('Submission Deadline')
  if (!formData.contact_email) missingFields.push('Contact Email')

  return (
    <StepPage>
      <SectionHeader 
        title="Review & Publish" 
        subtitle="Review all tender details before final publication"
      />

      {missingFields.length > 0 && (
        <div className="mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-amber-800 font-medium text-sm mb-1">Missing Required Fields</h4>
            <ul className="list-disc list-inside text-sm text-amber-700">
              {missingFields.map(field => <li key={field}>{field} is required</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* General Details */}
        <div className="bg-card border rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">{STEPS.find(s => s.key === 'general')?.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-0">
              <ReviewField label="Tender Title" value={formData.title} />
              <ReviewField label="Tender Type" value={formData.tender_type} />
              <ReviewField label="Department Name" value={formData.department_name} />
              <ReviewField label="Category" value={formData.category} />
            </div>
            <div className="space-y-0">
              <ReviewField label="Estimated Value" value={formData.estimated_value ? `₹${formData.estimated_value}` : ''} />
              <ReviewField label="EMD Amount" value={formData.emd_amount ? `₹${formData.emd_amount}` : ''} />
              <ReviewField label="Procurement Entity" value={formData.procurement_entity} />
              <ReviewField label="Location" value={formData.location} />
            </div>
          </div>
        </div>

        {/* Arrays & Lists Summary */}
        <div className="bg-card border rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Requirements & Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-0">
              <ReviewField label="Eligibility Conditions" value={`${formData.conditions.length} defined`} />
              <ReviewField label="Technical Criteria" value={`${formData.technical_criteria.length} defined`} />
              <ReviewField label="Required Documents" value={`${formData.required_documents.length} specified`} />
            </div>
            <div className="space-y-0">
              <ReviewField label="Tender Groups" value={`${formData.tender_items.length} groups`} />
              <ReviewField label="Total Items" value={`${formData.tender_items.reduce((sum, g) => sum + g.items.length, 0)} items`} />
              <ReviewField label="Delivery Locations" value={`${formData.delivery_schedule.length} defined`} />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-card border rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">{STEPS.find(s => s.key === 'schedule')?.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-0">
              <ReviewField label="Bid Validity" value={formData.bid_validity} />
              <ReviewField label="Submission Deadline" value={formData.submission_deadline} />
              <ReviewField label="Pre-Bid Meeting" value={formData.pre_bid_meeting} />
            </div>
            <div className="space-y-0">
              <ReviewField label="Tech Bid Open" value={formData.tech_bid_open} />
              <ReviewField label="Fin Bid Open" value={formData.fin_bid_open} />
              <ReviewField label="Document Sale End" value={formData.document_sale_end} />
            </div>
          </div>
        </div>

        {/* Policy & Compliance */}
        <div className="bg-card border rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">{STEPS.find(s => s.key === 'compliance')?.label}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-0">
              <ReviewField label="Make in India" value={formData.make_in_india} />
              <ReviewField label="MSME Required" value={formData.msme_required} />
              <ReviewField label="GeM Required" value={formData.gem_required} />
            </div>
            <div className="space-y-0">
              <ReviewField label="Min Turnover" value={formData.min_turnover ? `₹${formData.min_turnover}` : ''} />
              <ReviewField label="Local Content %" value={formData.local_content_pct ? `${formData.local_content_pct}%` : ''} />
              <ReviewField label="Integrity Pact" value={formData.integrity_pact_required} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {missingFields.length === 0 ? (
            <>
              <CheckCircle2 className="text-green-500" size={24} />
              <span className="text-sm font-medium text-green-700">All required sections are complete. Ready to publish.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="text-amber-500" size={24} />
              <span className="text-sm font-medium text-amber-700">Please complete missing fields before publishing.</span>
            </>
          )}
        </div>
      </div>
    </StepPage>
  )
}
