import { useEffect, useState } from 'react'
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
  ShieldCheck, CheckCircle, XCircle, MessageSquare, Loader2,
  Play, AlertTriangle, ArrowRight
} from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

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

export default function ComplianceReview() {
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.addToast)
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTender, setSelectedTender] = useState<string>('')
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bidsLoading, setBidsLoading] = useState(false)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null)

  useEffect(() => {
    api.get('/tenders').then(r => {
      const items = r.data.items || []
      setTenders(items)
      if (items.length > 0) { setSelectedTender(items[0].id); loadBids(items[0].id) }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function loadBids(tenderId: string) {
    setBidsLoading(true)
    try {
      const { data } = await api.get(`/tenders/${tenderId}/bids`)
      setBids(data.items || data.bids || [])
    } catch { setBids([]) }
    finally { setBidsLoading(false) }
  }

  async function handleDecision(bidId: string, decision: string) {
    setDeciding(bidId)
    try {
      await api.post(`/bids/${bidId}/decision`, { decision, justification: `Officer ${decision} — compliance review` })
      addToast({ type: 'success', title: `Bid ${decision}ed`, description: 'Decision recorded successfully' })
      loadBids(selectedTender)
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
      // Reload after a delay to get updated status
      setTimeout(() => loadBids(selectedTender), 2000)
    } catch (err) {
      addToast({ type: 'error', title: 'Pipeline failed', description: 'Could not start AI pipeline' })
    }
    finally { setRunningPipeline(null) }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance review</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review AI-scored bids and make decisions</p>
      </div>

      {/* Tender selector */}
      {loading ? <Skeleton className="h-10 w-64" /> : (
        <div className="flex gap-2 flex-wrap">
          {tenders.map(t => (
            <Button key={t.id} size="sm"
              variant={selectedTender === t.id ? 'default' : 'outline'}
              onClick={() => { setSelectedTender(t.id); loadBids(t.id) }}
              className="text-xs">
              {t.title?.slice(0, 30)}{t.title?.length > 30 ? '...' : ''}
            </Button>
          ))}
        </div>
      )}

      {/* Bids table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Bids {bids.length > 0 && `(${bids.length})`}
          </CardTitle>
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
                  <TableHead>Bidder</TableHead>
                  <TableHead>Organization</TableHead>
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

                  return (
                    <TableRow key={bid.id} className="group">
                      <TableCell className="font-medium text-sm">{bid.bidder_name || bid.bidder_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{bid.organization || '—'}</TableCell>
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
                          {/* Run Pipeline button for bids without scores */}
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
    </div>
  )
}
