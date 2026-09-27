import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, ArrowLeft, ArrowRight, Save, Send, Clock, FileText, CheckCircle2, ChevronRight, Check } from 'lucide-react'

// Base styles for standard inputs to match shadcn
const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

interface Tender {
  id: string
  title: string
  description: string
  status: string
  reference_number?: string
  estimated_value?: number
  tender_type?: string
  submission_deadline?: string
  created_at: string
}

const COMMON_CONDITIONS = [
  "EMD details have to be attached",
  "Bidders must keep tender open for 90 days",
  "Bidder responsibility for Tender Processing Fee and EMD",
  "EMD payments through e-Payment mode only",
  "Quantities are approximate",
  "Land border country registration requirement",
  "Security Deposit requirement (5% of total value)",
  "Authorized dealers can quote",
  "Agreement execution within 21 days",
  "Work completion in stipulated period",
  "Right to accept/reject/postpone",
  "Non-compliance leads to forfeiture",
  "Dispute resolution clause",
  "F.O.R. Destination pricing",
  "Indian currency quoting requirement",
  "OEM ISO/CE certificate requirement",
  "Service centre requirement",
  "Corrigendum/addendum updates",
  "Place of delivery as per tender"
]

const COMMON_DOCUMENTS = [
  { id: '1', type: 'Qualification Document', description: 'Declaration for not being disqualified/blacklisted', is_mandatory: true },
  { id: '2', type: 'Qualification Document', description: 'ISO certifications (ISO-9001:2015, IS 45001:2018, ISO 14001:2015)', is_mandatory: true },
  { id: '3', type: 'Qualification Document', description: 'Firm registration certificate', is_mandatory: true },
  { id: '4', type: 'Qualification Document', description: 'GST Registration Certificate', is_mandatory: true },
  { id: '5', type: 'Qualification Document', description: 'GST-RI returned file for 6 months', is_mandatory: true },
  { id: '6', type: 'Financial Bid', description: 'Income Tax returns for 3 years', is_mandatory: true },
  { id: '7', type: 'Technical Bid', description: 'Manufactures authorization Form', is_mandatory: true },
  { id: '8', type: 'Qualification Document', description: 'PAN card', is_mandatory: true },
  { id: '9', type: 'Experience Certificate', description: 'Performance and satisfactory reports', is_mandatory: true },
  { id: '10', type: 'Financial Bid', description: 'Minimum financial turnover certificate', is_mandatory: true },
]

