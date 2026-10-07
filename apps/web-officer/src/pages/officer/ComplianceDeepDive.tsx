import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, FileText, Shield, Brain, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { PipelineProgressView } from '@/components/pipeline/PipelineProgressView'
import type { PipelineStep } from '@/components/pipeline/PipelineProgressView'

interface ComplianceData {
  overall_score: number; eligibility_score: number; compliance_score: number;
  risk_score: number; completeness_score: number; quality_score: number;
  risk_level: string; ai_recommendation: string | null; reasoning_trace: string | null;
  pipeline_duration_ms: number | null; generated_at: string;
}

interface DocInfo { id: string; doc_type: string; original_filename: string; verification_status: string | null; ocr_confidence: number | null; uploaded_at: string }

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

const riskBadge: Record<string, string> = { low: 'status-success', medium: 'status-warning', high: 'status-danger', critical: 'status-danger' }
const verColor: Record<string, string> = { verified: 'text-emerald-400', mismatch: 'text-amber-400', expired: 'text-red-400', not_found: 'text-muted-foreground', pending: 'text-muted-foreground' }

export default function ComplianceDeepDive() {
  const { bidId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<ComplianceData | null>(null)
  const [docs, setDocs] = useState<DocInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showTrace, setShowTrace] = useState(false)
  const [showJustification, setShowJustification] = useState(false)
  const [justification, setJustification] = useState('')
  const [pendingAction, setPendingAction] = useState<string>('')
  const [actionTaken, setActionTaken] = useState<string | null>(null)

  useEffect(() => { if (bidId) load() }, [bidId])

  async function load() {
    setLoading(true)
    try {
      const [c, d] = await Promise.all([
        api.get(`/bids/${bidId}/compliance`).catch(() => null),
        api.get(`/bids/${bidId}/documents`).catch(() => ({ data: { items: [] } })),
      ])
      if (c) setData(c.data)
      setDocs(d?.data?.items || [])
    } catch {} finally { setLoading(false) }
  }

  async function handleAction(decision: string) {
    try {
      await api.post(`/bids/${bidId}/decision`, { decision, justification })
      setActionTaken(decision)
      setShowJustification(false)
    } catch (err) {
      console.error('Decision failed:', err)
    }
  }

  if (loading) return <div className="space-y-4 py-8">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>

  if (!data) return (
    <div className="space-y-6 animate-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1.5" /> Back</Button>
      <Card>
        <CardContent className="py-16 text-center">
          <Brain size={36} className="mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold mb-1">No compliance data</h2>
          <p className="text-sm text-muted-foreground mb-6">The AI pipeline hasn't been run for this bid.</p>
          <Button onClick={() => api.post(`/bids/${bidId}/pipeline`).then(() => load())}>Trigger AI pipeline</Button>
        </CardContent>
      </Card>
    </div>
  )

  const mockPipelineSteps: PipelineStep[] = [
    { id: '1', label: 'Document Ingestion & OCR', status: 'completed', description: 'Extracting text and identifying document types.', duration: '1.2s', score: data.quality_score },
    { id: '2', label: 'Data Verification', status: 'completed', description: 'Cross-referencing extracted data against authoritative sources.', duration: '2.5s', score: data.completeness_score },
    { id: '3', label: 'Compliance Checking', status: 'completed', description: 'Validating against tender requirements and legal standards.', duration: '1.8s', score: data.compliance_score },
    { id: '4', label: 'Risk Assessment', status: 'completed', description: 'Analyzing risk factors and generating final recommendation.', duration: '0.9s', score: data.risk_score }
  ]

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1.5" /> Back</Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={riskBadge[data.risk_level]}>{data.risk_level.toUpperCase()} RISK</Badge>
          {data.pipeline_duration_ms && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {(data.pipeline_duration_ms / 1000).toFixed(1)}s</span>}
        </div>
      </div>

      <PipelineProgressView 
        steps={mockPipelineSteps} 
        mode="replay" 
        overallScore={data.overall_score} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Scores */}
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="text-primary" size={20} /> Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreBar score={data.eligibility_score} label="Eligibility" />
            <ScoreBar score={data.compliance_score} label="Compliance" />
            <ScoreBar score={data.risk_score} label="Risk Profile" />
            <ScoreBar score={data.completeness_score} label="Completeness" />
            <ScoreBar score={data.quality_score} label="Data Quality" />
          </CardContent>
        </Card>

        {/* AI Recommendation */}
        <Card className="h-full bg-secondary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Brain size={20} className="text-primary" /> AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.ai_recommendation ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {data.ai_recommendation}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No specific recommendation provided.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FileText size={20} className="text-primary" /> Extracted Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map(d => {
              const isVerified = d.verification_status === 'verified'
              return (
                <div key={d.id} className="group relative flex flex-col p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${isVerified ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      {isVerified ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-amber-500" />}
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${verColor[d.verification_status || 'pending']}`}>
                      {d.verification_status || 'pending'}
                    </Badge>
                  </div>
                  
                  <h4 className="text-sm font-medium truncate mb-1" title={d.original_filename}>
                    {d.original_filename}
                  </h4>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {d.doc_type.replace(/_/g, ' ')}
                  </p>
                  
                  {d.ocr_confidence != null && (
                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">OCR Confidence</span>
                      <span className="font-mono font-medium">{(d.ocr_confidence * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )
            })}
            {docs.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 opacity-50" size={32} />
                <p>No documents associated with this compliance run.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reasoning trace */}
      {data.reasoning_trace && (
        <Card>
          <CardHeader className="cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => setShowTrace(!showTrace)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Technical Reasoning Trace
              </CardTitle>
              {showTrace ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>
          </CardHeader>
          {showTrace && (
            <CardContent className="pt-0">
              <pre className="p-4 rounded-lg bg-secondary text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto border border-border/50">
                {data.reasoning_trace}
              </pre>
            </CardContent>
          )}
        </Card>
      )}

      {/* Officer Decision Section */}
      <Card className="border-2 border-dashed border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Officer Decision</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            AI is advisory only — the final decision rests with the Procurement Officer per GFR 2017.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionTaken ? (
            <div className={`p-4 rounded-lg border ${
              actionTaken === 'approve' ? 'bg-emerald-500/10 border-emerald-500/30' :
              actionTaken === 'reject' ? 'bg-red-500/10 border-red-500/30' :
              'bg-amber-500/10 border-amber-500/30'
            }`}>
              <p className="text-sm font-medium">
                {actionTaken === 'approve' ? '✅ Bid Approved' : actionTaken === 'reject' ? '❌ Bid Rejected' : '⚠️ Clarification Requested'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Decision recorded in audit trail</p>
            </div>
          ) : (
            <>
              {showJustification && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Justification / Reason:</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Provide reason for your decision..."
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => { if (!showJustification) { setShowJustification(true); setPendingAction('approve'); } else handleAction('approve') }}
                  disabled={showJustification && pendingAction === 'approve' && !justification.trim()}>
                  <CheckCircle2 size={14} /> Approve
                </Button>
                <Button variant="destructive" className="gap-1.5"
                  onClick={() => { if (!showJustification) { setShowJustification(true); setPendingAction('reject'); } else handleAction('reject') }}
                  disabled={showJustification && pendingAction === 'reject' && !justification.trim()}>
                  <AlertCircle size={14} /> Reject
                </Button>
                <Button variant="outline" className="gap-1.5 text-amber-400 hover:text-amber-300 border-amber-500/30"
                  onClick={() => { if (!showJustification) { setShowJustification(true); setPendingAction('clarify'); } else handleAction('clarify') }}
                  disabled={showJustification && pendingAction === 'clarify' && !justification.trim()}>
                  <AlertCircle size={14} /> Request Clarification
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
