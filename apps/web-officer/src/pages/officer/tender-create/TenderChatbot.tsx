import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronDown, BookOpen, Minimize2 } from 'lucide-react'
import { useTenderForm, STEPS } from './TenderFormContext'
import api from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Floating AI Chatbot — Context-aware assistant for tender creation
// Uses previously-filled fields to provide intelligent suggestions
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  time: Date
  confidence?: number
  references?: string[]
}

// Per-step quick suggestions so the officer gets relevant prompts
const STEP_SUGGESTIONS: Record<string, string[]> = {
  general: [
    'Help me write a tender title for IT equipment procurement',
    'What tender type should I select for goods procurement?',
    'Explain the difference between ECV and Non-ECV',
    'What does Two Cover System mean?',
  ],
  eligibility: [
    'Suggest eligibility conditions for a ₹1 Cr goods tender',
    'What are mandatory conditions per GFR 2017?',
    'Add conditions for land border country restriction',
    'What EMD conditions should I include?',
  ],
  technical: [
    'What technical criteria are typical for IT hardware tenders?',
    'Suggest criteria for past experience verification',
    'What financial criteria should I add?',
    'Explain criterion types and when to use each',
  ],
  documents: [
    'What documents are mandatory for government tenders?',
    'Suggest documents for a medical equipment tender',
    'Is OEM authorization always required?',
    'What financial documents should bidders submit?',
  ],
  items: [
    'How should I structure item groups?',
    'What unit of measurement codes are standard?',
    'Should I make all items mandatory?',
    'Help me create a BOQ for furniture procurement',
  ],
  delivery: [
    'What is a typical delivery timeline for goods?',
    'Should I include penalty clauses?',
    'How to structure multi-location delivery?',
    'What inspection requirements to add?',
  ],
  contact: [
    'What contact details are mandatory?',
    'Should I add alternate contact?',
    'Is fax number still needed?',
  ],
  amounts: [
    'What EMD percentage is typical?',
    'How to calculate tender processing fee?',
    'What security deposit % is standard per GFR?',
    'How to fill budget head and sanction details?',
  ],
  schedule: [
    'What is the minimum submission period per KTPP?',
    'When should I schedule pre-bid meeting?',
    'How long should bid validity be?',
    'What gap between technical and financial bid opening?',
  ],
  compliance: [
    'When is Make in India mandatory?',
    'What are MSME exemption benefits?',
    'How does startup preference work?',
    'What local content % is needed for Class I?',
  ],
  additional: [
    'Help write special instructions for bidders',
    'Suggest standard terms and conditions',
    'What annexures should I attach?',
  ],
  review: [
    'Is my tender ready for publishing?',
    'What are common mistakes to avoid?',
    'Check if all mandatory fields are filled',
  ],
}