export default function TenderManagement() {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'create'>('list')

  const fetchTenders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tenders')
      setTenders(response.data.items || response.data || [])
    } catch (error) {
      console.error('Error fetching tenders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'list') {
      fetchTenders()
    }
  }, [mode])

  if (mode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tender Management</h1>
            <p className="text-muted-foreground mt-1">Manage e-procurement tenders and publish new opportunities.</p>
          </div>
          <Button onClick={() => navigate('/officer/tenders/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Tender
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenders.map((tender) => (
              <Card key={tender.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="line-clamp-2 text-lg" title={tender.title}>
                      {tender.title}
                    </CardTitle>
                    <Badge variant={tender.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                      {tender.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono mt-1">
                    {tender.reference_number || `REF-${tender.id.substring(0, 8).toUpperCase()}`}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-3" title={tender.description}>
                    {tender.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Type</span>
                      <span className="font-medium">{tender.tender_type || 'Open'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">Value</span>
                      <span className="font-medium">
                        {tender.estimated_value ? `₹${tender.estimated_value.toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-xs mb-1">Submission Deadline</span>
                      <span className="font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleString() : 'Not Set'}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                  <Button variant="outline" className="w-full gap-2">
                    <FileText className="h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {tenders.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No Tenders Found</h3>
                <p className="mt-1">Create your first tender to get started.</p>
                <Button onClick={() => setMode('create')} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  New Tender
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return <TenderForm onCancel={() => setMode('list')} />
}

function TenderForm({ onCancel }: { onCancel: () => void }) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 11
  
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    // Section 1
    title: '', tender_type: 'Open', tender_denomination: 'Goods', department_name: '', location: '',
    description: '', commercial_bid_type: 'Itemwise', evaluation_method: 'Two Tender Document System',
    price_list_type: 'Open', estimated_value: '', emd_amount: '', ecv_status: 'Non-ECV', currency: 'Rupees',
    itemwise_technical: false, highest_bidder: false, multiple_currencies: false, reference_number: '',
    remarks: '', procurement_entity: 'Government Department', category: '',
    // Section 2
    conditions: [...COMMON_CONDITIONS],
    // Section 3
    technical_criteria: [] as any[],
    // Section 4
    required_documents: [...COMMON_DOCUMENTS],
    // Section 5
    tender_items: [] as any[],
    // Section 6
    delivery_schedule: [] as any[],
    // Section 7
    contact_name: '', contact_designation: '', contact_phone: '', contact_mobile: '', contact_email: '', contact_address: '',
    // Section 8
    tender_fee: '', advance_deposit: '', security_deposit_pct: '', performance_security_pct: '',
    // Section 9
    bid_validity: '90 days', queries_deadline: '', submission_deadline: '', tech_bid_open: '', fin_bid_open: '', pre_bid_meeting: '',
    // Section 10
    make_in_india: false, msme_required: false, startup_preference: false, min_turnover: '', local_content_pct: '', gem_required: false,
    // Section 11
    special_instructions: '', terms_conditions: ''
  })

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (publish: boolean) => {
    try {
      setSubmitting(true)
      const payload = { ...formData, status: publish ? 'PUBLISHED' : 'DRAFT' }
      
      // Attempt to map to core backend fields, sending all data in case backend supports it
      await api.post('/tenders', {
        title: formData.title || 'Untitled Tender',
        description: formData.description || 'No description provided.',
        tender_type: formData.tender_type,
        estimated_value: Number(formData.estimated_value) || 0,
        submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : undefined,
        reference_number: formData.reference_number,
        ...payload
      })
      onCancel()
    } catch (err) {
      console.error(err)
      alert("Failed to save tender")
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    "General Details", "Eligibility Conditions", "Technical Criteria", "Required Documents",
    "Tender Items", "Delivery Schedule", "Contact Info", "Amount Details",
    "Tender Schedule", "Policy Compliance", "Additional Info"
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Tender</h1>
            <p className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}: {steps[currentStep-1]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            Publish Tender
          </Button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Stepper */}
        <div className="w-64 hidden lg:block shrink-0">
          <div className="sticky top-24 space-y-1">
            {steps.map((step, idx) => {
              const stepNum = idx + 1
              const isActive = currentStep === stepNum
              const isPast = currentStep > stepNum
              return (
                <button
                  key={stepNum}
                  onClick={() => setCurrentStep(stepNum)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <div className={`flex items-center justify-center h-6 w-6 rounded-full border text-xs ${isActive ? 'border-primary bg-primary text-primary-foreground' : isPast ? 'border-primary text-primary bg-primary/10' : 'border-muted-foreground'}`}>
                    {isPast ? <Check className="h-3.5 w-3.5" /> : stepNum}
                  </div>
                  {step}
                </button>
              )
            })}
          </div>
        </div>

        {/* Form Content Area */}
        <div className="flex-1 bg-card border rounded-lg shadow-sm">
          <div className="p-8 min-h-[60vh]">
            
            {/* --- SECTION 1: General Details --- */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">General Details</h2>
                  <p className="text-muted-foreground text-sm mt-1">Basic information and classification of the tender.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label className="text-sm font-semibold">Tender Title <span className="text-destructive">*</span></Label>
                    <Input 
                      placeholder="e.g. Procurement of Heavy Machinery for Plant A" 
                      value={formData.title} onChange={e => updateForm('title', e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tender Type</Label>
                    <select className={inputClass} value={formData.tender_type} onChange={e => updateForm('tender_type', e.target.value)}>
                      <option>Open</option>
                      <option>Limited</option>
                      <option>Single Source</option>
                      <option>Two Part/Two Cover</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tender Denomination</Label>
                    <select className={inputClass} value={formData.tender_denomination} onChange={e => updateForm('tender_denomination', e.target.value)}>
                      <option>Goods</option>
                      <option>Services</option>
                      <option>Works</option>
                      <option>Consultancy</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Department Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Department of Health" value={formData.department_name} onChange={e => updateForm('department_name', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Location / Office Name</Label>
                    <Input placeholder="Bangalore HQ" value={formData.location} onChange={e => updateForm('location', e.target.value)} />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <Label className="text-sm font-semibold">Tender Scope / Work Description</Label>
                    <textarea 
                      className={textareaClass} rows={4} 
                      placeholder="Detailed description of the required procurement..."
                      value={formData.description} onChange={e => updateForm('description', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Estimated Tender Value (INR)</Label>
                    <Input type="number" placeholder="0.00" value={formData.estimated_value} onChange={e => updateForm('estimated_value', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">EMD Amount (INR)</Label>
                    <Input type="number" placeholder="0.00" value={formData.emd_amount} onChange={e => updateForm('emd_amount', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Commercial Bid Type</Label>
                    <select className={inputClass} value={formData.commercial_bid_type} onChange={e => updateForm('commercial_bid_type', e.target.value)}>
                      <option>Itemwise</option>
                      <option>Percentage</option>
                      <option>Lumpsum</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tender Evaluation Method</Label>
                    <select className={inputClass} value={formData.evaluation_method} onChange={e => updateForm('evaluation_method', e.target.value)}>
                      <option>Two Tender Document System</option>
                      <option>Single Cover</option>
                      <option>Quality and Cost Based</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">File / Reference Number</Label>
                    <Input placeholder="REF-2024-XYZ" value={formData.reference_number} onChange={e => updateForm('reference_number', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Type of Procurement Entity</Label>
                    <select className={inputClass} value={formData.procurement_entity} onChange={e => updateForm('procurement_entity', e.target.value)}>
                      <option>Government Department</option>
                      <option>PSU</option>
                      <option>Autonomous Body</option>
                      <option>University</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* --- SECTION 2: General Conditions --- */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">General Conditions of Eligibility</h2>
                  <p className="text-muted-foreground text-sm mt-1">Standard conditions that apply to this tender.</p>
                </div>
                
                <div className="space-y-4">
                  {formData.conditions.map((cond, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="mt-2.5 font-medium text-sm text-muted-foreground w-6">{idx + 1}.</div>
                      <textarea
                        className={textareaClass + " min-h-[40px] flex-1"}
                        rows={2}
                        value={cond}
                        onChange={e => {
                          const newConds = [...formData.conditions]
                          newConds[idx] = e.target.value
                          updateForm('conditions', newConds)
                        }}
                      />
                      <Button variant="ghost" size="icon" className="mt-1 text-destructive hover:bg-destructive/10" 
                        onClick={() => updateForm('conditions', formData.conditions.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full gap-2 border-dashed py-8" 
                    onClick={() => updateForm('conditions', [...formData.conditions, ''])}>
                    <Plus className="h-4 w-4" />
                    Add Condition
                  </Button>
                </div>
              </div>
            )}

            {/* --- SECTION 3: Technical Qualification Criteria --- */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Technical Qualification Criteria</h2>
                  <p className="text-muted-foreground text-sm mt-1">Specify technical requirements bidders must meet.</p>
                </div>
                
                <div className="space-y-6">
                  {formData.technical_criteria.map((crit, idx) => (
                    <div key={crit.id} className="p-4 border rounded-lg bg-card shadow-sm space-y-4 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive"
                        onClick={() => updateForm('technical_criteria', formData.technical_criteria.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex gap-4">
                        <div className="w-1/3 space-y-2">
                          <Label className="text-xs">Criterion Type</Label>
                          <select className={inputClass} value={crit.type} 
                            onChange={e => {
                              const nt = [...formData.technical_criteria]; nt[idx].type = e.target.value; updateForm('technical_criteria', nt)
                            }}>
                            <option>Past Experience</option>
                            <option>Capabilities of Vendor</option>
                            <option>Financial Status</option>
                            <option>Legal Status</option>
                            <option>Technical Capability</option>
                          </select>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label className="text-xs">Required Documents</Label>
                          <Input value={crit.documents} placeholder="e.g. Work orders, Completion certs"
                            onChange={e => {
                              const nt = [...formData.technical_criteria]; nt[idx].documents = e.target.value; updateForm('technical_criteria', nt)
                            }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Criterion Description</Label>
                        <textarea className={textareaClass} rows={2} value={crit.description}
                          onChange={e => {
                            const nt = [...formData.technical_criteria]; nt[idx].description = e.target.value; updateForm('technical_criteria', nt)
                          }} />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full gap-2 border-dashed py-8" 
                    onClick={() => updateForm('technical_criteria', [...formData.technical_criteria, { id: Math.random().toString(), type: 'Past Experience', description: '', documents: '' }])}>
                    <Plus className="h-4 w-4" />
                    Add Technical Criterion
                  </Button>
                </div>
              </div>
            )}

            {/* --- SECTION 4: Documents Required --- */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Documents Required from Bidder</h2>
                  <p className="text-muted-foreground text-sm mt-1">List all documents the bidder must upload.</p>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                      <tr>
                        <th className="px-4 py-3 w-16">S.No</th>
                        <th className="px-4 py-3 w-1/4">Document Type</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 w-24 text-center">Mandatory</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formData.required_documents.map((doc, idx) => (
                        <tr key={doc.id} className="bg-card">
                          <td className="px-4 py-3 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <select className={inputClass + " h-8 py-1"} value={doc.type}
                              onChange={e => { const nd = [...formData.required_documents]; nd[idx].type = e.target.value; updateForm('required_documents', nd) }}>
                              <option>Technical Bid</option>
                              <option>Financial Bid</option>
                              <option>Qualification Document</option>
                              <option>Experience Certificate</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <Input className="h-8" value={doc.description}
                              onChange={e => { const nd = [...formData.required_documents]; nd[idx].description = e.target.value; updateForm('required_documents', nd) }} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" className={checkboxClass} checked={doc.is_mandatory}
                              onChange={e => { const nd = [...formData.required_documents]; nd[idx].is_mandatory = e.target.checked; updateForm('required_documents', nd) }} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                              onClick={() => updateForm('required_documents', formData.required_documents.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" className="w-full gap-2 border-dashed" 
                  onClick={() => updateForm('required_documents', [...formData.required_documents, { id: Math.random().toString(), type: 'Qualification Document', description: '', is_mandatory: true }])}>
                  <Plus className="h-4 w-4" />
                  Add Document Requirement
                </Button>
              </div>
            )}

            {/* --- SECTION 5: Tender Items / Groups --- */}
            {currentStep === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Tender Items / Groups</h2>
                  <p className="text-muted-foreground text-sm mt-1">Manage tender item groups and items.</p>
                </div>
                
                <div className="space-y-6">
                  {formData.tender_items.map((group: any, gIndex: number) => (
                    <Card key={gIndex} className="p-4 border border-border bg-card">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-4 w-full mr-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Group Name</Label>
                              <Input placeholder="Enter group name" value={group.group_name || ''} onChange={e => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].group_name = e.target.value;
                                updateForm('tender_items', newGroups);
                              }} />
                            </div>
                            <div className="flex flex-col gap-2 mt-6">
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className={checkboxClass} checked={group.is_mandatory || false} onChange={e => {
                                  const newGroups = [...formData.tender_items];
                                  newGroups[gIndex].is_mandatory = e.target.checked;
                                  updateForm('tender_items', newGroups);
                                }} />
                                <span className="text-sm">Group Mandatory</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className={checkboxClass} checked={group.all_items_mandatory || false} onChange={e => {
                                  const newGroups = [...formData.tender_items];
                                  newGroups[gIndex].all_items_mandatory = e.target.checked;
                                  updateForm('tender_items', newGroups);
                                }} />
                                <span className="text-sm">All Items Mandatory</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          const newGroups = formData.tender_items.filter((_: any, i: number) => i !== gIndex);
                          updateForm('tender_items', newGroups);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="pl-4 border-l-2 border-primary/20 space-y-4">
                        <Label className="text-sm font-semibold text-muted-foreground">Items</Label>
                        {(group.items || []).map((item: any, iIndex: number) => (
                          <div key={iIndex} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-3 bg-muted/20 rounded-md border border-dashed">
                            <div className="space-y-1 col-span-1">
                              <Label className="text-xs">Item Code</Label>
                              <Input placeholder="Code" value={item.item_code || ''} onChange={e => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].items[iIndex].item_code = e.target.value;
                                updateForm('tender_items', newGroups);
                              }} />
                            </div>
                            <div className="space-y-1 col-span-1">
                              <Label className="text-xs">Item Name</Label>
                              <Input placeholder="Name" value={item.item_name || ''} onChange={e => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].items[iIndex].item_name = e.target.value;
                                updateForm('tender_items', newGroups);
                              }} />
                            </div>
                            <div className="space-y-1 col-span-1">
                              <Label className="text-xs">UOM</Label>
                              <Input placeholder="e.g. NOS, KG" value={item.unit_of_measurement || ''} onChange={e => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].items[iIndex].unit_of_measurement = e.target.value;
                                updateForm('tender_items', newGroups);
                              }} />
                            </div>
                            <div className="space-y-1 col-span-1">
                              <Label className="text-xs">Quantity</Label>
                              <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].items[iIndex].quantity = e.target.value;
                                updateForm('tender_items', newGroups);
                              }} />
                            </div>
                            <div className="space-y-1 col-span-1 flex gap-2 items-end">
                              <div className="flex-1">
                                <Label className="text-xs">Est. Unit Price</Label>
                                <Input type="number" placeholder="₹" value={item.estimated_unit_price || ''} onChange={e => {
                                  const newGroups = [...formData.tender_items];
                                  newGroups[gIndex].items[iIndex].estimated_unit_price = e.target.value;
                                  updateForm('tender_items', newGroups);
                                }} />
                              </div>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 mb-0.5" onClick={() => {
                                const newGroups = [...formData.tender_items];
                                newGroups[gIndex].items = newGroups[gIndex].items.filter((_: any, i: number) => i !== iIndex);
                                updateForm('tender_items', newGroups);
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="gap-2 border-dashed" onClick={() => {
                          const newGroups = [...formData.tender_items];
                          if (!newGroups[gIndex].items) newGroups[gIndex].items = [];
                          newGroups[gIndex].items.push({ item_code: '', item_name: '', unit_of_measurement: '', quantity: '', estimated_unit_price: '' });
                          updateForm('tender_items', newGroups);
                        }}>
                          <Plus className="h-3 w-3" />
                          Add Item
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
                <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => updateForm('tender_items', [...formData.tender_items, { group_name: '', is_mandatory: false, all_items_mandatory: false, items: [] }])}>
                  <Plus className="h-4 w-4" />
                  Add Tender Group
                </Button>
              </div>
            )}

            {/* --- SECTION 6: Delivery Schedule --- */}
            {currentStep === 6 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Delivery Schedule</h2>
                  <p className="text-muted-foreground text-sm mt-1">Specify item delivery schedules and locations.</p>
                </div>
                
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium">Item Code</th>
                        <th className="py-3 px-4 text-left font-medium">Object Name</th>
                        <th className="py-3 px-4 text-left font-medium">Quantity</th>
                        <th className="py-3 px-4 text-left font-medium">Delivery Location</th>
                        <th className="py-3 px-4 text-left font-medium">Expected Date</th>
                        <th className="py-3 px-4 w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formData.delivery_schedule.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="p-2">
                            <Input className="h-8" value={row.item_code || ''} onChange={e => {
                              const newData = [...formData.delivery_schedule];
                              newData[i].item_code = e.target.value;
                              updateForm('delivery_schedule', newData);
                            }} />
                          </td>
                          <td className="p-2">
                            <Input className="h-8" value={row.object_name || ''} onChange={e => {
                              const newData = [...formData.delivery_schedule];
                              newData[i].object_name = e.target.value;
                              updateForm('delivery_schedule', newData);
                            }} />
                          </td>
                          <td className="p-2">
                            <Input type="number" className="h-8" value={row.scheduled_quantity || ''} onChange={e => {
                              const newData = [...formData.delivery_schedule];
                              newData[i].scheduled_quantity = e.target.value;
                              updateForm('delivery_schedule', newData);
                            }} />
                          </td>
                          <td className="p-2">
                            <Input className="h-8" value={row.delivery_location || ''} onChange={e => {
                              const newData = [...formData.delivery_schedule];
                              newData[i].delivery_location = e.target.value;
                              updateForm('delivery_schedule', newData);
                            }} />
                          </td>
                          <td className="p-2">
                            <Input type="date" className="h-8" value={row.expected_delivery_date || ''} onChange={e => {
                              const newData = [...formData.delivery_schedule];
                              newData[i].expected_delivery_date = e.target.value;
                              updateForm('delivery_schedule', newData);
                            }} />
                          </td>
                          <td className="p-2 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                              const newData = formData.delivery_schedule.filter((_: any, idx: number) => idx !== i);
                              updateForm('delivery_schedule', newData);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => updateForm('delivery_schedule', [...formData.delivery_schedule, { item_code: '', object_name: '', scheduled_quantity: '', delivery_location: '', expected_delivery_date: '' }])}>
                  <Plus className="h-4 w-4" />
                  Add Schedule Row
                </Button>
              </div>
            )}

            {/* --- SECTION 7: Contact Information --- */}
            {currentStep === 7 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Contact Information</h2>
                  <p className="text-muted-foreground text-sm mt-1">Provide contact details for this tender.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Contact Person Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="Name" value={formData.contact_name} onChange={e => updateForm('contact_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Designation</Label>
                    <Input placeholder="Designation" value={formData.contact_designation} onChange={e => updateForm('contact_designation', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Office Phone</Label>
                    <Input placeholder="Office Phone" value={formData.contact_phone} onChange={e => updateForm('contact_phone', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Mobile Phone</Label>
                    <Input placeholder="Mobile Phone" value={formData.contact_mobile} onChange={e => updateForm('contact_mobile', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Email <span className="text-destructive">*</span></Label>
                    <Input type="email" placeholder="Email Address" value={formData.contact_email} onChange={e => updateForm('contact_email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Office Address</Label>
                    <Input placeholder="Full Address" value={formData.contact_address} onChange={e => updateForm('contact_address', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* --- SECTION 8: Tender Amount Details --- */}
            {currentStep === 8 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Tender Amount Details</h2>
                  <p className="text-muted-foreground text-sm mt-1">Specify fees and deposit amounts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tender Fee (INR)</Label>
                    <Input type="number" placeholder="0.00" value={formData.tender_fee} onChange={e => updateForm('tender_fee', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Advance Deposit Amount (INR)</Label>
                    <Input type="number" placeholder="0.00" value={formData.advance_deposit} onChange={e => updateForm('advance_deposit', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Security Deposit (%)</Label>
                    <Input type="number" placeholder="e.g. 5" value={formData.security_deposit_pct} onChange={e => updateForm('security_deposit_pct', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Performance Security (%)</Label>
                    <Input type="number" placeholder="e.g. 10" value={formData.performance_security_pct} onChange={e => updateForm('performance_security_pct', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Tender Schedule (Important Dates)</h2>
                  <p className="text-muted-foreground text-sm mt-1">Configure deadlines and opening dates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Bid Validity Period</Label>
                    <Input placeholder="e.g. 90 days" value={formData.bid_validity} onChange={e => updateForm('bid_validity', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Pre-bid Meeting Date (Optional)</Label>
                    <Input type="datetime-local" value={formData.pre_bid_meeting} onChange={e => updateForm('pre_bid_meeting', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Last Date for Queries/Clarifications</Label>
                    <Input type="datetime-local" value={formData.queries_deadline} onChange={e => updateForm('queries_deadline', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary">Submission Deadline <span className="text-destructive">*</span></Label>
                    <Input type="datetime-local" className="border-primary/50" value={formData.submission_deadline} onChange={e => updateForm('submission_deadline', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Technical Bid Opening Date</Label>
                    <Input type="datetime-local" value={formData.tech_bid_open} onChange={e => updateForm('tech_bid_open', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Financial Bid Opening Date</Label>
                    <Input type="datetime-local" value={formData.fin_bid_open} onChange={e => updateForm('fin_bid_open', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 10 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Policy Compliance</h2>
                  <p className="text-muted-foreground text-sm mt-1">Government policies and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" className={checkboxClass} checked={formData.make_in_india} onChange={e => updateForm('make_in_india', e.target.checked)} />
                      <div>
                        <p className="font-medium">Make in India Preference</p>
                        <p className="text-xs text-muted-foreground">Apply MII purchase preference policy</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" className={checkboxClass} checked={formData.msme_required} onChange={e => updateForm('msme_required', e.target.checked)} />
                      <div>
                        <p className="font-medium">MSME Exemption</p>
                        <p className="text-xs text-muted-foreground">Allow exemptions for Micro & Small Enterprises</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" className={checkboxClass} checked={formData.startup_preference} onChange={e => updateForm('startup_preference', e.target.checked)} />
                      <div>
                        <p className="font-medium">Startup Preference</p>
                        <p className="text-xs text-muted-foreground">DPIIT recognized startups exemption</p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Minimum Local Content (%)</Label>
                      <Input type="number" min="0" max="100" placeholder="e.g. 50" value={formData.local_content_pct} onChange={e => updateForm('local_content_pct', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Turnover (INR)</Label>
                      <Input type="number" placeholder="0.00" value={formData.min_turnover} onChange={e => updateForm('min_turnover', e.target.value)} />
                    </div>
                    <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <input type="checkbox" className={checkboxClass} checked={formData.gem_required} onChange={e => updateForm('gem_required', e.target.checked)} />
                      <div>
                        <p className="font-medium">GeM Registration Required</p>
                        <p className="text-xs text-muted-foreground">Bidder must be registered on Government e-Marketplace</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 11 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-dashed pb-4 mb-6">
                  <h2 className="text-xl font-semibold">Additional Information</h2>
                  <p className="text-muted-foreground text-sm mt-1">Final remarks and attachments.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Special Instructions to Bidders</Label>
                    <textarea className={textareaClass} rows={5} value={formData.special_instructions} onChange={e => updateForm('special_instructions', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Additional Terms & Conditions</Label>
                    <textarea className={textareaClass} rows={5} value={formData.terms_conditions} onChange={e => updateForm('terms_conditions', e.target.value)} />
                  </div>
                  
                  <div className="pt-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center hover:bg-muted/30 transition-colors cursor-pointer">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-1">Upload Annexures & Documents</h3>
                      <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-2">Supports PDF, DOCX, XLSX up to 50MB</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Stepper Footer Controls */}
          <div className="p-6 border-t bg-muted/20 flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            
            <div className="text-sm text-muted-foreground font-medium">
              Step {currentStep} of {totalSteps}
            </div>

            {currentStep < totalSteps ? (
              <Button onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleSave(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white" disabled={submitting}>
                <CheckCircle2 className="h-4 w-4" /> Publish Tender
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
