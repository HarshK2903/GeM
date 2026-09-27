import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step03Technical() {
  const { formData, updateField } = useTenderForm()

  const addCriterion = () => {
    updateField('technical_criteria', [
      ...formData.technical_criteria,
      { id: Date.now().toString(), type: 'Past Experience', description: '', documents: '' }
    ])
  }

  const updateCriterion = (index: number, field: string, value: string) => {
    const newCriteria = [...formData.technical_criteria]
    newCriteria[index] = { ...newCriteria[index], [field]: value }
    updateField('technical_criteria', newCriteria)
  }

  const removeCriterion = (index: number) => {
    const newCriteria = [...formData.technical_criteria]
    newCriteria.splice(index, 1)
    updateField('technical_criteria', newCriteria)
  }

  return (
    <StepPage>
      <SectionHeader 
        title="Technical Qualification Criteria" 
        subtitle="Define specific technical qualifications and experience required from bidders." 
      />
      
      <div className="space-y-6">
        {formData.technical_criteria.map((criterion, index) => (
          <div key={criterion.id} className="p-5 border rounded-lg bg-card relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-muted-foreground hover:text-destructive"
              onClick={() => removeCriterion(index)}
            >
              <Trash2 size={18} />
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pr-10">
              <FieldWithHelp label="Criterion Type" description="Category of technical qualification">
                <select 
                  className={inputClass}
                  value={criterion.type}
                  onChange={(e) => updateCriterion(index, 'type', e.target.value)}
                >
                  <option value="Past Experience">Past Experience</option>
                  <option value="Capabilities of Vendor">Capabilities of Vendor</option>
                  <option value="Financial Status">Financial Status</option>
                  <option value="Legal Status">Legal Status</option>
                  <option value="Technical Capability">Technical Capability</option>
                </select>
              </FieldWithHelp>
              
              <FieldWithHelp label="Required Documents" description="Documents to prove this qualification">
                <Input 
                  value={criterion.documents}
                  onChange={(e) => updateCriterion(index, 'documents', e.target.value)}
                  placeholder="e.g., Work Orders, Completion Certificates"
                />
              </FieldWithHelp>

              <FieldWithHelp className="col-span-1 md:col-span-2" label="Criterion Description" description="Detailed description of the requirement">
                <textarea
                  className={textareaClass}
                  value={criterion.description}
                  onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                  placeholder="Explain the technical requirement in detail..."
                  rows={3}
                />
              </FieldWithHelp>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Button 
          variant="outline" 
          className="w-full border-dashed" 
          onClick={addCriterion}
        >
          <Plus size={16} className="mr-2" />
          Add Technical Criterion
        </Button>
      </div>
    </StepPage>
  )
}
