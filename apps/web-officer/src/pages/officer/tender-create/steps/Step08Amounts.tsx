import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step08Amounts() {
  const { formData, updateField } = useTenderForm()

  return (
    <StepPage>
      <SectionHeader title="Budget & Amount Details" subtitle="Financial figures and budget allocations for this tender" />

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Section A - Tender Fees & Deposits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <FieldWithHelp label="Tender Fee" description="Non-refundable fee for purchasing tender documents">
            <input type="number" className={inputClass} value={formData.tender_fee} onChange={e => updateField('tender_fee', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Processing Fee" description="Portal processing/transaction fee">
            <input type="number" className={inputClass} value={formData.processing_fee} onChange={e => updateField('processing_fee', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Advance Deposit / EMD" description="Advance deposit or EMD amount in INR">
            <input type="number" className={inputClass} value={formData.advance_deposit} onChange={e => updateField('advance_deposit', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Security Deposit (%)" description="Percentage of contract value as security deposit (typically 5-10%)">
            <input type="number" className={inputClass} value={formData.security_deposit_pct} onChange={e => updateField('security_deposit_pct', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Performance Security (%)" description="Percentage retained as performance guarantee">
            <input type="number" className={inputClass} value={formData.performance_security_pct} onChange={e => updateField('performance_security_pct', e.target.value)} />
          </FieldWithHelp>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Section B - Budget & Sanction Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <FieldWithHelp label="Budget Head" description="Accounting head under which expenditure is sanctioned">
            <input type="text" className={inputClass} value={formData.budget_head} onChange={e => updateField('budget_head', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Fund Source" description="Source of funding for this procurement">
            <select className={inputClass} value={formData.fund_source} onChange={e => updateField('fund_source', e.target.value)}>
              <option value="">Select source...</option>
              <option value="Central Govt">Central Govt</option>
              <option value="State Govt">State Govt</option>
              <option value="Own Funds">Own Funds</option>
              <option value="External Aid">External Aid</option>
              <option value="PPP">PPP</option>
            </select>
          </FieldWithHelp>
          <FieldWithHelp label="Sanction Number" description="Administrative/financial sanction order number">
            <input type="text" className={inputClass} value={formData.sanction_number} onChange={e => updateField('sanction_number', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Sanction Date" description="Date of sanction approval">
            <input type="date" className={inputClass} value={formData.sanction_date} onChange={e => updateField('sanction_date', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Budget Allocation" description="Total budget allocated for this financial year">
            <input type="number" className={inputClass} value={formData.budget_allocation} onChange={e => updateField('budget_allocation', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Previous Year Expenditure" description="Expenditure incurred in previous financial year">
            <input type="number" className={inputClass} value={formData.previous_year_expenditure} onChange={e => updateField('previous_year_expenditure', e.target.value)} />
          </FieldWithHelp>
          <FieldWithHelp label="Current Year Budget" description="Budget provision for current financial year">
            <input type="number" className={inputClass} value={formData.current_year_budget} onChange={e => updateField('current_year_budget', e.target.value)} />
          </FieldWithHelp>
        </div>
      </div>
    </StepPage>
  )
}
