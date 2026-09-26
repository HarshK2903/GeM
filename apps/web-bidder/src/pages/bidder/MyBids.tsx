import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { FileCheck, Search, Clock, ArrowRight, Loader2, Filter } from 'lucide-react'

const statusBadge: Record<string, { label: string; class: string }> = {
  submitted: { label: 'Submitted', class: 'status-info' },
  under_review: { label: 'Under review', class: 'status-warning' },
  approved: { label: 'Approved', class: 'status-success' },
  rejected: { label: 'Rejected', class: 'status-danger' },
  ai_processing: { label: 'AI Processing', class: 'status-info' },
  clarification: { label: 'Clarification', class: 'status-warning' },
  withdrawn: { label: 'Withdrawn', class: 'status-muted' },
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

export default function MyBids() {
  const navigate = useNavigate()
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/bids/my').then(r => setBids(r.data.items || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = bids.filter(bid => {
    if (filter === 'pending') return ['submitted', 'under_review', 'ai_processing'].includes(bid.status)
    if (filter === 'approved') return bid.status === 'approved'
    if (filter === 'rejected') return bid.status === 'rejected'
    return true
  }).filter(bid => {
    if (!search) return true
    return (bid.tender_title || '').toLowerCase().includes(search.toLowerCase())
  })

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: bids.length },
    { key: 'pending', label: 'Pending', count: bids.filter(b => ['submitted', 'under_review', 'ai_processing'].includes(b.status)).length },
    { key: 'approved', label: 'Approved', count: bids.filter(b => b.status === 'approved').length },
    { key: 'rejected', label: 'Rejected', count: bids.filter(b => b.status === 'rejected').length },
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Bids</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bids.length} total bids submitted</p>
        </div>
        <Button size="sm" onClick={() => navigate('/bidder/tenders')}>
          Browse tenders <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary">
          {filters.map(f => (
            <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'ghost'}
              className="h-7 text-xs px-3 gap-1.5" onClick={() => setFilter(f.key)}>
              {f.label}
              <span className="text-[10px] opacity-70">{f.count}</span>
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search bids..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
      </div>

      {/* Bids List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <FileCheck size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {bids.length === 0 ? 'No bids submitted yet' : 'No bids match your filter'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bids.length === 0 ? 'Browse available tenders to submit your first bid' : 'Try changing your filter criteria'}
            </p>
            {bids.length === 0 && (
              <Button size="sm" className="mt-4" onClick={() => navigate('/bidder/tenders')}>
                Browse tenders
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((bid, i) => {
            const s = statusBadge[bid.status] || { label: bid.status, class: 'status-muted' }
            const isProcessing = bid.status === 'ai_processing'
            return (
              <Card key={bid.id || i}
                className="cursor-pointer hover:border-border/80 transition-all duration-200 hover:shadow-lg hover:shadow-black/5"
                onClick={() => navigate(`/bidder/bids/${bid.id}`)}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold leading-snug pr-4 line-clamp-2">
                      {bid.tender_title || 'Tender Bid'}
                    </h3>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${s.class}`}>
                      {isProcessing && <Loader2 size={10} className="mr-1 animate-spin" />}
                      {s.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {bid.submitted_at ? new Date(bid.submitted_at).toLocaleDateString() : 'Recently'}
                    </span>
                    {bid.bid_amount && (
                      <span className="font-mono">₹{Number(bid.bid_amount).toLocaleString()}</span>
                    )}
                  </div>

                  {/* Compliance score bar */}
                  {bid.compliance_score != null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Compliance</span>
                        <span className={`text-xs font-mono font-semibold ${
                          bid.compliance_score >= 75 ? 'text-emerald-400' :
                          bid.compliance_score >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>{bid.compliance_score.toFixed(0)}/100</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                          width: `${bid.compliance_score}%`,
                          backgroundColor: bid.compliance_score >= 75 ? 'oklch(0.65 0.18 150)' : bid.compliance_score >= 50 ? 'oklch(0.75 0.15 80)' : 'oklch(0.60 0.20 25)'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--gem-blue)]/10 border border-[var(--gem-blue)]/20">
                      <div className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[11px] text-[var(--gem-blue)]">AI pipeline running...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
