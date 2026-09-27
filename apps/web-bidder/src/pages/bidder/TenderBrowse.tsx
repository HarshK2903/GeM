import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Upload, FileText, Loader2, X, FileWarning, ArrowLeft, Eye } from 'lucide-react'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const Field = ({ label, value }: { label: string, value?: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="text-sm font-medium text-foreground">{value || '---'}</span>
  </div>
)

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <fieldset className="border border-border/60 rounded-md p-4 mb-6">
    <legend className="px-2 text-sm font-semibold text-primary">{title}</legend>
    {children}
  </fieldset>
)

export default function TenderBrowse() {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Bid submission state
  const [selected, setSelected] = useState<any>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [success, setSuccess] = useState('')
  const [newBidId, setNewBidId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState('')

  // Detail view state
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [detail, setDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    api.get('/tenders').then(r => setTenders(r.data.items || r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function handleFileChange(newFiles: File[]) {
    setFileError('')
    const validFiles = newFiles.filter(f => ALLOWED_TYPES.includes(f.type))
    if (validFiles.length < newFiles.length) {
      setFileError('Some files were ignored. Only PDF, PNG, and JPG are allowed.')
    }
    setFiles(prev => [...prev, ...validFiles])
  }

  async function handleSubmit() {
    if (!selected || files.length === 0) return
    setSubmitting(true)
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('tender_id', selected.id)
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

  const filtered = tenders.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase()) ||
    t.reference_number?.toLowerCase().includes(search.toLowerCase())
  )

  function getTimeLeft(deadline: string) {
    if (!deadline) return ''
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d left`
    const hrs = Math.floor(diff / 3600000)
    return `${hrs}h left`
  }

  const fetchDetail = async (id: string) => {
    setViewMode('detail')
    setLoadingDetail(true)
    try {
      const res = await api.get('/tenders/' + id)
      setDetail(res.data)
    } catch (e) {
      console.error('Failed to fetch tender details:', e)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      {viewMode === 'list' ? (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Browse Tenders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tenders.length} published tenders available</p>
          </div>

          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title, ref, or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><FileText size={32} className="mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No tenders found</p></CardContent></Card>
          ) : (
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference Number</TableHead>
                    <TableHead>Tender Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Submission Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => {
                    const expired = t.submission_deadline && new Date(t.submission_deadline).getTime() < Date.now()
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium whitespace-nowrap">{t.reference_number || '---'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={t.title}>{t.title || '---'}</TableCell>
                        <TableCell className="whitespace-nowrap">{t.department || '---'}</TableCell>
                        <TableCell className="whitespace-nowrap capitalize">{t.tender_type || '---'}</TableCell>
                        <TableCell className="whitespace-nowrap">{t.estimated_value ? `₹${t.estimated_value.toLocaleString()}` : '---'}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : '---'}
                          {t.submission_deadline && (
                            expired 
                              ? <span className="block text-[10px] text-destructive mt-0.5">Expired</span> 
                              : <span className="block text-[10px] text-amber-500 mt-0.5">{getTimeLeft(t.submission_deadline)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status?.toLowerCase() === 'open' ? 'default' : 'secondary'} className="capitalize">
                            {t.status || 'open'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => fetchDetail(t.id)}>
                              <Eye size={14} className="mr-1" /> View
                            </Button>
                            <Button size="sm" disabled={expired} onClick={() => setSelected(t)}>
                              Submit Bid
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        /* Detail View */
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-2 border-b">
            <Button variant="ghost" onClick={() => setViewMode('list')} size="sm">
              <ArrowLeft size={16} className="mr-2"/> Back to List
            </Button>
            <h2 className="text-xl font-bold">Tender Details</h2>
          </div>
          
          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : detail ? (
            <div className="bg-card text-card-foreground p-1 rounded-lg">
              <Section title="General Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <Field label="Tender Number" value={detail.reference_number} />
                  <Field label="Tender Title" value={detail.title} />
                  <Field label="Tender Denomination" value={detail.tender_denomination} />
                  <Field label="Department" value={detail.department} />
                  <Field label="Location Name" value={detail.location_name} />
                  <Field label="Tender Scope" value={detail.tender_scope || detail.description} />
                  <Field label="Commercial Bid Type" value={detail.commercial_bid_type} />
                  <Field label="Tender Evaluation Method" value={detail.evaluation_method} />
                  <Field label="Price List Type" value={detail.price_list_type} />
                  <Field label="Tender Amount" value={detail.estimated_value ? `₹${detail.estimated_value.toLocaleString()}` : '---'} />
                  <Field label="ECV/Non-ECV" value={detail.ecv_type} />
                  <Field label="Denomination Type" value={detail.currency_type} />
                  <Field label="Itemwise Technical Evaluation" value={detail.itemwise_technical_evaluation ? 'Yes' : 'No'} />
                  <Field label="Highest Bidder Selection" value={detail.highest_bidder_selection ? 'Yes' : 'No'} />
                  <Field label="Date Published" value={detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '---'} />
                  <Field label="Sample Remarks" value={detail.sample_remarks} />
                  <Field label="File Number" value={detail.file_number} />
                  <Field label="Type of Procurement Entity" value={detail.procurement_entity_type} />
                  <Field label="Multiple Currencies Allowed" value={detail.multiple_currencies_allowed ? 'Yes' : 'No'} />
                  <Field label="Number of Declarations" value="---" />
                </div>
              </Section>
              
              <Section title="General Conditions of Eligibility">
                {(!detail.eligibility_conditions || detail.eligibility_conditions.length === 0) ? (
                  <div className="py-2 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground text-sm font-medium">Condition 1:</span>
                    <span className="text-sm ml-4">---</span>
                  </div>
                ) : (
                  (detail.eligibility_conditions || []).map((cond: string, idx: number) => (
                    <div key={idx} className="py-2 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground text-sm font-medium">Condition {idx + 1}:</span>
                      <span className="text-sm ml-4">{cond}</span>
                    </div>
                  ))
                )}
              </Section>

              <Section title="Technical Qualification Criteria">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Criterion Type</TableHead>
                        <TableHead>Criterion Description</TableHead>
                        <TableHead>Criterion Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!detail.technical_criteria || detail.technical_criteria.length === 0) ? (
                        <TableRow>
                          <TableCell>1</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                        </TableRow>
                      ) : (
                        (detail.technical_criteria || []).map((tc: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{tc.criterion_type}</TableCell>
                            <TableCell>{tc.criterion_description}</TableCell>
                            <TableCell>{tc.criterion_documents}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Section>

              <Section title="Documents Required from Bidder">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Document is Mandatory</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!detail.required_documents_detailed || detail.required_documents_detailed.length === 0) ? (
                        <TableRow>
                          <TableCell>1</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                        </TableRow>
                      ) : (
                        (detail.required_documents_detailed || []).map((doc: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{doc.document_type}</TableCell>
                            <TableCell>{doc.document_name}</TableCell>
                            <TableCell>{doc.is_mandatory ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Section>

              <Section title="Tender Group Items">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Group is Mandatory</TableHead>
                        <TableHead>All Items are Mandatory</TableHead>
                        <TableHead>No of Items</TableHead>
                        <TableHead>View Item Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!detail.tender_groups || detail.tender_groups.length === 0) ? (
                        <TableRow>
                          <TableCell>1</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                        </TableRow>
                      ) : (
                        (detail.tender_groups || []).map((group: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{group.group_name}</TableCell>
                            <TableCell>{group.is_mandatory ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{group.all_items_mandatory ? 'Yes' : 'No'}</TableCell>
                            <TableCell>{group.items?.length || 0}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">View</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Section>

              <Section title="Delivery Schedule">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Object Name</TableHead>
                        <TableHead>Scheduled Quantity</TableHead>
                        <TableHead>View Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!detail.delivery_schedule || detail.delivery_schedule.length === 0) ? (
                        <TableRow>
                          <TableCell>1</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                          <TableCell>---</TableCell>
                        </TableRow>
                      ) : (
                        (detail.delivery_schedule || []).map((schedule: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{schedule.item_code}</TableCell>
                            <TableCell>{schedule.object_name}</TableCell>
                            <TableCell>{schedule.scheduled_quantity}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">View</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Section>

              <Section title="Contact Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <Field label="Contact Person Name" value={detail.contact_person_name} />
                  <Field label="Office phone number" value={detail.contact_phone} />
                  <Field label="Mobile Phone Number" value={detail.contact_mobile} />
                  <Field label="Email Address" value={detail.contact_email} />
                  <Field label="Address" value={detail.contact_address} />
                </div>
              </Section>

              <Section title="Tender Amount Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <Field label="Tender Fee (INR)" value={detail.tender_fee ? `₹${detail.tender_fee.toLocaleString()}` : '---'} />
                  <Field label="Advance Deposit Amount (INR)" value={detail.advance_deposit_amount ? `₹${detail.advance_deposit_amount.toLocaleString()}` : '---'} />
                  <Field label="Security Deposit %" value={detail.security_deposit_percentage ? `${detail.security_deposit_percentage}%` : '---'} />
                  <Field label="Performance Security %" value={detail.performance_security_percentage ? `${detail.performance_security_percentage}%` : '---'} />
                </div>
              </Section>

              <Section title="Tender Schedule">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <Field label="Bid validity period" value={detail.bid_validity_period} />
                  <Field label="Last date and time for tender queries/clarifications" value={detail.last_date_queries ? new Date(detail.last_date_queries).toLocaleString() : '---'} />
                  <Field label="Last date and time for receipt of tenders" value={(detail.last_date_receipt || detail.submission_deadline) ? new Date(detail.last_date_receipt || detail.submission_deadline).toLocaleString() : '---'} />
                  <Field label="Date and time to open technical price action" value={detail.technical_bid_open_date ? new Date(detail.technical_bid_open_date).toLocaleString() : '---'} />
                  <Field label="Technical Bid Approver" value={detail.technical_bid_approver} />
                  <Field label="Technical Bid Approved Date" value={detail.technical_bid_approved_date ? new Date(detail.technical_bid_approved_date).toLocaleString() : '---'} />
                  <Field label="Financial Bid Opened by" value={detail.financial_bid_opened_by} />
                  <Field label="Financial Bid Opened Date" value={detail.financial_bid_opened_date ? new Date(detail.financial_bid_opened_date).toLocaleString() : '---'} />
                  <Field label="Financial Bid Approver" value={detail.financial_bid_approver} />
                  <Field label="Financial Bid Approved Date" value={detail.financial_bid_approved_date ? new Date(detail.financial_bid_approved_date).toLocaleString() : '---'} />
                  <Field label="Tender Awarded Date" value={detail.tender_awarded_date ? new Date(detail.tender_awarded_date).toLocaleString() : '---'} />
                </div>
              </Section>

              <Section title="Tender Published User Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
                  <Field label="Tender Published User Name" value={detail.published_user_name} />
                  <Field label="Tender Published User Post" value={detail.published_user_post} />
                </div>
              </Section>
              
              <div className="mt-8 flex gap-4 pt-4 border-t border-border">
                <Button size="lg" 
                  disabled={detail.submission_deadline && new Date(detail.submission_deadline).getTime() < Date.now()} 
                  onClick={() => setSelected(detail)}
                >
                  Submit Bid
                </Button>
                <Button size="lg" variant="outline" onClick={() => setViewMode('list')}>
                  Back to List
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground border rounded-md">Failed to load tender details</div>
          )}
        </div>
      )}

      {/* Bid submission dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setFiles([]); setSuccess(''); setNewBidId(null); setUploadProgress(0); setFileError(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Submit bid</DialogTitle>
            <p className="text-sm text-muted-foreground">{selected?.title}</p>
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
