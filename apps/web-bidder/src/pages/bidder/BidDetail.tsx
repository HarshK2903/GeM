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

          {/* ─── Bidding Stage Pipeline ─── */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tender Bidding Stage</CardTitle></CardHeader>
            <CardContent className="pb-5">
              {(() => {
                const STAGES = [
                  { key: 'document_submission', label: 'Document Submission', description: 'Upload required certificates & documents' },
                  { key: 'document_verification', label: 'Document Verification', description: 'OCR extraction & registry cross-checks' },
                  { key: 'technical_evaluation', label: 'Technical Evaluation', description: 'Technical bid scoring & compliance review' },
                  { key: 'financial_evaluation', label: 'Financial Evaluation', description: 'Financial bids opened & L1 ranking' },
                  { key: 'award_decision', label: 'Award Decision', description: 'Final approval & tender award' },
                ]

                // Map bid status to active stage index
                let activeIdx = 0
                const hasScore = compliance && compliance.overall_score != null && compliance.overall_score > 0
                if (bidStatus === 'approved' || bidStatus === 'rejected') activeIdx = 4
                else if (hasScore && (bidStatus === 'under_review')) activeIdx = 3
                else if (hasScore) activeIdx = 2
                else if (bidStatus === 'ai_processing') activeIdx = 1
                else if (bidStatus === 'submitted') activeIdx = 1
                else activeIdx = 0

                return (
                  <div className="relative flex items-start justify-between">
                    {/* Track bg */}
                    <div className="absolute top-[18px] left-[24px] right-[24px] h-[2px] bg-border z-0" />
                    {/* Track filled */}
                    <div className="absolute top-[18px] left-[24px] h-[2px] z-[1] transition-all duration-1000 ease-out"
                      style={{
                        width: `${(activeIdx / (STAGES.length - 1)) * 100}%`,
                        maxWidth: 'calc(100% - 48px)',
                        backgroundColor: bidStatus === 'rejected' ? 'oklch(0.60 0.20 25)' : 'oklch(0.65 0.18 150)'
                      }}
                    />

                    {STAGES.map((stage, idx) => {
                      const isCompleted = idx < activeIdx
                      const isCurrent = idx === activeIdx
                      const isRejectedFinal = isCurrent && bidStatus === 'rejected'

                      return (
                        <div key={stage.key} className="relative z-10 flex flex-col items-center text-center" style={{ width: `${100 / STAGES.length}%` }}>
                          <div className={`
                            w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500
                            ${isRejectedFinal
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : isCompleted
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : isCurrent
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                                  : 'bg-card border-border text-muted-foreground'
                            }
                          `}>
                            {isRejectedFinal
                              ? <XCircle size={16} />
                              : isCompleted
                                ? <CheckCircle size={16} />
                                : isCurrent && bidStatus === 'approved'
                                  ? <CheckCircle size={16} />
                                  : <span className="text-xs font-bold">{idx + 1}</span>
                            }
                          </div>
                          <p className={`text-[11px] font-medium mt-2 leading-tight transition-colors duration-300 ${
                            isRejectedFinal ? 'text-red-400' : isCurrent ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {stage.label}
                          </p>
                          {isCurrent && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[130px] leading-tight">
                              {isRejectedFinal ? 'Bid was not accepted' : bidStatus === 'approved' ? 'Bid has been approved!' : stage.description}
                            </p>
                          )}
                          {isCurrent && !isRejectedFinal && bidStatus !== 'approved' && (
                            <div className="mt-1.5 flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                              </span>
                              LIVE
                            </div>
                          )}
                          {isCurrent && bidStatus === 'approved' && (
                            <div className="mt-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              ✓ AWARDED
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
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
