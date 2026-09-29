import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Search, Upload, FileText, Loader2, X, FileWarning, ArrowLeft, Clock, Calendar, CheckCircle, MapPin, Briefcase } from 'lucide-react'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="text-sm font-medium text-foreground">{value || '---'}</span>
  </div>
)

const Section = ({ id, title, count, children }: { id: string; title: string; count?: number; children: React.ReactNode }) => (
  <fieldset id={id} className="border border-border/60 rounded-md p-5 mb-6 scroll-mt-24">
    <legend className="px-2 text-sm font-semibold text-primary flex items-center gap-2">
      {title}
      {count !== undefined && <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>}
    </legend>
    {children}
  </fieldset>
)

const BooleanBadge = ({ value }: { value?: boolean | null }) => (
  <Badge variant={value ? 'default' : 'secondary'} className={value ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25' : ''}>
    {value ? 'Yes' : 'No'}
  </Badge>
)

const CurrencyLabel = ({ amount }: { amount?: number | null }) => (
  <span>{amount != null ? `₹${amount.toLocaleString()}` : '---'}</span>
)

const DateLabel = ({ dateStr }: { dateStr?: string | null }) => (
  <span>{dateStr ? new Date(dateStr).toLocaleString() : '---'}</span>
)

export default function TenderDetail() {
  const { tenderId } = useParams<{ tenderId: string }>()
  const navigate = useNavigate()
  
  const [tender, setTender] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bid submission state
  const [showBidDialog, setShowBidDialog] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [success, setSuccess] = useState('')
  const [newBidId, setNewBidId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (!tenderId) return
    setLoading(true)
    api.get(`/tenders/${tenderId}`)
      .then(res => setTender(res.data))
      .catch(err => setError(err.message || 'Failed to load tender details.'))
      .finally(() => setLoading(false))
  }, [tenderId])

  function handleFileChange(newFiles: File[]) {
    setFileError('')
    const validFiles = newFiles.filter(f => ALLOWED_TYPES.includes(f.type))
    if (validFiles.length < newFiles.length) {
      setFileError('Some files were ignored. Only PDF, PNG, and JPG are allowed.')
    }
    setFiles(prev => [...prev, ...validFiles])
  }

  async function handleSubmit() {
    if (!tender || files.length === 0) return
    setSubmitting(true)
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('tender_id', tender.id)
      files.forEach(f => fd.append('documents', f))
      const res = await api.post('/bids', fd, { 
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)))
        }
      })
      setSuccess('Bid submitted! AI analysis will begin shortly.')
      setNewBidId(res.data.id)
      setFiles([])
    } catch (err: any) {
      setSuccess(err.response?.data?.error || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  function getTimeLeft(deadline: string | undefined | null) {
    if (!deadline) return '---'
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d left`
    const hrs = Math.floor(diff / 3600000)
    return `${hrs}h left`
  }
  
  const expired = tender?.submission_deadline ? new Date(tender.submission_deadline).getTime() < Date.now() : false
  const isOpen = tender?.status?.toLowerCase() === 'open'
  const canBid = isOpen && !expired

  const sections = [
    { id: 'sec-overview', label: 'Overview' },
    { id: 'sec-general', label: 'General Details' },
    { id: 'sec-eligibility', label: 'Eligibility Conditions' },
    { id: 'sec-tech-criteria', label: 'Technical Criteria' },
    { id: 'sec-documents', label: 'Documents Required' },
    { id: 'sec-items', label: 'Tender Group Items' },
    { id: 'sec-delivery', label: 'Delivery Schedule' },
    { id: 'sec-contact', label: 'Contact Information' },
    { id: 'sec-amount', label: 'Tender Amount' },
    { id: 'sec-schedule', label: 'Tender Schedule' },
    { id: 'sec-policy', label: 'Policy & Compliance' },
    { id: 'sec-published', label: 'Published Details' },
  ]

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in p-6">
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-8">
          <Skeleton className="w-64 h-[600px] hidden lg:block" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !tender) {
    return (
      <div className="p-8 text-center text-destructive border rounded-md m-6 flex flex-col items-center">
        <FileWarning className="mb-4 h-12 w-12 opacity-80" />
        <h2 className="text-xl font-bold mb-2">Error Loading Tender</h2>
        <p>{error || 'Tender not found'}</p>
        <Button onClick={() => navigate('/bidder/tenders')} variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Browse
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col animate-in fade-in">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/bidder/tenders')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold truncate max-w-[400px]" title={tender.title}>{tender.title}</h1>
              <p className="text-xs text-muted-foreground">Ref: {tender.reference_number || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={tender.status === 'open' ? 'default' : tender.status === 'published' ? 'secondary' : 'outline'} className="capitalize">
              {tender.status === 'open' ? 'Open for Bids' : tender.status}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm font-medium bg-muted px-3 py-1.5 rounded-full">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={expired ? "text-destructive" : ""}>
                {expired ? 'Expired' : getTimeLeft(tender.submission_deadline)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container px-4 py-8 flex items-start gap-8 relative">
        {/* Left Sidebar Table of Contents */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          <nav className="space-y-1 bg-card rounded-lg border p-4 shadow-sm">
            <h3 className="font-semibold mb-4 px-2 text-sm text-muted-foreground uppercase tracking-wider">Contents</h3>
            {sections.map(sec => (
              <button 
                key={sec.id}
                onClick={() => scrollTo(sec.id)}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors text-foreground/80 hover:text-foreground font-medium"
              >
                {sec.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-24 space-y-2">
          
          {/* Section 1: Overview Hero Card */}
          <section id="sec-overview" className="scroll-mt-24 mb-8">
            <Card className="border-border overflow-hidden">
              <div className="bg-primary/5 p-6 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-3 bg-background">{tender.tender_type || 'Unknown Type'}</Badge>
                    <h2 className="text-2xl font-bold mb-2">{tender.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4"/> {tender.department || '---'}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4"/> {tender.location_name || '---'}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> Created: {tender.created_at ? new Date(tender.created_at).toLocaleDateString() : '---'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
                    <p className="text-2xl font-bold text-primary"><CurrencyLabel amount={tender.estimated_value} /></p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Section 2: General Details */}
          <Section id="sec-general" title="General Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
              <Field label="Tender Reference Number" value={tender.reference_number} />
              <Field label="Tender Denomination" value={tender.tender_denomination} />
              <Field label="Location Name" value={tender.location_name} />
              <Field label="Tender Scope" value={tender.tender_scope || tender.description} />
              <Field label="Commercial Bid Type" value={tender.commercial_bid_type} />
              <Field label="Evaluation Method" value={tender.evaluation_method} />
              <Field label="Price List Type" value={tender.price_list_type} />
              <Field label="ECV / Non-ECV" value={tender.ecv_type} />
              <Field label="Currency Type" value={tender.currency_type} />
              <Field label="Itemwise Technical Evaluation" value={<BooleanBadge value={tender.itemwise_technical_evaluation} />} />
              <Field label="Highest Bidder Selection" value={<BooleanBadge value={tender.highest_bidder_selection} />} />
              <Field label="Sample Remarks" value={tender.sample_remarks} />
              <Field label="File Number" value={tender.file_number} />
              <Field label="Procurement Entity Type" value={tender.procurement_entity_type} />
              <Field label="Multiple Currencies Allowed" value={<BooleanBadge value={tender.multiple_currencies_allowed} />} />
              <Field label="Category" value={tender.category} />
            </div>
          </Section>

          {/* Section 3: Eligibility Conditions */}
          <Section id="sec-eligibility" title="Eligibility Conditions" count={tender.eligibility_conditions?.length || 0}>
            {(!tender.eligibility_conditions || tender.eligibility_conditions.length === 0) ? (
              <p className="text-sm text-muted-foreground p-4">---</p>
            ) : (
              <div className="space-y-4">
                {tender.eligibility_conditions.map((cond, idx) => (
                  <div key={idx} className="flex gap-4 p-3 rounded-md bg-muted/40 border border-border/50">
                    <div className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{cond}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Section 4: Technical Qualification Criteria */}
          <Section id="sec-tech-criteria" title="Technical Qualification Criteria" count={tender.technical_criteria?.length || 0}>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Criterion Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Required Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!tender.technical_criteria || tender.technical_criteria.length === 0) ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">---</TableCell></TableRow>
                  ) : (
                    tender.technical_criteria.map((tc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{tc.criterion_type}</TableCell>
                        <TableCell>{tc.criterion_description}</TableCell>
                        <TableCell>{tc.criterion_documents}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Section 5: Documents Required */}
          <Section id="sec-documents" title="Documents Required" count={tender.required_documents_detailed?.length || 0}>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead className="text-right">Mandatory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!tender.required_documents_detailed || tender.required_documents_detailed.length === 0) ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">---</TableCell></TableRow>
                  ) : (
                    tender.required_documents_detailed.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{doc.document_name}</TableCell>
                        <TableCell className="text-right">
                          <BooleanBadge value={doc.is_mandatory} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Section 6: Tender Group Items */}
          <Section id="sec-items" title="Tender Group Items" count={tender.tender_groups?.length || 0}>
            <div className="space-y-6">
              {(!tender.tender_groups || tender.tender_groups.length === 0) ? (
                <p className="text-sm text-muted-foreground px-2">---</p>
              ) : (
                tender.tender_groups.map((group, gIdx) => (
                  <div key={gIdx} className="border rounded-md overflow-hidden">
                    <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Group {gIdx + 1}: {group.group_name}</span>
                        <div className="flex gap-2">
                          {group.is_mandatory && <Badge variant="secondary" className="text-xs">Mandatory Group</Badge>}
                          {group.all_items_mandatory && <Badge variant="outline" className="text-xs">All Items Mandatory</Badge>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{group.items?.length || 0} Items</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">S.No</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Est. Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!group.items || group.items.length === 0) ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">---</TableCell></TableRow>
                        ) : (
                          group.items.map((item, iIdx) => (
                            <TableRow key={iIdx}>
                              <TableCell>{iIdx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                              <TableCell className="font-medium">{item.item_name}</TableCell>
                              <TableCell>{item.unit_of_measurement}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right"><CurrencyLabel amount={item.estimated_unit_price} /></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* Section 7: Delivery Schedule */}
          <Section id="sec-delivery" title="Delivery Schedule" count={tender.delivery_schedule?.length || 0}>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Object Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Expected Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!tender.delivery_schedule || tender.delivery_schedule.length === 0) ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">---</TableCell></TableRow>
                  ) : (
                    tender.delivery_schedule.map((ds, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{ds.item_code}</TableCell>
                        <TableCell>{ds.object_name}</TableCell>
                        <TableCell className="text-right">{ds.scheduled_quantity}</TableCell>
                        <TableCell>{ds.delivery_location || '---'}</TableCell>
                        <TableCell><DateLabel dateStr={ds.expected_delivery_date} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Section 8: Contact Information */}
          <Section id="sec-contact" title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
              <Field label="Contact Person Name" value={tender.contact_person_name} />
              <Field label="Designation" value={tender.contact_designation} />
              <Field label="Office Phone" value={tender.contact_phone ? <a href={`tel:${tender.contact_phone}`} className="text-primary hover:underline">{tender.contact_phone}</a> : undefined} />
              <Field label="Mobile Phone" value={tender.contact_mobile ? <a href={`tel:${tender.contact_mobile}`} className="text-primary hover:underline">{tender.contact_mobile}</a> : undefined} />
              <Field label="Email Address" value={tender.contact_email ? <a href={`mailto:${tender.contact_email}`} className="text-primary hover:underline">{tender.contact_email}</a> : undefined} />
              <Field label="Physical Address" value={tender.contact_address} />
            </div>
          </Section>

          {/* Section 9: Tender Amount Details */}
          <Section id="sec-amount" title="Tender Amount Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
              <Field label="Estimated Value" value={<CurrencyLabel amount={tender.estimated_value} />} />
              <Field label="EMD Amount" value={<CurrencyLabel amount={tender.emd_amount} />} />
              <Field label="Tender Fee" value={<CurrencyLabel amount={tender.tender_fee} />} />
              <Field label="Advance Deposit Amount" value={<CurrencyLabel amount={tender.advance_deposit_amount} />} />
              <Field label="Security Deposit %" value={tender.security_deposit_percentage != null ? `${tender.security_deposit_percentage}%` : '---'} />
              <Field label="Performance Security %" value={tender.performance_security_percentage != null ? `${tender.performance_security_percentage}%` : '---'} />
            </div>
          </Section>

          {/* Section 10: Tender Schedule */}
          <Section id="sec-schedule" title="Tender Schedule & Dates">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
              <Field label="Submission Deadline" value={<span className="font-semibold text-primary"><DateLabel dateStr={tender.submission_deadline} /></span>} />
              <Field label="Bid Validity Period" value={tender.bid_validity_period} />
              <Field label="Last Date for Queries" value={<DateLabel dateStr={tender.last_date_queries} />} />
              <Field label="Last Date for Receipt" value={<DateLabel dateStr={tender.last_date_receipt} />} />
              <Field label="Pre-Bid Meeting Date" value={<DateLabel dateStr={tender.pre_bid_meeting_date} />} />
              <Field label="Technical Bid Open Date" value={<DateLabel dateStr={tender.technical_bid_open_date} />} />
              <Field label="Technical Bid Approved Date" value={<DateLabel dateStr={tender.technical_bid_approved_date} />} />
              <Field label="Technical Bid Approver" value={tender.technical_bid_approver} />
              <Field label="Financial Bid Opened Date" value={<DateLabel dateStr={tender.financial_bid_opened_date} />} />
              <Field label="Financial Bid Opened By" value={tender.financial_bid_opened_by} />
              <Field label="Financial Bid Approved Date" value={<DateLabel dateStr={tender.financial_bid_approved_date} />} />
              <Field label="Financial Bid Approver" value={tender.financial_bid_approver} />
              <Field label="Tender Awarded Date" value={<DateLabel dateStr={tender.tender_awarded_date} />} />
            </div>
          </Section>

          {/* Section 11: Policy & Compliance */}
          <Section id="sec-policy" title="Policy & Compliance">
            <div className="flex flex-wrap gap-4 mb-6">
              {tender.make_in_india_required && <Badge variant="default" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20"><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Make in India Preference</Badge>}
              {tender.msme_required && <Badge variant="default" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20"><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> MSME Preference</Badge>}
              {tender.startup_required && <Badge variant="default" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20"><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Startup Preference</Badge>}
              {tender.gem_registration_required && <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> GeM Registration Required</Badge>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
              <Field label="Minimum Turnover Required" value={<CurrencyLabel amount={tender.min_turnover} />} />
              <Field label="Local Content Percentage" value={tender.local_content_percentage != null ? `${tender.local_content_percentage}%` : '---'} />
            </div>
          </Section>

          {/* Section 12: Published Details */}
          <Section id="sec-published" title="Published User Details & Additional Info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 mb-6">
              <Field label="Published By (Name)" value={tender.published_user_name} />
              <Field label="Published By (Post)" value={tender.published_user_post} />
            </div>
            
            {tender.special_instructions && (
              <div className="mb-6">
                <Label className="text-muted-foreground text-sm mb-2 block">Special Instructions</Label>
                <div className="p-4 bg-muted/30 rounded-md border text-sm whitespace-pre-wrap">
                  {tender.special_instructions}
                </div>
              </div>
            )}
            
            {tender.terms_and_conditions && (
              <div>
                <Label className="text-muted-foreground text-sm mb-2 block">Terms & Conditions</Label>
                <div className="p-4 bg-muted/30 rounded-md border text-sm whitespace-pre-wrap">
                  {tender.terms_and_conditions}
                </div>
              </div>
            )}
          </Section>

        </main>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-lg p-4 transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {canBid
                ? <>Ready to submit a bid for <span className="font-bold">{tender.reference_number || 'this tender'}</span>?</>
                : expired
                  ? 'This tender has expired and is no longer accepting bids.'
                  : !isOpen
                    ? 'This tender is published but not yet open for bidding.'
                    : 'Bidding is currently not available.'}
            </p>
            <p className="text-xs text-muted-foreground">
              {canBid ? 'Complete document submission wizard with step-by-step verification.' : 'Check back later or contact the procuring officer.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" disabled={!canBid} onClick={() => setShowBidDialog(true)}>
              Quick Upload
            </Button>
            <Button size="lg" disabled={!canBid} onClick={() => navigate(`/bidder/tenders/${tenderId}/submit`)} className="px-8 shadow-md">
              {expired ? 'Tender Expired' : !isOpen ? 'Not Yet Open' : 'Start Full Submission →'}
            </Button>
          </div>
        </div>
      </div>

      {/* Bid Submission Dialog */}
      <Dialog open={showBidDialog} onOpenChange={open => { if (!open) { setShowBidDialog(false); setFiles([]); setSuccess(''); setNewBidId(null); setUploadProgress(0); setFileError(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Submit Bid</DialogTitle>
            <p className="text-sm text-muted-foreground truncate">{tender.title}</p>
          </DialogHeader>
          
          {success ? (
            <div className="py-8 text-center animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <FileText size={24} className="text-emerald-400" />
              </div>
              <p className="text-base font-medium mb-1">{success}</p>
              <p className="text-sm text-muted-foreground mb-6">Your documents are being processed by our AI compliance engine.</p>
              <div className="flex justify-center gap-3">
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                {newBidId && (
                  <Button onClick={() => navigate(`/bidder/bids/${newBidId}`)}>
                    Track your bid
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Upload documents <span className="text-xs text-muted-foreground font-normal">(PDF, PNG, JPG)</span></Label>
                  <label 
                    className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer relative overflow-hidden ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); handleFileChange(Array.from(e.dataTransfer.files)); }}
                  >
                    <Upload size={24} className={`${dragActive ? 'text-primary' : 'text-muted-foreground'} mb-2`} />
                    <span className="text-sm font-medium">Click to upload or drag files</span>
                    <span className="text-xs text-muted-foreground mt-1">Maximum file size: 10MB</span>
                    <input type="file" multiple accept=".pdf,.png,.jpeg,.jpg" className="hidden" onChange={e => handleFileChange(Array.from(e.target.files || []))} />
                  </label>
                  {fileError && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 mt-2 bg-amber-500/10 p-2 rounded">
                      <FileWarning size={14} /> {fileError}
                    </div>
                  )}
                </div>
                
                {files.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-md bg-secondary/50 border border-border/50 text-sm animate-in slide-in-from-left-2">
                        <div className="flex flex-col min-w-0 flex-1 mr-3">
                          <span className="truncate font-medium">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                        </div>
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={submitting} className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-50">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {submitting && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs">
                      <span>Uploading documents...</span>
                      <span className="font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
                <Button onClick={handleSubmit} disabled={submitting || files.length === 0}>
                  {submitting ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Submitting...</> : `Submit ${files.length} file${files.length !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
