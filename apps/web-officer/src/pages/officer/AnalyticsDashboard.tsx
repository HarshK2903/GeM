import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, PieChart, Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

// Fallback data used when analytics API is not yet available
const FALLBACK_SUMMARY = { total_tenders: 5, total_bids: 12, avg_compliance_score: 72.4, avg_pipeline_duration_ms: 8200 }
const FALLBACK_DEPTS = [
  { department: 'Defence', avg_score: 78.5, total_bids: 4, approved: 2, rejected: 1 },
  { department: 'Renewable Energy', avg_score: 71.2, total_bids: 3, approved: 1, rejected: 0 },
  { department: 'Electronics & IT', avg_score: 82.1, total_bids: 2, approved: 2, rejected: 0 },
  { department: 'General Admin', avg_score: 65.8, total_bids: 2, approved: 1, rejected: 1 },
  { department: 'Health & Welfare', avg_score: 55.3, total_bids: 1, approved: 0, rejected: 0 },
]
const FALLBACK_RISKS = [
  { risk_level: 'low', count: 5, percentage: 42 },
  { risk_level: 'medium', count: 4, percentage: 33 },
  { risk_level: 'high', count: 2, percentage: 17 },
  { risk_level: 'critical', count: 1, percentage: 8 },
]
const FALLBACK_REQUIREMENTS = [
  { requirement: 'MSME/Udyam', met: 8, partial: 2, unmet: 2 },
  { requirement: 'GST Compliance', met: 10, partial: 1, unmet: 1 },
  { requirement: 'PAN Verification', met: 11, partial: 0, unmet: 1 },
  { requirement: 'Make in India', met: 5, partial: 3, unmet: 4 },
  { requirement: 'Financial Turnover', met: 6, partial: 2, unmet: 4 },
  { requirement: 'Blacklist Check', met: 11, partial: 0, unmet: 1 },
]
const FALLBACK_DIMS = { eligibility: 75.2, compliance: 82.1, risk: 68.5, completeness: 79.3, quality: 71.0, overall: 72.4 }

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month')
  const [loading, setLoading] = useState(true)
  const [usingSample, setUsingSample] = useState(false)

  const [summary, setSummary] = useState<any>(null)
  const [deptStats, setDeptStats] = useState<any[]>([])
  const [riskDist, setRiskDist] = useState<any[]>([])
  const [reqCompliance, setReqCompliance] = useState<any[]>([])
  const [scoreDims, setScoreDims] = useState<any>(null)

  useEffect(() => { fetchAnalytics() }, [period])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const [sumRes, deptRes, riskRes, reqRes, dimRes] = await Promise.all([
        api.get(`/analytics/summary?period=${period}`),
        api.get(`/analytics/department-stats?period=${period}`),
        api.get(`/analytics/risk-distribution?period=${period}`),
        api.get(`/analytics/requirement-compliance?period=${period}`),
        api.get(`/analytics/score-dimensions?period=${period}`),
      ])
      setSummary(sumRes.data)
      setDeptStats(deptRes.data || [])
      setRiskDist(riskRes.data || [])
      setReqCompliance(reqRes.data || [])
      setScoreDims(dimRes.data)
      setUsingSample(false)
    } catch {
      // Graceful fallback to sample data
      setSummary(FALLBACK_SUMMARY)
      setDeptStats(FALLBACK_DEPTS)
      setRiskDist(FALLBACK_RISKS)
      setReqCompliance(FALLBACK_REQUIREMENTS)
      setScoreDims(FALLBACK_DIMS)
      setUsingSample(true)
    } finally { setLoading(false) }
  }

  const riskColors: Record<string, string> = {
    low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-red-400', critical: 'bg-red-600'
  }

  const dimensionLabels: Record<string, string> = {
    eligibility: 'Eligibility', compliance: 'Compliance', risk: 'Risk',
    completeness: 'Completeness', quality: 'Quality', overall: 'Overall'
  }

  const summaryCards = [
    { label: 'Total tenders', value: summary?.total_tenders ?? 0, icon: BarChart3, color: 'text-blue-400' },
    { label: 'Total bids', value: summary?.total_bids ?? 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Avg. compliance', value: `${(summary?.avg_compliance_score ?? 0).toFixed(1)}%`, icon: PieChart, color: 'text-violet-400' },
    { label: 'Avg. processing', value: `${((summary?.avg_pipeline_duration_ms ?? 0) / 1000).toFixed(1)}s`, icon: Activity, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Compliance insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchAnalytics} className="gap-1.5">
            <RefreshCw size={14} /> Refresh
          </Button>
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary">
            {(['week', 'month', 'quarter'] as const).map(p => (
              <Button key={p} size="sm" variant={period === p ? 'default' : 'ghost'}
                className="h-7 text-xs px-3" onClick={() => setPeriod(p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {usingSample && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">Using sample data — analytics API pending. Real data will appear once the backend aggregation endpoints are available.</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              {loading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-24" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <s.icon size={18} className={s.color} />
                  </div>
                  <p className="text-2xl font-bold font-mono">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Department performance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : deptStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No department data available</p>
            ) : (
              deptStats.map((d: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{d.department || d.name}</span>
                      <span className="text-xs text-muted-foreground">({d.total_bids || d.bids} bids)</span>
                    </div>
                    <span className="text-sm font-mono font-medium">{(d.avg_score || d.score || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${d.avg_score || d.score || 0}%`,
                        backgroundColor: (d.avg_score || d.score || 0) >= 70 ? 'oklch(0.65 0.18 150)' : (d.avg_score || d.score || 0) >= 50 ? 'oklch(0.75 0.15 80)' : 'oklch(0.60 0.20 25)',
                        animationDelay: `${i * 150}ms`
                      }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Risk distribution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : riskDist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No risk data available</p>
            ) : (
              riskDist.map((r: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${
                        r.risk_level === 'low' ? 'status-success' : r.risk_level === 'medium' ? 'status-warning' :
                        r.risk_level === 'high' ? 'status-danger' : 'bg-red-600/20 text-red-400 border-red-600/30'
                      }`}>{(r.risk_level || r.level || '').toUpperCase()}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{r.count} bids ({r.percentage || r.pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${riskColors[r.risk_level || r.level] || 'bg-gray-500'} transition-all duration-1000`}
                      style={{ width: `${r.percentage || r.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score Dimensions */}
      {scoreDims && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Average scores by dimension</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(dimensionLabels).map(([key, label], i) => {
                const score = scoreDims[key] ?? 0
                return (
                  <div key={key} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className={`text-lg font-mono font-bold ${
                        score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>{score.toFixed(1)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${score}%`,
                          backgroundColor: score >= 75 ? 'oklch(0.65 0.18 150)' : score >= 50 ? 'oklch(0.75 0.15 80)' : 'oklch(0.60 0.20 25)'
                        }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirement Compliance */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Requirement compliance</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {reqCompliance.map((r: any, i: number) => {
                const total = (r.met || 0) + (r.partial || 0) + (r.unmet || 0)
                const metPct = total > 0 ? ((r.met || 0) / total) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm w-36 flex-shrink-0">{r.requirement || r.name}</span>
                    <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${total > 0 ? ((r.met || 0) / total) * 100 : 0}%` }} />
                      <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${total > 0 ? ((r.partial || 0) / total) * 100 : 0}%` }} />
                      <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${total > 0 ? ((r.unmet || 0) / total) * 100 : 0}%` }} />
                    </div>
                    <span className={`text-sm font-mono font-medium w-10 text-right ${metPct >= 75 ? 'text-emerald-400' : metPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {metPct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Met</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-500" /> Partial</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-red-500" /> Unmet</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
