import React from 'react'
import { Label } from '@/components/ui/label'
import { HelpCircle } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// FieldWithHelp — A field wrapper that adds description text and help tooltips
// Matches the Karnataka e-Procurement portal style
// ─────────────────────────────────────────────────────────────────────────────

interface FieldWithHelpProps {
  label: string
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  tooltip?: string
}

export default function FieldWithHelp({ label, description, required, children, className = '', tooltip }: FieldWithHelpProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <span className="group relative cursor-help">
            <HelpCircle size={13} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64 p-2 text-xs text-muted-foreground bg-popover border rounded-md shadow-lg">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground leading-snug -mt-0.5">{description}</p>
      )}
      {children}
    </div>
  )
}

// Section header component for consistent styling
export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-dashed pb-4 mb-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
    </div>
  )
}

// Step page wrapper with consistent animation
export function StepPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {children}
    </div>
  )
}
