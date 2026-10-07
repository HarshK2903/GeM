import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  ShieldCheck, CheckCircle, XCircle, MessageSquare, Loader2,
  Play, ArrowLeft, ChevronRight, Calendar, IndianRupee, Users,
  UserCheck, TrendingUp, FileText, Search, BarChart3, Award, Check,
  GitCompareArrows, Trophy, AlertTriangle, Minus
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

// ─── Bidding Stages ───

const STAGES = [
  { key: 'document_submission', label: 'Document Submission', icon: FileText, description: 'Bidders upload required certificates & documents' },
  { key: 'document_verification', label: 'Document Verification', icon: Search, description: 'OCR extraction & registry verification' },
  { key: 'technical_evaluation', label: 'Technical Evaluation', icon: BarChart3, description: 'Technical bid scoring & compliance analysis' },
  { key: 'financial_evaluation', label: 'Financial Evaluation', icon: IndianRupee, description: 'Financial bids opened & L1 determination' },
  { key: 'award_decision', label: 'Award Decision', icon: Award, description: 'Final approval & tender award' },
]

function getActiveStage(status: string, bids: any[]): number {
  const hasApproved = bids.some(b => b.status === 'approved')
  const hasScores = bids.some(b => b.compliance_score != null && b.compliance_score > 0)
  const allSubmitted = bids.length > 0 && bids.every(b => b.status !== 'draft')
  const hasUnderReview = bids.some(b => b.status === 'under_review')

  if (status === 'awarded' || status === 'closed') return 4
  if (hasApproved) return 4
  if (status === 'under_evaluation' || status === 'evaluation') {
    if (hasScores) return 3
    return 2
  }
  if (hasScores && hasUnderReview) return 3
  if (hasScores) return 2
  if (allSubmitted && bids.length > 0) return 1
  if (status === 'open' || status === 'published') return 0
  return 0
}

// ─── Badge Maps ───

const statusBadge: Record<string, { label: string; class: string }> = {
  submitted: { label: 'Submitted', class: 'status-info' },
  under_review: { label: 'Review', class: 'status-warning' },
  approved: { label: 'Approved', class: 'status-success' },
  rejected: { label: 'Rejected', class: 'status-danger' },
  ai_processing: { label: 'Processing', class: 'status-info' },
  clarification_needed: { label: 'Clarification', class: 'status-warning' },
  clarification: { label: 'Clarification', class: 'status-warning' },
}

const riskBadge: Record<string, { label: string; class: string }> = {
  low: { label: 'LOW', class: 'status-success' },
  medium: { label: 'MED', class: 'status-warning' },
  high: { label: 'HIGH', class: 'status-danger' },
  critical: { label: 'CRIT', class: 'bg-red-600/20 text-red-400 border-red-600/30' },
}

const tenderStatusBadge: Record<string, { label: string; class: string }> = {
  draft: { label: 'Draft', class: 'status-muted' },
  published: { label: 'Published', class: 'status-info' },
  open: { label: 'Open', class: 'status-success' },
  under_evaluation: { label: 'Evaluation', class: 'status-warning' },
  evaluation: { label: 'Evaluation', class: 'status-warning' },
  awarded: { label: 'Awarded', class: 'status-info' },
  closed: { label: 'Closed', class: 'status-muted' },
  suspended: { label: 'Suspended', class: 'status-danger' },
  cancelled: { label: 'Cancelled', class: 'status-danger' },
}

// ─── Helpers ───

function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDeadlineColor(dateStr: string): string {
  if (!dateStr) return 'text-muted-foreground'
  const now = new Date()
  const deadline = new Date(dateStr)
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'text-red-400'
  if (daysLeft <= 7) return 'text-amber-400'
  return 'text-muted-foreground'
}

function getDeadlineLabel(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const deadline = new Date(dateStr)
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return `Closed ${Math.abs(daysLeft)}d ago`
  if (daysLeft === 0) return 'Closes today'
  if (daysLeft === 1) return 'Closes tomorrow'
  return `${daysLeft}d left`
}

// ─── Compare Bar Component ───

