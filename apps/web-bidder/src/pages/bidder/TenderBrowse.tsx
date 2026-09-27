import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileText, Clock, ArrowUpRight, Filter, IndianRupee } from 'lucide-react'

type Tender = {
  id: string
  reference_number: string
  title: string
  department: string
  description?: string
  tender_type?: string
  currency_type?: string
  estimated_value?: number
  emd_amount?: number
  submission_deadline?: string
  status?: string
  make_in_india?: boolean
  msme_exemption?: boolean
  created_at?: string
}

export default function TenderBrowse() {
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'expired'>('all')
  const [sortOption, setSortOption] = useState<'newest' | 'deadline' | 'value_high' | 'value_low'>('newest')

  useEffect(() => {
    api.get('/tenders')
      .then(r => setTenders(r.data.items || r.data || []))
      .catch(err => console.error('Error fetching tenders:', err))
      .finally(() => setLoading(false))
  }, [])

  // Derived stats
  const openCount = tenders.filter(t => t.status?.toLowerCase() === 'open' || !t.status).length
  const expiredCount = tenders.filter(t => {
    if (t.status?.toLowerCase() === 'expired') return true
    if (t.submission_deadline && new Date(t.submission_deadline).getTime() < Date.now()) return true
    return false
  }).length

  // Filter logic
  const filtered = tenders.filter(t => {
    const matchesSearch = 
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_number?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    const isExpired = t.submission_deadline && new Date(t.submission_deadline).getTime() < Date.now()
    const status = t.status?.toLowerCase() || 'open'

    if (statusFilter === 'open') {
      return status === 'open' && !isExpired
    }
    if (statusFilter === 'closed') {
      return status === 'closed'
    }
    if (statusFilter === 'expired') {
      return status === 'expired' || isExpired
    }

    return true
  })

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === 'deadline') {
      const dateA = a.submission_deadline ? new Date(a.submission_deadline).getTime() : Infinity
      const dateB = b.submission_deadline ? new Date(b.submission_deadline).getTime() : Infinity
      return dateA - dateB
    }
    if (sortOption === 'value_high') {
      const valA = a.estimated_value || 0
      const valB = b.estimated_value || 0
      return valB - valA
    }
    if (sortOption === 'value_low') {
      const valA = a.estimated_value || 0
      const valB = b.estimated_value || 0
      return valA - valB
    }
    // Newest
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
    return dateB - dateA
  })

  function getTimeLeft(deadline?: string) {
    if (!deadline) return 'No deadline'
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / 86400000)
    if (days > 0) return `${days}d left`
    const hrs = Math.floor(diff / 3600000)
    if (hrs > 0) return `${hrs}h left`
    const mins = Math.floor(diff / 60000)
    return `${mins}m left`
  }

  function isTenderExpired(deadline?: string) {
    if (!deadline) return false
    return new Date(deadline).getTime() < Date.now()
  }

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Browse Government Tenders</h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <span>{tenders.length} Total</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-emerald-500 font-medium">{openCount} Open</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-destructive font-medium">{expiredCount} Expired</span>
          </p>
        </div>
      </div>

      {/* Controls Area */}
      <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by title, ref, or department..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 w-full bg-background" 
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
            <Filter size={16} className="text-muted-foreground hidden sm:block mr-1" />
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setStatusFilter('all')}
              className="rounded-full"
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'open' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setStatusFilter('open')}
              className="rounded-full"
            >
              Open
            </Button>
            <Button 
              variant={statusFilter === 'closed' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setStatusFilter('closed')}
              className="rounded-full"
            >
              Closed
            </Button>
            <Button 
              variant={statusFilter === 'expired' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setStatusFilter('expired')}
              className="rounded-full"
            >
              Expired
            </Button>
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <select 
              value={sortOption}
              onChange={e => setSortOption(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Deadline (Soonest)</option>
              <option value="value_high">Value (Highest)</option>
              <option value="value_low">Value (Lowest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Area */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden border-border/50">
              <CardHeader className="pb-4">
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-7 w-3/4 mb-2" />
                <Skeleton className="h-5 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex justify-between pt-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed border-2 bg-background/50">
          <CardContent className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No tenders match your search</h3>
            <p className="text-muted-foreground max-w-md">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setSortOption('newest')
              }}
            >
              Clear all filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sorted.map(t => {
            const expired = isTenderExpired(t.submission_deadline)
            const resolvedStatus = expired ? 'expired' : (t.status?.toLowerCase() || 'open')
            
            return (
              <Card key={t.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow border-border/60 bg-card/50">
                <div className="p-6 flex-1 flex flex-col">
                  {/* Card Header Row */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-sm font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {t.reference_number || 'NO-REF'}
                    </span>
                    <Badge 
                      variant={resolvedStatus === 'open' ? 'default' : resolvedStatus === 'expired' ? 'destructive' : 'secondary'}
                      className="uppercase tracking-wider text-[10px]"
                    >
                      {resolvedStatus}
                    </Badge>
                  </div>

                  {/* Title & Dept */}
                  <h3 className="text-xl font-bold leading-tight mb-2 line-clamp-2" title={t.title}>
                    {t.title || 'Untitled Tender'}
                  </h3>
                  <p className="text-sm text-primary font-medium mb-4">
                    {t.department || 'Unknown Department'}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-3">
                    {t.description || 'No description provided for this tender.'}
                  </p>

                  {/* Badges */}
                  {(t.make_in_india || t.msme_exemption) && (
                    <div className="flex gap-2 mb-6">
                      {t.make_in_india && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Make in India</Badge>}
                      {t.msme_exemption && <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">MSME Exempt</Badge>}
                    </div>
                  )}

                  <div className="mt-auto">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-4 rounded-lg bg-secondary/30 border border-border/50 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tender Type</p>
                        <p className="text-sm font-medium capitalize">{t.tender_type || '---'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Denomination</p>
                        <p className="text-sm font-medium">{t.currency_type || 'INR'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center">
                          <IndianRupee size={12} className="mr-1" /> Est. Value
                        </p>
                        <p className="text-sm font-medium">
                          {t.estimated_value ? `₹${t.estimated_value.toLocaleString()}` : '---'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center">
                          <IndianRupee size={12} className="mr-1" /> EMD Amount
                        </p>
                        <p className="text-sm font-medium">
                          {t.emd_amount ? `₹${t.emd_amount.toLocaleString()}` : '---'}
                        </p>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className={`p-2 rounded-md ${expired ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Submission Deadline</p>
                        <p className={`text-sm font-semibold ${expired ? 'text-destructive' : 'text-foreground'}`}>
                          {t.submission_deadline ? new Date(t.submission_deadline).toLocaleString() : '---'}
                          <span className="ml-2 font-normal opacity-80">({getTimeLeft(t.submission_deadline)})</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Button 
                    variant="ghost" 
                    className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/bidder/tenders/${t.id}`)}
                  >
                    View Full Details <ArrowUpRight size={16} className="ml-2" />
                  </Button>
                  <Button 
                    className="w-full sm:w-auto"
                    disabled={expired || resolvedStatus === 'closed'}
                    onClick={() => navigate(`/bidder/tenders/${t.id}`)} // It says submit bid will be on detail page, but asks for button. Linking to detail is best.
                  >
                    {expired ? 'Expired' : 'Submit Bid'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
