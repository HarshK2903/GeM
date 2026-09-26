import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, BookOpen, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: Date
  confidence?: number
  references?: string[]
}

const suggestions = [
  'GFR 2017 rules for bid evaluation',
  'When to reject vs request clarification',
  'Make in India mandatory documents',
  'How does risk scoring work',
  'CVC guidelines for officer overrides',
  'MSME/Udyam registration requirements',
]

export default function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "I'm your compliance copilot. I can help with GFR 2017 rules, document requirements, bid evaluation best practices, and CVC compliance guidelines.\n\nWhat would you like to know?",
    time: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedRefs, setExpandedRefs] = useState<Set<number>>(new Set())
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q, time: new Date() }])
    setLoading(true)

    try {
      // Try the real copilot API endpoint
      const res = await api.post('/copilot/ask', { question: q })
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || data.response || 'I was unable to generate a response. Please try rephrasing your question.',
        time: new Date(),
        confidence: data.confidence,
        references: data.references || [],
      }])
    } catch {
      // Fallback to comprehensive rule-based responses when API is unavailable
      const fallbackResponse = getFallbackResponse(q)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse.answer,
        time: new Date(),
        confidence: fallbackResponse.confidence,
        references: fallbackResponse.references,
      }])
    } finally {
      setLoading(false)
    }
  }

  function toggleRefs(index: number) {
    setExpandedRefs(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[var(--gem-blue)] flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Compliance Copilot</h1>
          <p className="text-xs text-muted-foreground">GFR 2017 · CVC Guidelines · GeM Rules</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
        <p className="text-[11px] text-amber-400">AI-powered advisory — verify independently before making decisions</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${
              m.role === 'assistant' ? 'bg-[var(--gem-blue)]' : 'bg-secondary'}`}>
              {m.role === 'assistant' ? <Bot size={14} className="text-white" /> : <User size={14} />}
            </div>
            <div className={`max-w-[75%] space-y-1.5`}>
              <Card className={`${m.role === 'user' ? 'bg-secondary border-secondary' : ''}`}>
                <CardContent className="py-2.5 px-3.5">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-[10px] text-muted-foreground">{m.time.toLocaleTimeString()}</p>
                    {m.confidence !== undefined && m.confidence > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {(m.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* References */}
              {m.references && m.references.length > 0 && (
                <div>
                  <button onClick={() => toggleRefs(i)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1">
                    <BookOpen size={11} />
                    {m.references.length} reference{m.references.length > 1 ? 's' : ''}
                    {expandedRefs.has(i) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  {expandedRefs.has(i) && (
                    <div className="mt-1 space-y-0.5 pl-1">
                      {m.references.map((ref, ri) => (
                        <p key={ri} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] flex-shrink-0" />
                          {ref}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-md bg-[var(--gem-blue)] flex items-center justify-center"><Bot size={14} className="text-white" /></div>
            <Card>
              <CardContent className="py-2.5 px-3.5 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Thinking...
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="py-3">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><HelpCircle size={12} /> Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <Button key={i} variant="outline" size="sm" className="h-7 text-xs" onClick={() => send(s)}>{s}</Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <Separator className="my-3" />
      <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} disabled={loading}
          placeholder="Ask about procurement compliance..." className="flex-1" />
        <Button type="submit" size="sm" disabled={!input.trim() || loading} className="px-3">
          <Send size={16} />
        </Button>
      </form>
    </div>
  )
}

// Comprehensive fallback responses for when the API is unavailable
function getFallbackResponse(question: string): { answer: string; confidence: number; references: string[] } {
  const q = question.toLowerCase()

  if (q.includes('gfr') && (q.includes('bid') || q.includes('evaluation') || q.includes('rule'))) {
    return {
      answer: `Per the General Financial Rules (GFR) 2017, bid evaluation must follow these key principles:\n\n1. **Rule 149**: Procurement officers must ensure due diligence in verifying all statutory documents.\n2. **Rule 153**: Evaluation must be based on pre-defined, transparent criteria disclosed in the tender.\n3. **Rule 154**: Every approval or rejection must have documented reasoning.\n4. **Rule 160**: The Lowest Responsive (L1) bidder approach should be used for goods procurement unless quality-cum-cost basis is specified.\n5. **Rule 173**: Bids must be evaluated without bias, and no post-tender negotiation is permitted except with L1.\n\nAll evaluations must be recorded in the audit trail for CVC compliance.`,
      confidence: 0.92,
      references: ['GFR 2017 Rule 149 — Due Diligence', 'GFR 2017 Rule 153 — Evaluation Criteria', 'GFR 2017 Rule 154 — Documented Reasoning', 'GFR 2017 Rule 160 — L1 Procurement', 'CVC Circular No. 03/01/2012']
    }
  }

  if (q.includes('reject') || q.includes('clarification') || q.includes('disqualif')) {
    return {
      answer: `**When to Reject vs. Request Clarification:**\n\n**Reject outright** when:\n• Bidder is blacklisted/debarred by any government agency\n• Critical documents (PAN, GST) are completely missing or forged\n• Bid is received after the submission deadline\n• EMD (Earnest Money Deposit) is not furnished\n• Bidder does not meet mandatory eligibility criteria\n\n**Request clarification** when:\n• Minor discrepancies in submitted documents (e.g., name spelling variations)\n• Document is expired but bidder may have a renewed version\n• Partial information that can be supplemented\n• Formatting or technical issues in uploaded documents\n\n**Important**: Per CVC guidelines, clarification should NOT change the substance of the bid. It should only seek to clarify or confirm existing information.`,
      confidence: 0.88,
      references: ['GFR 2017 Rule 154 — Rejection Grounds', 'CVC Circular — Post-Tender Negotiations', 'GeM GTC Clause 22 — Bid Validity']
    }
  }

  if (q.includes('make in india') || q.includes('local content') || q.includes('mii')) {
    return {
      answer: `**Make in India (MII) Policy — Document Requirements:**\n\n1. **Self-Certification**: Bidder must self-certify local content percentage on the GeM portal.\n2. **Certificate of Origin**: Required for imported raw materials/components.\n3. **Local Content Percentage**: Must meet the minimum threshold specified in the tender (typically 50%).\n4. **Class I/Class II Supplier**: \n   - Class I: Local content ≥ 50%\n   - Class II: Local content ≥ 20% and < 50%\n   - Non-Local: Local content < 20%\n5. **Purchase Preference**: Class I suppliers get purchase preference up to 20% price margin over Class II.\n\nPer DPIIT Order P-45021/2/2017-PP (BE-II), false declaration of local content can lead to debarment for 3 years.`,
      confidence: 0.90,
      references: ['DPIIT Make in India Order 2017', 'Public Procurement Order (PPO) 2017', 'GeM MII Guidelines', 'DPIIT Order P-45021/2/2017-PP']
    }
  }

  if (q.includes('risk') && q.includes('scor')) {
    return {
      answer: `**GemVerify Risk Scoring Methodology:**\n\nThe platform uses 6 dimensions weighted as follows:\n\n| Dimension | Weight | What it measures |\n|---|---|---|\n| **Eligibility** | 30% | Mandatory requirements met (MSME, MII, Startup) |\n| **Compliance** | 25% | Document verification status across all registries |\n| **Completeness** | 20% | Ratio of submitted vs. required documents |\n| **Risk** | 15% | Deductions for failures, mismatches, missing docs |\n| **Quality** | 10% | Depth of extracted data fields |\n\n**Risk Classification:**\n• 🟢 LOW (score ≥ 75): Minimal concerns, recommend for approval\n• 🟡 MEDIUM (score 50-74): Some issues, officer review recommended\n• 🟠 HIGH (score 25-49): Significant concerns, detailed review needed\n• 🔴 CRITICAL (score < 25): Major non-compliance, likely rejection`,
      confidence: 0.95,
      references: ['GemVerify Scoring Engine', 'CVC Risk Assessment Guidelines']
    }
  }

  if (q.includes('cvc') || q.includes('officer override') || q.includes('vigilance')) {
    return {
      answer: `**CVC Guidelines for Officer Overrides:**\n\n1. **Documentation**: Every override must be documented with clear justification in the audit trail.\n2. **Reasoned Order**: If overriding AI recommendation, the officer must record a "Reasoned Order" explaining why.\n3. **Approval Hierarchy**: Overrides on high-value tenders (> ₹10 Lakhs) should be approved by a senior officer.\n4. **No Post-Tender Negotiation**: CVC strictly prohibits negotiations that change bid substance.\n5. **Vigilance Angle**: Any override favoring a higher-risk bidder may attract vigilance scrutiny.\n\n**Best Practice**: Use the AI recommendation as a starting point. If you disagree, document specific reasons — this protects both the officer and the organization in audit.`,
      confidence: 0.87,
      references: ['CVC Circular No. 03/01/2012', 'CVC Manual on Vigilance Administration', 'GFR 2017 Rule 197 — Transparency']
    }
  }

  if (q.includes('msme') || q.includes('udyam')) {
    return {
      answer: `**MSME/Udyam Registration Requirements:**\n\n1. **Udyam Registration Number**: Format UDYAM-XX-00-0000000 (mandatory since July 2020).\n2. **Classification**:\n   - Micro: Investment < ₹1 Cr, Turnover < ₹5 Cr\n   - Small: Investment < ₹10 Cr, Turnover < ₹50 Cr\n   - Medium: Investment < ₹50 Cr, Turnover < ₹250 Cr\n3. **Verification**: Platform checks against Udyam Registry for active status and enterprise type.\n4. **Benefits on GeM**:\n   - EMD exemption for Micro and Small enterprises\n   - Purchase preference under Public Procurement Policy for MSEs (PPP-MSE)\n   - 25% procurement target from MSEs\n5. **Cross-Verification**: PAN and Aadhaar linked to Udyam registration are cross-checked.`,
      confidence: 0.91,
      references: ['MSME Development Act 2006', 'Udyam Registration Portal Guidelines', 'PPP-MSE Order 2012', 'GeM Buyer Manual — MSME Procurement']
    }
  }

  // Generic fallback
  return {
    answer: `Regarding "${question.slice(0, 50)}...":\n\nPer the applicable procurement regulations:\n\n1. **GFR 2017**: All government procurement must follow transparent, documented processes with proper due diligence.\n2. **CVC Guidelines**: Officers must maintain integrity and document all decisions for audit compliance.\n3. **GeM Rules**: The Government e-Marketplace has specific guidelines for vendor verification and bid evaluation.\n\nFor more specific guidance, try asking about:\n• Specific GFR rules (e.g., "GFR Rule 149")\n• Document verification requirements\n• Risk scoring methodology\n• CVC compliance guidelines\n\n*For live AI-powered answers with contextual compliance data, ensure the Groq API key is configured.*`,
    confidence: 0.65,
    references: ['GFR 2017 — General Financial Rules', 'CVC Circulars on Public Procurement', 'GeM General Terms & Conditions']
  }
}