function CompareMetric({ label, values, best, format = 'score', higherIsBetter = true }: {
  label: string; values: (number | null)[]; best: number; format?: 'score' | 'currency' | 'risk'; higherIsBetter?: boolean
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v, i) => {
          const isBest = i === best
          const display = v == null ? '—' : format === 'currency' ? formatCurrency(v) : format === 'risk' ? `${v.toFixed(0)}%` : `${v.toFixed(1)}%`
          const barColor = v == null ? 'bg-secondary' :
            format === 'risk' ? (v <= 20 ? 'bg-emerald-500' : v <= 50 ? 'bg-amber-500' : 'bg-red-500') :
            (v >= 75 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500')

          return (
            <div key={i} className={`rounded-lg border p-3 transition-all duration-300 ${isBest ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 bg-card'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold ${isBest ? 'text-emerald-400' : ''}`}>{display}</span>
                {isBest && <Trophy size={12} className="text-emerald-400" />}
              </div>
              {v != null && format !== 'currency' && (
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${Math.min(v, 100)}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Staggered Fade-In Hook ───

function useStaggeredReveal(count: number, delay = 100) {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(count).fill(false))
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => {
        setRevealed(prev => { const n = [...prev]; n[i] = true; return n })
      }, i * delay))
    }
    return () => timers.forEach(clearTimeout)
  }, [count, delay])
  return revealed
}

// ─── Component ───

