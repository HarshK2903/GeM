import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus } from 'lucide-react'

const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step02Eligibility() {
  const { formData, updateField } = useTenderForm()

  const addCondition = () => {
    updateField('conditions', [...formData.conditions, ''])
  }

  const updateCondition = (index: number, value: string) => {
    const newConditions = [...formData.conditions]
    newConditions[index] = value
    updateField('conditions', newConditions)
  }

  const removeCondition = (index: number) => {
    const newConditions = [...formData.conditions]
    newConditions.splice(index, 1)
    updateField('conditions', newConditions)
  }

  return (
    <StepPage>
      <SectionHeader 
        title="General Conditions of Eligibility" 
        subtitle="Standard conditions that all bidders must satisfy to be eligible." 
      />
      
      <div className="space-y-4">
        {formData.conditions.map((condition, index) => (
          <div key={index} className="flex gap-4 p-4 border rounded-lg bg-card items-start">
            <Badge variant="outline" className="mt-2 shrink-0">{index + 1}</Badge>
            <textarea
              className={textareaClass}
              value={condition}
              onChange={(e) => updateCondition(index, e.target.value)}
              placeholder="Enter eligibility condition..."
              rows={2}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="mt-1 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => removeCondition(index)}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Button 
          variant="outline" 
          className="w-full border-dashed" 
          onClick={addCondition}
        >
          <Plus size={16} className="mr-2" />
          Add Condition
        </Button>
      </div>
    </StepPage>
  )
}
