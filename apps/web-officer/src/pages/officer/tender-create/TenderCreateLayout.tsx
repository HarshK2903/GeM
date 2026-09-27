import React, { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Save, Send, Check, CheckCircle2 } from 'lucide-react'
import { TenderFormProvider, useTenderForm, STEPS } from './TenderFormContext'
import TenderChatbot from './TenderChatbot'
import api from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// TenderCreateLayout — Wizard shell with sidebar stepper + chatbot
// Wraps all /officer/tenders/new/* step routes
// ─────────────────────────────────────────────────────────────────────────────

function WizardShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    formData, currentStepIndex, setCurrentStepIndex,
    isSaving, setIsSaving,
  } = useTenderForm()

  // Sync URL to step index
  useEffect(() => {
    const pathParts = location.pathname.split('/')
    const stepPath = pathParts[pathParts.length - 1]
    const idx = STEPS.findIndex(s => s.path === stepPath)
    if (idx >= 0 && idx !== currentStepIndex) {
      setCurrentStepIndex(idx)
    }
  }, [location.pathname, setCurrentStepIndex, currentStepIndex])

  const goToStep = (idx: number) => {
    setCurrentStepIndex(idx)
    navigate(`/officer/tenders/new/${STEPS[idx].path}`)
  }

  const handleSave = async (publish: boolean) => {
    try {
      setIsSaving(true)
      await api.post('/tenders', {
        title: formData.title || 'Untitled Tender',
        description: formData.description || 'No description provided.',
        tender_type: formData.tender_type,
        department: formData.department_name,
        category: formData.category,
        estimated_value: Number(formData.estimated_value) || 0,
        emd_amount: Number(formData.emd_amount) || 0,
        submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : undefined,
        reference_number: formData.reference_number,
        tender_denomination: formData.tender_denomination,
        location_name: formData.location,
        tender_scope: formData.description,
        commercial_bid_type: formData.commercial_bid_type,
        evaluation_method: formData.evaluation_method,
        price_list_type: formData.price_list_type,
        ecv_type: formData.ecv_status,
        currency_type: formData.currency,
        itemwise_technical_evaluation: formData.itemwise_technical,
        highest_bidder_selection: formData.highest_bidder,
        multiple_currencies_allowed: formData.multiple_currencies,
        file_number: formData.reference_number,
        sample_remarks: formData.remarks,
        procurement_entity_type: formData.procurement_entity,
        eligibility_conditions: formData.conditions.filter(c => c.trim()),
        technical_criteria: formData.technical_criteria.map(tc => ({
          criterion_type: tc.type,
          criterion_description: tc.description,
          criterion_documents: tc.documents,
        })),
        required_documents: formData.required_documents.map(d => d.description),
        required_documents_detailed: formData.required_documents.map(d => ({
          document_type: d.type,
          document_name: d.description,
          is_mandatory: d.is_mandatory,
        })),
        tender_groups: formData.tender_items.map(g => ({
          group_name: g.group_name,
          is_mandatory: g.is_mandatory,
          all_items_mandatory: g.all_items_mandatory,
          items: g.items.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            unit_of_measurement: item.unit_of_measurement,
            quantity: Number(item.quantity) || 0,
            estimated_unit_price: Number(item.estimated_unit_price) || null,
          })),
        })),
        delivery_schedule: formData.delivery_schedule.map(ds => ({
          item_code: ds.item_code,
          object_name: ds.object_name,
          scheduled_quantity: Number(ds.scheduled_quantity) || 0,
          delivery_location: ds.delivery_location || null,
          expected_delivery_date: ds.expected_delivery_date || null,
        })),
        contact_person_name: formData.contact_name,
        contact_designation: formData.contact_designation,
        contact_phone: formData.contact_phone,
        contact_mobile: formData.contact_mobile,
        contact_email: formData.contact_email,
        contact_address: formData.contact_address,
        tender_fee: Number(formData.tender_fee) || null,
        advance_deposit_amount: Number(formData.advance_deposit) || null,
        security_deposit_percentage: Number(formData.security_deposit_pct) || null,
        performance_security_percentage: Number(formData.performance_security_pct) || null,
        bid_validity_period: formData.bid_validity,
        last_date_queries: formData.queries_deadline ? new Date(formData.queries_deadline).toISOString() : null,
        last_date_receipt: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : null,
        technical_bid_open_date: formData.tech_bid_open ? new Date(formData.tech_bid_open).toISOString() : null,
        financial_bid_open_date: formData.fin_bid_open ? new Date(formData.fin_bid_open).toISOString() : null,
        pre_bid_meeting_date: formData.pre_bid_meeting ? new Date(formData.pre_bid_meeting).toISOString() : null,
        make_in_india_required: formData.make_in_india,
        msme_required: formData.msme_required,
        startup_required: formData.startup_preference,
        min_turnover: Number(formData.min_turnover) || null,
        local_content_percentage: Number(formData.local_content_pct) || null,
        gem_registration_required: formData.gem_required,
        published_user_name: formData.published_user_name,
        published_user_post: formData.published_user_post,
        special_instructions: formData.special_instructions,
        terms_and_conditions: formData.terms_conditions,
        status: publish ? 'PUBLISHED' : 'DRAFT',
      })
      navigate('/officer/tenders')
    } catch (err) {
      console.error('Failed to save tender:', err)
      alert('Failed to save tender. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === STEPS.length - 1

  return (
    <div className="space-y-0 max-w-7xl mx-auto pb-12">
      {/* Sticky header */}
      <div className="flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/officer/tenders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Tender</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex]?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />Save as Draft
          </Button>
          {isLastStep && (
            <Button onClick={() => handleSave(true)} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4 mr-2" />Publish Tender
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar stepper */}
        <div className="w-64 hidden lg:block shrink-0">
          <div className="sticky top-24 space-y-1">
            {STEPS.map((step, idx) => {
              const isActive = currentStepIndex === idx
              const isPast = currentStepIndex > idx
              return (
                <button
                  key={step.key}
                  onClick={() => goToStep(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className={`flex items-center justify-center h-6 w-6 rounded-full border text-xs ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isPast
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-muted-foreground'
                  }`}>
                    {isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm block truncate">{step.label}</span>
                    {isActive && (
                      <span className="text-[10px] text-muted-foreground block truncate">{step.description}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-card border rounded-lg shadow-sm">
          <div className="p-8 min-h-[60vh]">
            <Outlet />
          </div>

          {/* Footer navigation */}
          <div className="p-6 border-t bg-muted/20 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goToStep(Math.max(0, currentStepIndex - 1))}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <div className="text-sm text-muted-foreground font-medium">
              Step {currentStepIndex + 1} of {STEPS.length}
            </div>
            {!isLastStep ? (
              <Button onClick={() => goToStep(currentStepIndex + 1)} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSave(true)} disabled={isSaving}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4" /> Publish Tender
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Floating chatbot */}
      <TenderChatbot />
    </div>
  )
}

// Wrapper that provides context
export default function TenderCreateLayout() {
  return (
    <TenderFormProvider>
      <WizardShell />
    </TenderFormProvider>
  )
}
