import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Info } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step09Schedule() {
  const { formData, updateField } = useTenderForm()

  return (
    <StepPage>
      <SectionHeader 
        title="Tender Schedule" 
        subtitle="Set the important dates and deadlines for this tender"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <FieldWithHelp
          label="Bid Validity Period"
          description="Period for which the bid must remain valid after submission"
          required
        >
          <input
            type="text"
            className={inputClass}
            value={formData.bid_validity}
            onChange={(e) => updateField('bid_validity', e.target.value)}
            placeholder="e.g. 90 days"
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Submission Deadline"
          description="Final date and time for bid submission (KTPP: must be working day, 10AM-5:30PM)"
          required
        >
          <input
            type="datetime-local"
            className={`${inputClass} ring-2 ring-primary/20 border-primary/50`}
            value={formData.submission_deadline}
            onChange={(e) => updateField('submission_deadline', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Document Sale Start Date"
          description="Start date for purchasing/downloading tender documents"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.document_sale_start}
            onChange={(e) => updateField('document_sale_start', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Document Sale End Date"
          description="Last date for purchasing tender documents"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.document_sale_end}
            onChange={(e) => updateField('document_sale_end', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Pre-Bid Meeting Date & Time"
          description="Date and time of pre-bid meeting for clarifications"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.pre_bid_meeting}
            onChange={(e) => updateField('pre_bid_meeting', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Pre-Bid Meeting Venue"
          description="Venue for the pre-bid conference"
        >
          <input
            type="text"
            className={inputClass}
            value={formData.pre_bid_meeting_place}
            onChange={(e) => updateField('pre_bid_meeting_place', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Queries Deadline"
          description="Last date for submitting queries or seeking clarifications"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.queries_deadline}
            onChange={(e) => updateField('queries_deadline', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Corrigendum Issue Date"
          description="Date by which any corrigendum/addendum will be issued"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.corrigendum_date}
            onChange={(e) => updateField('corrigendum_date', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Technical Bid Opening"
          description="Date and time for opening Cover 1 (Technical Bid)"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.tech_bid_open}
            onChange={(e) => updateField('tech_bid_open', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Financial Bid Opening"
          description="Date and time for opening Cover 2 (Financial Bid) — only for technically qualified bidders"
        >
          <input
            type="datetime-local"
            className={inputClass}
            value={formData.fin_bid_open}
            onChange={(e) => updateField('fin_bid_open', e.target.value)}
          />
        </FieldWithHelp>
      </div>

      <div className="mt-8 bg-blue-50/50 text-blue-800 p-4 rounded-lg flex gap-3 border border-blue-100">
        <Info className="shrink-0 mt-0.5" size={18} />
        <p className="text-sm">As per KTPP Rule 17(3): The last date for submission of tenders shall be on a working day between 10:00 hrs and 17:30 hrs only.</p>
      </div>
    </StepPage>
  )
}
