import { CheckCircle2, CircleDashed, Loader2, PlayCircle, RefreshCw, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export type PipelineStep = {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  description?: string
  duration?: string
  score?: number
}

interface PipelineProgressViewProps {
  steps: PipelineStep[]
  mode: 'live' | 'replay'
  onReplay?: () => void
  overallScore?: number
}

export function PipelineProgressView({ steps, mode, onReplay, overallScore }: PipelineProgressViewProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(-1)
  
  // For replay mode animation
  useEffect(() => {
    if (mode === 'replay') {
      setActiveStepIndex(0)
      const timer = setInterval(() => {
        setActiveStepIndex(prev => {
          if (prev >= steps.length) {
            clearInterval(timer)
            return prev
          }
          return prev + 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [mode, steps.length])

  return (
    <Card className="p-6 md:p-8 bg-gradient-to-b from-card to-background border-border/60 shadow-xl overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -z-10" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Verification Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'live' ? 'Real-time AI verification progress' : 'Historical verification run replay'}
          </p>
        </div>
        
        {overallScore !== undefined && (
          <div className="flex flex-col items-end animate-in fade-in zoom-in duration-500">
            <div className="text-3xl font-bold tracking-tighter text-primary">{overallScore}%</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Confidence</div>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-6 md:left-[2.25rem] top-8 bottom-8 w-0.5 bg-border/50" />
        
        <div className="space-y-6 md:space-y-8">
          {steps.map((step, index) => {
            // Determine display status based on mode
            let displayStatus = step.status
            if (mode === 'replay') {
              if (index > activeStepIndex) displayStatus = 'pending'
              else if (index === activeStepIndex) displayStatus = 'running'
              else displayStatus = 'completed' // Assume completed if past, for replay
            }

            const isRunning = displayStatus === 'running'
            const isCompleted = displayStatus === 'completed'
            const isFailed = displayStatus === 'failed'

            return (
              <div 
                key={step.id} 
                className={cn(
                  "relative flex gap-4 md:gap-6 items-start transition-all duration-500",
                  (mode === 'replay' && index > activeStepIndex + 1) ? "opacity-30 translate-y-4" : "opacity-100 translate-y-0"
                )}
              >
                {/* Icon indicator */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-card border border-border shadow-sm flex-shrink-0">
                  {isCompleted && <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />}
                  {isFailed && <XCircle className="w-6 h-6 md:w-8 md:h-8 text-destructive" />}
                  {isRunning && <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-primary animate-spin" />}
                  {displayStatus === 'pending' && <CircleDashed className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/50" />}
                  
                  {isRunning && (
                    <div className="absolute inset-0 border-2 border-primary rounded-2xl animate-ping opacity-20" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 md:pt-3">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <h3 className={cn(
                      "text-lg font-medium transition-colors",
                      isRunning ? "text-primary" : "text-foreground"
                    )}>
                      {step.label}
                    </h3>
                    
                    {step.duration && (isCompleted || isFailed) && (
                      <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded-md">
                        {step.duration}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-sm text-muted-foreground/80 leading-relaxed min-h-[1.5rem]">
                    {isRunning ? (
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Processing...
                      </span>
                    ) : (
                      step.description
                    )}
                  </div>
                  
                  {/* Detailed metrics reveal */}
                  {(isCompleted || isFailed) && step.score !== undefined && (
                    <div className="mt-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-1000 ease-out"
                          style={{ width: `${step.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground/80 font-mono w-8">{step.score}%</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {mode === 'replay' && activeStepIndex >= steps.length && (
        <div className="mt-10 flex justify-center animate-in fade-in zoom-in">
          <button 
            onClick={onReplay}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw size={16} /> Replay Animation
          </button>
        </div>
      )}
    </Card>
  )
}
