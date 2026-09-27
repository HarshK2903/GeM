import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { FileText, UploadCloud } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step11Additional() {
  const { formData, updateField } = useTenderForm()

  return (
    <StepPage>
      <SectionHeader 
        title="Additional Information" 
        subtitle="Provide special instructions, terms, and upload annexures"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="col-span-1 md:col-span-2">
          <FieldWithHelp
            label="Special Instructions to Bidders"
            description="Any specific instructions that bidders must follow"
          >
            <textarea
              className={textareaClass}
              rows={8}
              value={formData.special_instructions}
              onChange={(e) => updateField('special_instructions', e.target.value)}
              placeholder="Enter special instructions here..."
            />
          </FieldWithHelp>
        </div>

        <div className="col-span-1 md:col-span-2">
          <FieldWithHelp
            label="Additional Terms & Conditions"
            description="Supplementary terms beyond the standard conditions"
          >
            <textarea
              className={textareaClass}
              rows={8}
              value={formData.terms_conditions}
              onChange={(e) => updateField('terms_conditions', e.target.value)}
              placeholder="Enter additional terms and conditions here..."
            />
          </FieldWithHelp>
        </div>

        <FieldWithHelp
          label="Publishing Officer Name"
          description="Name of the officer publishing this tender"
        >
          <input
            type="text"
            className={inputClass}
            value={formData.published_user_name}
            onChange={(e) => updateField('published_user_name', e.target.value)}
          />
        </FieldWithHelp>

        <FieldWithHelp
          label="Publishing Officer Post"
          description="Designation of the publishing officer"
        >
          <input
            type="text"
            className={inputClass}
            value={formData.published_user_post}
            onChange={(e) => updateField('published_user_post', e.target.value)}
          />
        </FieldWithHelp>

        <div className="col-span-1 md:col-span-2 mt-4">
          <FieldWithHelp
            label="Upload Annexures & Supporting Documents"
            description="Attach relevant documents (accepts PDF, DOCX, XLSX up to 50MB)"
          >
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer bg-slate-50/50">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <FileText className="text-blue-600" size={24} />
              </div>
              <h4 className="font-medium text-sm mb-1">Click or drag and drop to upload</h4>
              <p className="text-xs text-muted-foreground">PDF, DOCX, XLSX (Max 50MB)</p>
            </div>
          </FieldWithHelp>
        </div>
      </div>
    </StepPage>
  )
}
