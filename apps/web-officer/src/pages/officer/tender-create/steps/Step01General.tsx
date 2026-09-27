import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step01General() {
  const { formData, updateField } = useTenderForm()

  return (
    <StepPage>
      <SectionHeader title="General Details" subtitle="Basic identification and classification for the tender" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <FieldWithHelp className="col-span-1 md:col-span-2" label="Tender Title" description="A clear, descriptive name for this tender" required>
          <Input 
            value={formData.title} 
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Supply of IT Equipment for Central Office"
          />
        </FieldWithHelp>

        <FieldWithHelp label="Tender Type" description="Type of tendering process">
          <select className={inputClass} value={formData.tender_type} onChange={(e) => updateField('tender_type', e.target.value)}>
            <option value="Open">Open</option>
            <option value="Limited">Limited</option>
            <option value="Single Source">Single Source</option>
            <option value="Two Part">Two Part</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Tender Denomination" description="Category of procurement">
          <select className={inputClass} value={formData.tender_denomination} onChange={(e) => updateField('tender_denomination', e.target.value)}>
            <option value="Goods">Goods</option>
            <option value="Services">Services</option>
            <option value="Works">Works</option>
            <option value="Consultancy">Consultancy</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Department Name" description="Name of the procuring department or office" required>
          <Input value={formData.department_name} onChange={(e) => updateField('department_name', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Location" description="Physical location or office where goods/services are needed">
          <Input value={formData.location} onChange={(e) => updateField('location', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp className="col-span-1 md:col-span-2" label="Description" description="Detailed scope of work, specifications, and requirements">
          <textarea 
            className={textareaClass} 
            rows={6}
            value={formData.description} 
            onChange={(e) => updateField('description', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp label="Category" description="Sub-category classification (e.g., IT, Medical, Construction)">
          <Input value={formData.category} onChange={(e) => updateField('category', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Reference Number" description="Unique file or NIT reference number">
          <Input value={formData.reference_number} onChange={(e) => updateField('reference_number', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Estimated Value (INR)" description="Estimated contract value in Indian Rupees (INR)">
          <Input type="number" value={formData.estimated_value} onChange={(e) => updateField('estimated_value', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="EMD Amount (INR)" description="Earnest Money Deposit amount required from bidders">
          <Input type="number" value={formData.emd_amount} onChange={(e) => updateField('emd_amount', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Commercial Bid Type" description="How the financial bid pricing should be structured">
          <select className={inputClass} value={formData.commercial_bid_type} onChange={(e) => updateField('commercial_bid_type', e.target.value)}>
            <option value="Itemwise">Itemwise</option>
            <option value="Percentage">Percentage</option>
            <option value="Lumpsum">Lumpsum</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Evaluation Method" description="Method used to evaluate technical and financial bids">
          <select className={inputClass} value={formData.evaluation_method} onChange={(e) => updateField('evaluation_method', e.target.value)}>
            <option value="Two Tender Document System (Two Cover)">Two Tender Document System (Two Cover)</option>
            <option value="Single Cover System">Single Cover System</option>
            <option value="QCBS">Quality and Cost Based Selection (QCBS)</option>
            <option value="LCS">Least Cost Selection (LCS)</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Price List Type" description="Whether price list is visible to all bidders">
          <select className={inputClass} value={formData.price_list_type} onChange={(e) => updateField('price_list_type', e.target.value)}>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="ECV Status" description="Estimated Contract Value disclosure status">
          <select className={inputClass} value={formData.ecv_status} onChange={(e) => updateField('ecv_status', e.target.value)}>
            <option value="ECV">ECV</option>
            <option value="Non-ECV">Non-ECV</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Currency" description="Currency for bid pricing">
          <select className={inputClass} value={formData.currency} onChange={(e) => updateField('currency', e.target.value)}>
            <option value="Rupees">Rupees</option>
            <option value="USD">USD</option>
            <option value="Euro">Euro</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Procurement Entity" description="Type of the procuring organization">
          <select className={inputClass} value={formData.procurement_entity} onChange={(e) => updateField('procurement_entity', e.target.value)}>
            <option value="Government Department">Government Department</option>
            <option value="PSU">PSU</option>
            <option value="Autonomous Body">Autonomous Body</option>
            <option value="University">University</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="NIT Date" description="Date of Notice Inviting Tender publication">
          <Input type="date" value={formData.nit_date} onChange={(e) => updateField('nit_date', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Tender Classification" description="Classification as per procurement rules">
          <select className={inputClass} value={formData.tender_classification} onChange={(e) => updateField('tender_classification', e.target.value)}>
            <option value="Works">Works</option>
            <option value="Supply">Supply</option>
            <option value="Service">Service</option>
            <option value="Consultancy">Consultancy</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Work Category" description="Specific work category (e.g., Civil, Electrical, IT)">
          <Input value={formData.work_category} onChange={(e) => updateField('work_category', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="Sub Category" description="Further classification within the work category">
          <Input value={formData.sub_category} onChange={(e) => updateField('sub_category', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp label="BoQ Type" description="Bill of Quantities type">
          <select className={inputClass} value={formData.boq_type} onChange={(e) => updateField('boq_type', e.target.value)}>
            <option value="Item Rate">Item Rate</option>
            <option value="Percentage Rate">Percentage Rate</option>
            <option value="Lump Sum">Lump Sum</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Form of Contract" description="Nature of contract to be awarded">
          <select className={inputClass} value={formData.form_of_contract} onChange={(e) => updateField('form_of_contract', e.target.value)}>
            <option value="Lump Sum">Lump Sum</option>
            <option value="Item Rate">Item Rate</option>
            <option value="Percentage">Percentage</option>
            <option value="EPC">EPC</option>
            <option value="Turnkey">Turnkey</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Number of Covers" description="Number of bid envelopes (covers) required">
          <select className={inputClass} value={formData.number_of_covers} onChange={(e) => updateField('number_of_covers', e.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </FieldWithHelp>

        <FieldWithHelp label="Bid Opening Place" description="Location where bids will be opened">
          <Input value={formData.bid_opening_place} onChange={(e) => updateField('bid_opening_place', e.target.value)} />
        </FieldWithHelp>

        <FieldWithHelp className="col-span-1 md:col-span-2" label="Remarks" description="Any additional remarks or sample instructions">
          <textarea 
            className={textareaClass} 
            value={formData.remarks} 
            onChange={(e) => updateField('remarks', e.target.value)}
          />
        </FieldWithHelp>
      </div>

      <div className="mt-8 border-t border-dashed pt-8">
        <h3 className="text-lg font-medium mb-4">Bid Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id: 'itemwise_technical', label: 'Itemwise Technical', sublabel: 'Evaluate technical bids per item' },
            { id: 'highest_bidder', label: 'Highest Bidder (H1)', sublabel: 'Award to highest bidder instead of L1' },
            { id: 'multiple_currencies', label: 'Multiple Currencies', sublabel: 'Allow bidding in different currencies' },
            { id: 'allow_withdrawal', label: 'Allow Withdrawal', sublabel: 'Allow bidders to withdraw before deadline' },
            { id: 'pre_qualification_required', label: 'Pre-Qualification', sublabel: 'Require pre-qualification stage' },
            { id: 'two_cover_system', label: 'Two Cover System', sublabel: 'Separate technical and financial bids' },
            { id: 'itemwise_emd', label: 'Itemwise EMD', sublabel: 'Specific EMD per item group' },
          ].map((config) => (
            <label key={config.id} className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors">
              <input
                type="checkbox"
                className={`${checkboxClass} mt-1`}
                checked={!!(formData as any)[config.id]}
                onChange={(e) => updateField(config.id as any, e.target.checked)}
              />
              <div className="space-y-1">
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{config.label}</span>
                <p className="text-xs text-muted-foreground">{config.sublabel}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </StepPage>
  )
}
