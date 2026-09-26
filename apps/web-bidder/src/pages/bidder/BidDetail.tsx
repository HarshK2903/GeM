import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { BidPipelineTracker } from '@/components/pipeline/BidPipelineTracker'
import {
  ArrowLeft, Clock, FileText, ShieldCheck, AlertTriangle, CheckCircle,
  XCircle, Loader2, FileSearch, BarChart3, MessageSquare, Info
} from 'lucide-react'

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  submitted: { label: 'Submitted', class: 'status-info', icon: Clock },
  ai_processing: { label: 'AI Processing', class: 'status-info', icon: Loader2 },
  under_review: { label: 'Under Review', class: 'status-warning', icon: FileSearch },
  approved: { label: 'Approved', class: 'status-success', icon: CheckCircle },
  rejected: { label: 'Rejected', class: 'status-danger', icon: XCircle },
  clarification: { label: 'Clarification Needed', class: 'status-warning', icon: MessageSquare },
  withdrawn: { label: 'Withdrawn', class: 'status-muted', icon: XCircle },
}

function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label: string }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? 'oklch(0.65 0.18 150)' : score >= 50 ? 'oklch(0.75 0.15 80)' : score >= 25 ? 'oklch(0.70 0.15 50)' : 'oklch(0.60 0.20 25)'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.20 0.01 260)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-base font-bold font-mono" style={{ color }}>{score.toFixed(0)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? 'oklch(0.65 0.18 150)' : score >= 50 ? 'oklch(0.75 0.15 80)' : score >= 25 ? 'oklch(0.70 0.15 50)' : 'oklch(0.60 0.20 25)'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-mono font-medium" style={{ color }}>{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function BidDetail() {
  const { bidId } = useParams<{ bidId: string }>()
  const navigate = useNavigate()
  const [compliance, setCompliance] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bidInfo, setBidInfo] = useState<any>(null)

  useEffect(() => { if (bidId) fetchData() }, [bidId])

  async function fetchData() {
    setLoading(true)
    try {
      const [compRes, docsRes, bidsRes] = await Promise.all([
        api.get(`/bids/${bidId}/compliance`).catch(() => ({ data: null })),
        api.get(`/bids/${bidId}/documents`).catch(() => ({ data: { documents: [] } })),
        api.get('/bids/my').catch(() => ({ data: { items: [] } })),
      ])
      setCompliance(compRes.data)
      setDocuments(docsRes.data?.documents || docsRes.data?.items || [])
      const myBid = (bidsRes.data?.items || []).find((b: any) => b.id === bidId)
      setBidInfo(myBid || null)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const verificationBadge: Record<string, { label: string; class: string }> = {
    verified: { label: 'Verified', class: 'status-success' },
    mismatch: { label: 'Mismatch', class: 'status-warning' },
    expired: { label: 'Expired', class: 'status-danger' },
    failed: { label: 'Failed', class: 'status-danger' },
    pending: { label: 'Pending', class: 'status-muted' },
    not_found: { label: 'Not found', class: 'status-muted' },
    processing: { label: 'Processing', class: 'status-info' },
  }

  const bidStatus = bidInfo?.status || 'submitted'
  const sc = statusConfig[bidStatus] || statusConfig.submitted

  // Status timeline steps
  const timelineSteps = [
    { key: 'submitted', label: 'Submitted', icon: FileText },
    { key: 'ai_processing', label: 'AI Processing', icon: BarChart3 },
    { key: 'under_review', label: 'Under Review', icon: FileSearch },
    { key: 'decision', label: bidStatus === 'approved' ? 'Approved' : bidStatus === 'rejected' ? 'Rejected' : 'Decision Pending', icon: bidStatus === 'approved' ? CheckCircle : bidStatus === 'rejected' ? XCircle : Clock },
  ]
  const stepOrder = ['submitted', 'ai_processing', 'under_review', 'approved', 'rejected', 'clarification']
  const currentIndex = stepOrder.indexOf(bidStatus)

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft size={14} /> Back
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{bidInfo?.tender_title || 'Bid Details'}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted {bidInfo?.submitted_at ? new Date(bidInfo.submitted_at).toLocaleString() : 'recently'}
          </p>
        </div>
        <Badge variant="outline" className={`text-xs ${sc.class}`}>{sc.label}</Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        </div>
      ) : (
        <>
          {/* Pipeline Status */}
          {bidStatus === 'ai_processing' && bidId && (
            <BidPipelineTracker bidId={bidId} mode="live" onComplete={() => fetchData()} />
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Bid Lifecycle</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {timelineSteps.map((step, i) => {
                  const isComplete = i <= Math.min(currentIndex, 2)
                  const isCurrent = (i === currentIndex) || (i === 3 && currentIndex >= 3)
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center gap-2 relative">
                      {i > 0 && (
                        <div className={`absolute top-4 -left-1/2 w-full h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-secondary'}`} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                        isCurrent ? 'border-[var(--gem-blue)] bg-[var(--gem-blue)]/20 text-[var(--gem-blue)]' :
                        isComplete ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                        'border-secondary bg-secondary text-muted-foreground'
                      } ${isCurrent && bidStatus === 'ai_processing' ? 'animate-pulse' : ''}`}>
                        <step.icon size={14} />
                      </div>
                      <span className={`text-xs ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Results */}
          {compliance && compliance.overall_score != null && (
            <>
              {/* Scores */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Compliance Scores</CardTitle>
                    <Badge variant="outline" className={`text-xs ${
                      compliance.risk_level === 'low' ? 'status-success' :
                      compliance.risk_level === 'medium' ? 'status-warning' :
                      compliance.risk_level === 'high' ? 'status-danger' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {(compliance.risk_level || 'medium').toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Overall score prominent display */}
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border">
                    <div className="relative">
                      <ScoreRing score={compliance.overall_score} size={80} label="" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Compliance Score</p>
                      <p className="text-3xl font-bold font-mono" style={{
                        color: compliance.overall_score >= 75 ? 'oklch(0.65 0.18 150)' : compliance.overall_score >= 50 ? 'oklch(0.75 0.15 80)' : 'oklch(0.60 0.20 25)'
                      }}>{compliance.overall_score.toFixed(1)}</p>
                      {compliance.pipeline_duration_ms && (
                        <p className="text-xs text-muted-foreground mt-1">Processed in {(compliance.pipeline_duration_ms / 1000).toFixed(1)}s</p>
                      )}
                    </div>
                  </div>

                  {/* Sub-scores */}
                  <div className="space-y-3">
                    <ScoreBar label="Eligibility" score={compliance.eligibility_score || 0} />
                    <ScoreBar label="Compliance" score={compliance.compliance_score || 0} />
                    <ScoreBar label="Risk" score={compliance.risk_score || 0} />
                    <ScoreBar label="Completeness" score={compliance.completeness_score || 0} />
                    <ScoreBar label="Quality" score={compliance.quality_score || 0} />
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendation */}
              {compliance.ai_recommendation && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">AI Recommendation</CardTitle></CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{compliance.ai_recommendation}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 px-1">
                      <Info size={12} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-[11px] text-muted-foreground">This is an AI-generated assessment. The final decision rests with the procurement officer.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* No compliance yet */}
          {(!compliance || compliance.overall_score == null) && bidStatus !== 'ai_processing' && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Awaiting AI analysis</p>
                <p className="text-xs text-muted-foreground mt-1">The compliance analysis will begin shortly after an officer triggers the pipeline.</p>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Submitted Documents ({documents.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documents.map((doc: any, i: number) => {
                    const vb = verificationBadge[doc.verification_status] || verificationBadge.pending
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.original_filename || doc.doc_type}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${vb.class}`}>{vb.label}</Badge>
                            {doc.ocr_confidence != null && (
                              <span className="text-[10px] text-muted-foreground font-mono">{(doc.ocr_confidence * 100).toFixed(0)}% OCR</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
