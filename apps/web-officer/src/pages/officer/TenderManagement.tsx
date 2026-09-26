import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Calendar, Building2, FileText, Loader2, Check } from 'lucide-react'

const docTypes = [
  'udyam', 'gst', 'pan', 'mca21', 'epfo', 'esic',
  'startup_cert', 'turnover_cert', 'make_in_india', 'gem_seller',
  'digilocker', 'bis_certificate', 'income_tax_return', 'nsic', 'oem_authorization'
]

const statusMap: Record<string, { label: string; class: string }> = {
  draft: { label: 'Draft', class: 'status-muted' },
  published: { label: 'Published', class: 'status-success' },
  evaluation: { label: 'Evaluation', class: 'status-warning' },
  awarded: { label: 'Awarded', class: 'status-info' },
  cancelled: { label: 'Cancelled', class: 'status-danger' },
  closed: { label: 'Closed', class: 'status-danger' },
}

export default function TenderManagement() {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', department: '', deadline: '',
    required_documents: [] as string[], msme_required: false, make_in_india_required: false,
  })

  useEffect(() => { loadTenders() }, [])

  async function loadTenders() {
    try {
      const { data } = await api.get('/tenders')
      setTenders(data.items || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleStatusChange(tenderId: string, newStatus: string) {
    try {
      await api.patch(`/tenders/${tenderId}`, { status: newStatus })
      loadTenders()
    } catch (err) {
      console.error('Status change failed:', err)
    }
  }

  async function handleCreate() {
    setCreating(true)
    try {
      await api.post('/tenders', form)
      setForm({ title: '', description: '', department: '', deadline: '', required_documents: [], msme_required: false, make_in_india_required: false })
      loadTenders()
    } catch (err) { console.error(err) }
    finally { setCreating(false) }
  }

  function toggleDoc(doc: string) {
    setForm(f => ({
      ...f,
      required_documents: f.required_documents.includes(doc)
        ? f.required_documents.filter(d => d !== doc)
        : [...f.required_documents, doc]
    }))
  }

  const filtered = tenders.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tenders.length} total tenders</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} className="mr-1.5" /> New tender</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create tender</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Title</Label><Input placeholder="Supply of computing equipment" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div className="space-y-2"><Label>Department</Label><Input placeholder="Ministry of Electronics & IT" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div className="space-y-2"><Label>Description</Label><textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Tender details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Required documents</Label>
                <div className="flex flex-wrap gap-1.5">
                  {docTypes.map(d => (
                    <button key={d} onClick={() => toggleDoc(d)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors
                        ${form.required_documents.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'}`}>
                      {form.required_documents.includes(d) && <Check size={10} className="inline mr-1" />}
                      {d.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.msme_required} onChange={e => setForm({...form, msme_required: e.target.checked})} className="rounded" /> MSME required
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.make_in_india_required} onChange={e => setForm({...form, make_in_india_required: e.target.checked})} className="rounded" /> Make in India
                </label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating || !form.title}>
                {creating ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Creating...</> : 'Create tender'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tenders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tender list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText size={32} className="mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No tenders found</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => {
            const status = statusMap[t.status] || { label: t.status, class: 'status-muted' }
            const deadline = t.deadline ? new Date(t.deadline) : null
            const isExpired = deadline && deadline < new Date()
            return (
              <Card key={t.id} className="hover:border-border/80 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold leading-snug pr-4">{t.title}</h3>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${status.class}`}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Building2 size={12} /> {t.department || 'General'}</span>
                    {deadline && (
                      <span className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : ''}`}>
                        <Calendar size={12} /> {deadline.toLocaleDateString()}
                      </span>
                    )}
                    {t.bid_count != null && (
                      <span className="flex items-center gap-1">
                        <FileText size={12} /> {t.bid_count} bid{t.bid_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  {t.required_documents?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {t.required_documents.slice(0, 5).map((d: string) => (
                        <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{d.replace(/_/g, ' ')}</span>
                      ))}
                      {t.required_documents.length > 5 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">+{t.required_documents.length - 5}</span>}
                    </div>
                  )}
                  {/* Status change + actions */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                    {t.status === 'draft' && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 text-emerald-400 hover:text-emerald-300"
                        onClick={() => handleStatusChange(t.id, 'published')}>
                        <Check size={10} /> Publish
                      </Button>
                    )}
                    {t.status === 'published' && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 text-amber-400 hover:text-amber-300"
                        onClick={() => handleStatusChange(t.id, 'evaluation')}>
                        Evaluation
                      </Button>
                    )}
                    {t.status === 'evaluation' && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 text-emerald-400 hover:text-emerald-300"
                          onClick={() => handleStatusChange(t.id, 'awarded')}>
                          Award
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 text-red-400 hover:text-red-300"
                          onClick={() => handleStatusChange(t.id, 'cancelled')}>
                          Cancel
                        </Button>
                      </>
                    )}
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                      onClick={() => navigate(`/officer/compliance`)}>
                      Review bids
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
