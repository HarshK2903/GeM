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
import { Search, Calendar, Building2, Upload, FileText, Loader2, X, Clock, FileWarning } from 'lucide-react'

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function TenderBrowse() {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [success, setSuccess] = useState('')
  const [newBidId, setNewBidId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    api.get('/tenders').then(r => setTenders(r.data.items || [])).catch(() => {}).finally(() => setLoading(false))
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
    t.department?.toLowerCase().includes(search.toLowerCase())
  )

  function getTimeLeft(deadline: string) {
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d left`
    const hrs = Math.floor(diff / 3600000)
    return `${hrs}h left`
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse tenders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{tenders.length} published tenders</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by title or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText size={32} className="mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No tenders found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => {
            const expired = t.deadline && new Date(t.deadline) < new Date()
            return (
              <Card key={t.id} className="hover:border-border/80 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <h3 className="text-sm font-semibold leading-snug mb-2">{t.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Building2 size={12} /> {t.department || 'General'}</span>
                    {t.deadline && (
                      <span className={`flex items-center gap-1 ${expired ? 'text-destructive' : 'text-amber-400'}`}>
                        <Clock size={12} /> {getTimeLeft(t.deadline)}
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description}</p>}
                  {t.required_documents?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.required_documents.slice(0, 3).map((d: string) => (
                         <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{d.replace(/_/g, ' ')}</span>
                      ))}
                      {t.required_documents.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">+{t.required_documents.length - 3}</span>}
                    </div>
                  )}
                  <Button size="sm" variant="outline" disabled={expired} onClick={() => setSelected(t)} className="w-full">
                    {expired ? 'Deadline passed' : 'Submit bid'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
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
