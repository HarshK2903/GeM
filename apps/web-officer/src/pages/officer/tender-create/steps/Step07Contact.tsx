import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step07Contact() {
  const { formData, updateField } = useTenderForm()

  return (
    <StepPage>
      <SectionHeader title="Contact Information" subtitle="Details of the officer handling this tender" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <FieldWithHelp label="Contact Name" required description="Name of the officer handling this tender">
          <input type="text" className={inputClass} value={formData.contact_name} onChange={e => updateField('contact_name', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Contact Designation" description="Official designation/title">
          <input type="text" className={inputClass} value={formData.contact_designation} onChange={e => updateField('contact_designation', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Contact Phone" description="Landline office phone with STD code">
          <input type="text" className={inputClass} value={formData.contact_phone} onChange={e => updateField('contact_phone', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Contact Mobile" description="10-digit mobile number">
          <input type="text" className={inputClass} value={formData.contact_mobile} onChange={e => updateField('contact_mobile', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Contact Email" required description="Official email for tender queries">
          <input type="email" className={inputClass} value={formData.contact_email} onChange={e => updateField('contact_email', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Contact Fax" description="Fax number if available">
          <input type="text" className={inputClass} value={formData.contact_fax} onChange={e => updateField('contact_fax', e.target.value)} />
        </FieldWithHelp>
        <div className="col-span-1 md:col-span-2">
          <FieldWithHelp label="Contact Address" description="Complete postal address of the office">
            <textarea className={textareaClass} value={formData.contact_address} onChange={e => updateField('contact_address', e.target.value)} />
          </FieldWithHelp>
        </div>
        <FieldWithHelp label="Alternate Contact Name" description="Name of alternate contact officer">
          <input type="text" className={inputClass} value={formData.alternate_contact_name} onChange={e => updateField('alternate_contact_name', e.target.value)} />
        </FieldWithHelp>
        <FieldWithHelp label="Alternate Contact Phone" description="Phone number of alternate contact">
          <input type="text" className={inputClass} value={formData.alternate_contact_phone} onChange={e => updateField('alternate_contact_phone', e.target.value)} />
        </FieldWithHelp>
      </div>
    </StepPage>
  )
}
