import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step10Compliance() {
  const { formData, updateField } = useTenderForm()

  const policies = [
    { id: 'make_in_india', label: 'Make in India', description: 'Apply purchase preference for domestically manufactured goods (PPO 2017)' },
    { id: 'msme_required', label: 'MSME Preference', description: 'Allow EMD/turnover exemptions for Micro & Small Enterprises' },
    { id: 'startup_preference', label: 'Startup Preference', description: 'DPIIT recognized startups exemption from prior experience' },
    { id: 'women_owned_preference', label: 'Women-Owned Enterprise', description: 'Preference for women-owned MSEs as per MSME policy' },
    { id: 'sc_st_preference', label: 'SC/ST Owned Enterprise', description: 'Procurement preference for SC/ST-owned MSEs' },
    { id: 'local_supplier_preference', label: 'Local Supplier Preference', description: 'Preference for suppliers within the state/region' },
    { id: 'gem_required', label: 'GeM Registration Required', description: 'Bidder must be registered on Government e-Marketplace' },
    { id: 'integrity_pact_required', label: 'Integrity Pact', description: 'Mandatory for procurement above ₹1 Crore (CVC guideline)' },
    { id: 'epbg_required', label: 'e-PBG Required', description: 'Electronic Performance Bank Guarantee from an approved bank' },
  ] as const

  return (
    <StepPage>
      <SectionHeader 
        title="Policy Compliance & Preferences" 
        subtitle="Configure government policies and financial criteria"
      />

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium mb-4">Section A: Government Policy Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map(policy => (
              <label key={policy.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className={`${checkboxClass} mt-1`}
                  checked={formData[policy.id as keyof typeof formData] as boolean}
                  onChange={(e) => updateField(policy.id as keyof typeof formData, e.target.checked)}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{policy.label}</p>
                  <p className="text-xs text-muted-foreground">{policy.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Section B: Financial Criteria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <FieldWithHelp
              label="Minimum Average Annual Turnover"
              description="Minimum average annual turnover required from bidders (INR)"
            >
              <input
                type="number"
                className={inputClass}
                value={formData.min_turnover}
                onChange={(e) => updateField('min_turnover', e.target.value)}
                placeholder="e.g. 5000000"
              />
            </FieldWithHelp>

            <FieldWithHelp
              label="Local Content Percentage"
              description="Minimum local content percentage for Make in India compliance"
            >
              <input
                type="number"
                min="0"
                max="100"
                className={inputClass}
                value={formData.local_content_pct}
                onChange={(e) => updateField('local_content_pct', e.target.value)}
                placeholder="e.g. 50"
              />
            </FieldWithHelp>
          </div>
        </div>
      </div>
    </StepPage>
  )
}