export default function ComplianceReview() {
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTender, setSelectedTender] = useState<any | null>(null)
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bidsLoading, setBidsLoading] = useState(false)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null)
  const [highestBids, setHighestBids] = useState<Record<string, number>>({})

  // Compare
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)

  // Dashboard stagger animation
  const dashRevealed = useStaggeredReveal(5, 120)

  useEffect(() => {
    api.get('/tenders').then(async r => {
      const items = r.data.items || []
      setTenders(items)

      const bidMap: Record<string, number> = {}
      await Promise.all(
        items.filter((t: any) => t.bid_count > 0).map(async (t: any) => {
          try {
            const { data } = await api.get(`/tenders/${t.id}/bids`)
            const bidList = data.items || data.bids || []
            if (bidList.length > 0) {
              const highest = Math.max(...bidList.map((b: any) => b.bid_amount || 0))
              bidMap[t.id] = highest
            }
          } catch { /* ignore */ }
        })
      )
      setHighestBids(bidMap)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function selectTender(tender: any) {
    setSelectedTender(tender)
    setCompareIds(new Set())
    setBidsLoading(true)
    try {
      const { data } = await api.get(`/tenders/${tender.id}/bids`)
      setBids(data.items || data.bids || [])
    } catch { setBids([]) }
    finally { setBidsLoading(false) }
  }

  function goBack() {
    setSelectedTender(null)
    setBids([])
    setCompareIds(new Set())
  }

  function toggleCompare(bidId: string) {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(bidId)) next.delete(bidId)
      else next.add(bidId)
      return next
    })
  }

  async function handleDecision(bidId: string, decision: string) {
    setDeciding(bidId)
    try {
      await api.post(`/bids/${bidId}/decision`, { decision, justification: `Officer ${decision} — compliance review` })
      addToast({ type: 'success', title: `Bid ${decision}ed`, description: 'Decision recorded successfully' })
      if (selectedTender) selectTender(selectedTender)
    } catch (err) {
      addToast({ type: 'error', title: 'Decision failed', description: 'Could not record decision' })
    }
    finally { setDeciding(null) }
  }

  async function triggerPipeline(bidId: string) {
    setRunningPipeline(bidId)
    try {
      await api.post(`/bids/${bidId}/pipeline`)
      addToast({ type: 'info', title: 'AI Pipeline Started', description: 'Compliance analysis is now running...' })
      setTimeout(() => { if (selectedTender) selectTender(selectedTender) }, 2000)
    } catch (err) {
      addToast({ type: 'error', title: 'Pipeline failed', description: 'Could not start AI pipeline' })
    }
    finally { setRunningPipeline(null) }
  }

  // Compare data
  const compareBids = useMemo(() => bids.filter(b => compareIds.has(b.id)), [bids, compareIds])

  function getBestIndex(values: (number | null)[], higherIsBetter: boolean): number {
    let best = -1, bestVal: number | null = null
    values.forEach((v, i) => {
      if (v == null) return
      if (bestVal == null || (higherIsBetter ? v > bestVal : v < bestVal)) { best = i; bestVal = v }
    })
    return best
  }

  // ════════════════════════════════════════
  //  TENDER LIST VIEW
  // ════════════════════════════════════════
  if (!selectedTender) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Select a tender to review bids and AI compliance scores</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Tenders {tenders.length > 0 && `(${tenders.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : tenders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No tenders found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bids</TableHead>
                    <TableHead>Highest Bid</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead className="text-right w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenders.map(t => {
                    const ts = tenderStatusBadge[t.status] || { label: t.status, class: 'status-muted' }
                    const highest = highestBids[t.id]
                    const deadlineColor = getDeadlineColor(t.submission_deadline)
                    const deadlineLabel = getDeadlineLabel(t.submission_deadline)

                    return (
                      <TableRow key={t.id} className="group cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => selectTender(t)}>
                        <TableCell className="max-w-[340px]">
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm truncate">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{t.reference_number} · {t.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${ts.class}`}>{ts.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Users size={13} className="text-muted-foreground" />
                            <span className="font-medium">{t.bid_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {highest ? (
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <IndianRupee size={12} className="text-emerald-400" />
                              {formatCurrency(highest)}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No bids</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar size={12} className="text-muted-foreground" />
                              <span>{formatDate(t.submission_deadline)}</span>
                            </div>
                            <p className={`text-[10px] font-medium ${deadlineColor}`}>{deadlineLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors inline-block" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ════════════════════════════════════════
  //  TENDER DETAIL VIEW (Dashboard + Bids)
  // ════════════════════════════════════════

  const totalBidders = bids.length
  const activeBidders = bids.filter(b => b.status !== 'rejected').length
  const bestBid = bids.length > 0
    ? bids.reduce((best, b) => {
        if (!b.bid_amount) return best
        if (!best) return b
        return b.bid_amount < best.bid_amount ? b : best
      }, null as any)
    : null
  const avgScore = bids.filter(b => b.compliance_score > 0).length > 0
    ? bids.filter(b => b.compliance_score > 0).reduce((sum, b) => sum + b.compliance_score, 0) / bids.filter(b => b.compliance_score > 0).length
    : 0

  const activeStageIdx = getActiveStage(selectedTender.status, bids)

  const statCards = [
    {
      label: 'Total Bidders', value: totalBidders, icon: Users, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400',
      sub: `${bids.filter(b => b.status === 'submitted').length} pending review`, valueColor: '',
    },
    {
      label: 'Active Bidders', value: activeBidders, icon: UserCheck, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400',
      sub: `${bids.filter(b => b.status === 'rejected').length} rejected`, valueColor: '',
    },
    {
      label: 'Best Bid (L1)', value: bestBid ? formatCurrency(bestBid.bid_amount) : '—', icon: TrendingUp, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400',
      sub: bestBid ? `by ${bestBid.organization || bestBid.bidder_name}` : 'No bids yet', valueColor: '',
    },
    {
      label: 'Avg. Compliance', value: avgScore > 0 ? `${avgScore.toFixed(1)}%` : '—', icon: ShieldCheck, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400',
      sub: `${bids.filter(b => b.compliance_score > 0).length} of ${totalBidders} scored`,
      valueColor: avgScore >= 70 ? 'text-emerald-400' : avgScore >= 40 ? 'text-amber-400' : avgScore > 0 ? 'text-red-400' : '',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-in" style={{ animationDuration: '300ms' }}>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={goBack}>
          <ArrowLeft size={14} /> Back to tenders
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{selectedTender.title}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
          <span>{selectedTender.reference_number}</span>
          <span>·</span>
          <span>{selectedTender.department}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            Closes {formatDate(selectedTender.submission_deadline)}
          </span>
          {selectedTender.estimated_value && (
            <>
              <span>·</span>
              <span>Est. {formatCurrency(selectedTender.estimated_value)}</span>
            </>
          )}
        </div>
      </div>

      {/* ─── Dashboard Stat Cards (staggered) ─── */}
      {bidsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[104px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <Card key={card.label}
                className="transition-all duration-500 ease-out"
                style={{
                  opacity: dashRevealed[i] ? 1 : 0,
                  transform: dashRevealed[i] ? 'translateY(0)' : 'translateY(16px)',
                }}
              >
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                      <p className={`text-3xl font-bold mt-1 tabular-nums ${card.valueColor}`}>{card.value}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                      <Icon size={20} className={card.iconColor} />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{card.sub}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── Bidding Stage Pipeline (staggered) ─── */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          opacity: dashRevealed[4] ? 1 : 0,
          transform: dashRevealed[4] ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bidding Stage</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="relative flex items-start justify-between">
              {/* Connecting line bg */}
              <div className="absolute top-[18px] left-[24px] right-[24px] h-[2px] bg-border z-0" />
              {/* Connecting line filled */}
              <div className="absolute top-[18px] left-[24px] h-[2px] bg-emerald-500/70 z-[1] transition-all duration-1000 ease-out"
                style={{ width: `${(activeStageIdx / (STAGES.length - 1)) * 100}%`, maxWidth: 'calc(100% - 48px)' }}
              />

              {STAGES.map((stage, idx) => {
                const isCompleted = idx < activeStageIdx
                const isCurrent = idx === activeStageIdx
                const Icon = stage.icon

                return (
                  <div key={stage.key} className="relative z-10 flex flex-col items-center text-center" style={{ width: `${100 / STAGES.length}%` }}>
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500
                      ${isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : isCurrent
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                          : 'bg-card border-border text-muted-foreground'
                      }
                    `}>
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                    </div>
                    <p className={`text-[11px] font-medium mt-2 leading-tight transition-colors duration-300 ${
                      isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                    }`}>
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[140px] leading-tight">
                        {stage.description}
                      </p>
                    )}
                    {isCurrent && (
                      <Badge variant="outline" className="mt-1.5 text-[9px] px-1.5 py-0 status-info">
                        <span className="relative flex h-1.5 w-1.5 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                        LIVE
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Compare Button (floating) ─── */}
      {compareIds.size >= 2 && (
        <div className="sticky top-4 z-30 flex justify-center animate-in" style={{ animationDuration: '200ms' }}>
          <Button
            onClick={() => setShowCompare(true)}
            className="shadow-lg shadow-primary/20 gap-2"
          >
            <GitCompareArrows size={16} />
            Compare {compareIds.size} Bidders
          </Button>
        </div>
      )}

      {/* ─── Bids Table ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Bidders {bids.length > 0 && `(${bids.length})`}
            </CardTitle>
            {bids.filter(b => b.compliance_score > 0).length >= 2 && (
              <p className="text-[11px] text-muted-foreground">Select bidders to compare</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bidsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : bids.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No bids for this tender</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Bid Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Compliance Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.map(bid => {
                  const s = statusBadge[bid.status] || { label: bid.status, class: 'status-muted' }
                  const risk = riskBadge[bid.risk_level] || null
                  const score = bid.compliance_score
                  const hasScore = score != null && score > 0
                  const isPending = bid.status !== 'approved' && bid.status !== 'rejected'
                  const needsPipeline = !hasScore && bid.status === 'submitted'
                  const isL1 = bestBid && bid.id === bestBid.id
                  const isSelected = compareIds.has(bid.id)

                  return (
                    <TableRow key={bid.id} className={`group transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                      {/* Compare checkbox */}
                      <TableCell className="pr-0">
                        {hasScore && (
                          <button
                            onClick={() => toggleCompare(bid.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground scale-110'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {bid.bidder_name || bid.bidder_id?.slice(0, 8)}
                          {isL1 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 status-success">L1</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{bid.organization || '—'}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {bid.bid_amount ? formatCurrency(bid.bid_amount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${s.class}`}>
                          {bid.status === 'ai_processing' && <Loader2 size={10} className="mr-1 animate-spin" />}
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {risk ? (
                          <Badge variant="outline" className={`text-[10px] ${risk.class}`}>{risk.label}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {hasScore ? (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{
                                width: `${score}%`,
                                backgroundColor: score >= 70 ? 'oklch(0.65 0.18 150)' : score >= 40 ? 'oklch(0.75 0.15 80)' : 'oklch(0.60 0.20 25)'
                              }} />
                            </div>
                            <span className={`text-xs font-mono font-medium w-8 text-right ${
                              score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
                            }`}>{score.toFixed(0)}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {needsPipeline && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-[var(--gem-blue)] hover:text-blue-300 gap-1"
                              disabled={runningPipeline === bid.id}
                              onClick={() => triggerPipeline(bid.id)}>
                              {runningPipeline === bid.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                              Run AI
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/officer/compliance/${bid.id}`)}>
                            <ShieldCheck size={12} className="mr-1" /> Details
                          </Button>
                          {isPending && hasScore && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                                disabled={deciding === bid.id} onClick={() => handleDecision(bid.id, 'approve')}>
                                {deciding === bid.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300"
                                disabled={deciding === bid.id} onClick={() => handleDecision(bid.id, 'reject')}>
                                <XCircle size={12} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-400 hover:text-amber-300"
                                disabled={deciding === bid.id} onClick={() => handleDecision(bid.id, 'clarify')}>
                                <MessageSquare size={12} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════ */}
      {/*  COMPARE MODAL                          */}
      {/* ════════════════════════════════════════ */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GitCompareArrows size={20} /> Bidder Comparison
            </DialogTitle>
          </DialogHeader>

          {compareBids.length >= 2 && (
            <div className="space-y-6 mt-2">
              {/* Bidder headers */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${compareBids.length}, 1fr)` }}>
                {compareBids.map((bid, i) => {
                  const isL1 = bestBid && bid.id === bestBid.id
                  return (
                    <div key={bid.id} className={`rounded-lg border p-4 text-center transition-all ${isL1 ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50'}`}>
                      <p className="font-semibold text-sm">{bid.bidder_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{bid.organization}</p>
                      {isL1 && (
                        <Badge variant="outline" className="mt-2 text-[10px] status-success">
                          <Trophy size={10} className="mr-1" /> L1 Bidder
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bid Amount */}
              <CompareMetric
                label="Bid Amount"
                values={compareBids.map(b => b.bid_amount || null)}
                best={getBestIndex(compareBids.map(b => b.bid_amount || null), false)}
                format="currency"
                higherIsBetter={false}
              />

              {/* Overall Compliance */}
              <CompareMetric
                label="Overall Compliance Score"
                values={compareBids.map(b => b.compliance_score || null)}
                best={getBestIndex(compareBids.map(b => b.compliance_score || null), true)}
              />

              {/* Risk (lower is better) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Level</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${compareBids.length}, 1fr)` }}>
                  {compareBids.map(bid => {
                    const r = riskBadge[bid.risk_level]
                    const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
                    const isLowestRisk = compareBids.every(other =>
                      (riskOrder[bid.risk_level] || 5) <= (riskOrder[other.risk_level] || 5)
                    )
                    return (
                      <div key={bid.id} className={`rounded-lg border p-3 text-center transition-all ${isLowestRisk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 bg-card'}`}>
                        <div className="flex items-center justify-center gap-2">
                          {r ? (
                            <Badge variant="outline" className={`text-xs ${r.class}`}>{r.label}</Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                          {isLowestRisk && <Trophy size={12} className="text-emerald-400" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Status</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${compareBids.length}, 1fr)` }}>
                  {compareBids.map(bid => {
                    const s = statusBadge[bid.status] || { label: bid.status, class: 'status-muted' }
                    return (
                      <div key={bid.id} className="rounded-lg border border-border/50 bg-card p-3 text-center">
                        <Badge variant="outline" className={`text-xs ${s.class}`}>{s.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Verdict */}
              <Card className="bg-secondary/30 border-dashed">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Award size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">AI Recommendation</p>
                      {(() => {
                        // Pick best overall: highest compliance, lowest risk, lowest price
                        const scored = compareBids.filter(b => b.compliance_score > 0)
                        if (scored.length === 0) return <p className="text-xs text-muted-foreground">Insufficient data for recommendation.</p>
                        const best = scored.reduce((a, b) => {
                          const aScore = (a.compliance_score || 0) * 0.5 - (a.bid_amount || Infinity) * 0.000000003
                          const bScore = (b.compliance_score || 0) * 0.5 - (b.bid_amount || Infinity) * 0.000000003
                          return bScore > aScore ? b : a
                        })
                        const riskLabel = best.risk_level?.toUpperCase() || 'N/A'
                        return (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <span className="text-emerald-400 font-medium">{best.organization || best.bidder_name}</span> shows the
                            strongest overall profile with a compliance score of <span className="font-medium text-foreground">{best.compliance_score?.toFixed(1)}%</span>,
                            {' '}<span className="font-medium text-foreground">{riskLabel}</span> risk,
                            and a bid of <span className="font-medium text-foreground">{best.bid_amount ? formatCurrency(best.bid_amount) : '—'}</span>.
                            {best.id === bestBid?.id && ' This bidder is also the L1 (lowest) bidder.'}
                          </p>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