export default function TenderChatbot() {
  const { chatOpen, setChatOpen, getFormSummary, currentStepIndex } = useTenderForm()
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Hi! I'm your Tender Creation Assistant. I can help you fill in fields, suggest conditions, recommend documents, and answer procurement compliance questions.\n\nI can see what you've already filled in and provide contextual help. What do you need?",
    time: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedRefs, setExpandedRefs] = useState<Set<number>>(new Set())
  const endRef = useRef<HTMLDivElement>(null)

  const currentStepKey = STEPS[currentStepIndex]?.key || 'general'
  const suggestions = STEP_SUGGESTIONS[currentStepKey] || []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const q = text || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q, time: new Date() }])
    setLoading(true)

    // Build context from form data
    const formSummary = getFormSummary()
    const contextPrompt = `You are an AI assistant helping a government procurement officer create a tender on an e-Procurement portal. Here is the context of the tender being created:\n\n${formSummary}\n\nThe officer is currently on the "${STEPS[currentStepIndex]?.label}" step.\n\nPlease answer the following question helpfully and concisely. If relevant, reference GFR 2017 rules, CVC guidelines, or GeM policies.\n\nQuestion: ${q}`

    try {
      const res = await api.post('/copilot/ask', { question: contextPrompt })
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || data.response || 'I was unable to generate a response.',
        time: new Date(),
        confidence: data.confidence,
        references: data.references || [],
      }])
    } catch {
      // Comprehensive fallback knowledge base
      const fallback = getContextualFallback(q, formSummary, currentStepKey)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallback.answer,
        time: new Date(),
        confidence: fallback.confidence,
        references: fallback.references,
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

  // Floating button when closed
  if (!chatOpen) {
    return (
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[var(--gem-blue)] text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        title="Open AI Assistant"
      >
        <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
      </button>
    )
  }

  // Chat panel when open
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--gem-blue)] flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Tender Assistant</h3>
            <p className="text-[10px] text-muted-foreground">Step: {STEPS[currentStepIndex]?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-muted-foreground mr-2">Online</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setChatOpen(false)}>
            <Minimize2 size={14} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${
              m.role === 'assistant' ? 'bg-[var(--gem-blue)]' : 'bg-secondary'}`}>
              {m.role === 'assistant' ? <Bot size={12} className="text-white" /> : <User size={12} />}
            </div>
            <div className="max-w-[85%] space-y-1">
              <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user' ? 'bg-secondary' : 'bg-muted/50 border border-border/50'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[9px] text-muted-foreground">{m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {m.confidence !== undefined && m.confidence > 0 && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                    {(m.confidence * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              {m.references && m.references.length > 0 && (
                <div>
                  <button onClick={() => toggleRefs(i)}
                    className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground px-1">
                    <BookOpen size={9} />
                    {m.references.length} ref{m.references.length > 1 ? 's' : ''}
                    <ChevronDown size={9} className={`transition-transform ${expandedRefs.has(i) ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedRefs.has(i) && (
                    <div className="mt-1 space-y-0.5 pl-2">
                      {m.references.map((ref, ri) => (
                        <p key={ri} className="text-[9px] text-muted-foreground flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)]" />{ref}
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
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--gem-blue)] flex items-center justify-center">
              <Bot size={12} className="text-white" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-muted/50 border border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-[var(--gem-blue)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 2 && suggestions.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {suggestions.slice(0, 3).map((s, i) => (
            <button key={i} onClick={() => send(s)}
              className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors truncate max-w-[200px]">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send() }} className="px-3 pb-3 pt-1 border-t flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} disabled={loading}
          placeholder="Ask about this tender..." className="flex-1 h-8 text-xs" />
        <Button type="submit" size="sm" disabled={!input.trim() || loading} className="h-8 w-8 p-0">
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Context-aware fallback responses when API is unavailable
// ─────────────────────────────────────────────────────────────────────────────
function getContextualFallback(question: string, formSummary: string, stepKey: string): { answer: string; confidence: number; references: string[] } {
  const q = question.toLowerCase()

  // Title help
  if (q.includes('title') || q.includes('name') && stepKey === 'general') {
    return {
      answer: `A good tender title should be clear and descriptive. Format:\n\n**[Action] of [Item/Service] for [Department/Location]**\n\nExamples:\n• "Supply of IT Hardware & Network Equipment for District Office"\n• "Procurement of Laboratory Equipment for University Science Department"\n• "Annual Maintenance Contract for Air Conditioning Systems"\n• "Construction of Staff Quarters at Regional Office"\n\nKeep it under 100 characters for readability.`,
      confidence: 0.85,
      references: ['GeM Tender Naming Guidelines', 'KTPP Portal Standards'],
    }
  }

  // ECV explanation
  if (q.includes('ecv') || q.includes('non-ecv')) {
    return {
      answer: `**ECV (Estimated Contract Value):**\n\n• **ECV tenders**: Have a disclosed estimated value. Bids exceeding this are automatically rejected.\n• **Non-ECV tenders**: No disclosed ceiling — bids are evaluated on merit and L1 determination.\n\n**When to use:**\n• ECV → When budget is fixed and you want to cap bids\n• Non-ECV → When you want competitive pricing without ceiling constraints\n\nMost government tenders use **Non-ECV** to encourage competitive bidding.`,
      confidence: 0.90,
      references: ['KTPP Rules Chapter V', 'GFR 2017 Rule 160'],
    }
  }

  // Two cover system
  if (q.includes('two cover') || q.includes('two tender') || q.includes('cover system')) {
    return {
      answer: `**Two Cover (Envelope) System:**\n\n**Cover 1 — Technical Bid:**\n• Company credentials & experience\n• Technical specifications compliance\n• Statutory documents (GST, PAN, MSME, etc.)\n• EMD proof\n\n**Cover 2 — Financial Bid:**\n• Price quotation (itemwise/lumpsum)\n• Price breakdowns, taxes, duties\n• Only opened for technically qualified bidders\n\n**Why use it?**\nPrevents price bias during technical evaluation. Officers evaluate technical merit without knowing the pricing.`,
      confidence: 0.92,
      references: ['GFR 2017 Rule 154', 'CVC Guidelines on Two-Bid System'],
    }
  }

  // Eligibility conditions
  if (q.includes('eligibility') || q.includes('condition') || q.includes('suggest')) {
    const hasValue = formSummary.includes('Estimated Value')
    return {
      answer: `Based on your tender, here are recommended eligibility conditions:\n\n**Mandatory (always include):**\n1. EMD submission requirement\n2. Bid validity period (90 days minimum)\n3. Document submission requirements\n4. Non-blacklisting declaration\n\n**For goods tenders:**\n5. Quality certification (ISO/BIS)\n6. Manufacturer authorization or dealer certificate\n7. Past supply experience (minimum 3 similar orders)\n\n**Financial criteria:**\n8. Minimum annual turnover${hasValue ? ' (typically 3x the estimated value)' : ''}\n9. Income tax returns for last 3 years\n10. No pending litigation declaration\n\nShall I add any of these to your conditions list?`,
      confidence: 0.88,
      references: ['GFR 2017 Rule 153', 'GeM Standard Conditions', 'CVC Circular on Eligibility'],
    }
  }

  // EMD
  if (q.includes('emd') || q.includes('earnest money')) {
    return {
      answer: `**EMD (Earnest Money Deposit) Guidelines:**\n\n• **Standard rate**: 2-5% of estimated tender value\n• **Per GFR 2017**: EMD should not exceed 5%\n\n**Exemptions:**\n• MSMEs registered on Udyam portal\n• DPIIT-recognized startups\n• Government organizations\n• CPSEs/PSUs\n\n**Important:**\n• EMD must be in prescribed form (DD/BG/Online)\n• Returned to unsuccessful bidders within 30 days\n• Forfeited if bidder withdraws after submission\n\n${formSummary.includes('Estimated Value') ? `For your tender value, recommended EMD is typically 2-3% of the estimated amount.` : 'Fill in the estimated value first, and I can suggest the EMD amount.'}`,
      confidence: 0.90,
      references: ['GFR 2017 Rule 170', 'MSME Development Act Sec 7', 'GeM EMD Policy'],
    }
  }

  // Documents
  if (q.includes('document') || q.includes('mandatory')) {
    return {
      answer: `**Mandatory Documents for Government Tenders:**\n\n**Identity & Registration:**\n• PAN Card\n• GST Registration Certificate\n• Firm/Company Registration Certificate\n• Udyam Registration (if claiming MSME benefits)\n\n**Financial:**\n• Income Tax Returns (last 3 years)\n• Audited Balance Sheets\n• CA-certified Annual Turnover Certificate\n• GST Returns (last 6 months)\n\n**Technical:**\n• Manufacturer Authorization Form / Dealership Certificate\n• ISO/BIS Certification\n• Past Performance Certificates\n• Technical Compliance Statement\n\n**Declarations:**\n• Non-blacklisting/non-debarment declaration\n• No pending litigation declaration\n• Make in India self-certification (if applicable)\n• Integrity Pact (for tenders > ₹1 Cr)`,
      confidence: 0.90,
      references: ['GeM Buyer Manual', 'GFR 2017 Appendix 7', 'CVC Guidelines on Documentation'],
    }
  }

  // Budget / amounts
  if (q.includes('budget') || q.includes('fee') || q.includes('security deposit') || q.includes('amount')) {
    return {
      answer: `**Tender Amount Details Guide:**\n\n| Component | Standard Rate | Notes |\n|---|---|---|\n| **Tender Fee** | ₹500 - ₹10,000 | Based on tender value, non-refundable |\n| **EMD** | 2-5% of estimated value | Refundable to unsuccessful bidders |\n| **Processing Fee** | ₹500 - ₹5,000 | Portal processing charge |\n| **Security Deposit** | 5-10% of contract value | Furnished by successful bidder |\n| **Performance Security** | 5-10% of contract value | Retained during warranty |\n\n**Budget Fields:**\n• Budget Head: The accounting head under which expenditure is sanctioned\n• Sanction Number: Administrative/financial approval reference\n• Fund Source: Central/State/Own funds`,
      confidence: 0.88,
      references: ['GFR 2017 Rule 170-175', 'KTPP Rules on Financial Terms'],
    }
  }

  // Schedule / dates
  if (q.includes('schedule') || q.includes('date') || q.includes('deadline') || q.includes('submission period')) {
    return {
      answer: `**Tender Schedule Guidelines:**\n\n**Minimum Submission Periods (per KTPP Rule 17):**\n• Works tender: 30 days from NIT date\n• Goods tender: 21 days from NIT date\n• Emergency procurement: 15 days (with approval)\n\n**Recommended Timeline:**\n1. NIT Publication → Day 0\n2. Document Sale Start → Day 1\n3. Pre-Bid Meeting → Day 7-10\n4. Last Date for Queries → Day 14\n5. Document Sale End → Day 18\n6. Submission Deadline → Day 21-30\n7. Technical Bid Opening → Day 22-31 (next day)\n8. Financial Bid Opening → After technical evaluation\n\n**Important:** Submission deadline must be on a working day between 10:00 AM and 5:30 PM`,
      confidence: 0.92,
      references: ['KTPP Rule 17(3)', 'GFR 2017 Rule 161', 'CVC Timeline Guidelines'],
    }
  }

  // Make in India
  if (q.includes('make in india') || q.includes('mii') || q.includes('local content')) {
    return {
      answer: `**Make in India (MII) Policy:**\n\n**When mandatory?**\n• All government procurement above ₹200 Cr → Must specify minimum local content\n• All GeM procurement → MII preference applicable by default\n\n**Classification:**\n| Class | Local Content | Preference |\n|---|---|---|\n| Class I | ≥ 50% | Full preference |\n| Class II | 20-50% | Partial preference |\n| Non-Local | < 20% | No preference |\n\n**Purchase preference:** Class I gets up to 20% price preference over Class II/Non-Local.\n\n**Your tender:** ${formSummary.includes('Estimated Value') ? 'Based on the value you entered, MII compliance is recommended.' : 'Fill in the estimated value to determine if MII is mandatory for your tender.'}`,
      confidence: 0.90,
      references: ['DPIIT PPO 2017', 'Make in India Order P-45021', 'GeM MII Guidelines'],
    }
  }

  // Generic fallback
  return {
    answer: `I can help with your tender on "${STEPS[0]?.label || 'this step'}". Here are things I can assist with:\n\n• **Writing descriptions** — tender scope, special instructions\n• **Suggesting conditions** — eligibility, technical criteria\n• **Recommending documents** — based on tender type and value\n• **Budget guidance** — EMD, fees, deposits calculation\n• **Compliance rules** — GFR 2017, CVC, Make in India\n• **Schedule planning** — submission periods, meeting dates\n\nTry asking something specific like "What EMD % should I set?" or "Suggest eligibility conditions for a goods tender."`,
    confidence: 0.70,
    references: ['GFR 2017', 'CVC Guidelines', 'GeM Procurement Manual'],
  }
}
