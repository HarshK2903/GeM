import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Plus, Trash2 } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step06Delivery() {
  const { formData, updateField } = useTenderForm()
  const { delivery_schedule } = formData

  const addSchedule = () => {
    const newItem = {
      item_code: '',
      object_name: '',
      scheduled_quantity: '',
      delivery_location: '',
      expected_delivery_date: '',
      inspection_required: false,
      penalty_clause: ''
    }
    updateField('delivery_schedule', [...delivery_schedule, newItem])
  }

  const updateSchedule = (index: number, field: string, value: any) => {
    const updated = [...delivery_schedule]
    updated[index] = { ...updated[index], [field]: value }
    updateField('delivery_schedule', updated)
  }

  const deleteSchedule = (index: number) => {
    const updated = [...delivery_schedule]
    updated.splice(index, 1)
    updateField('delivery_schedule', updated)
  }

  return (
    <StepPage>
      <SectionHeader title="Delivery Schedule" subtitle="Configure delivery locations and dates for tender items" />

      <div className="space-y-6">
        {delivery_schedule.map((item, index) => (
          <div key={index} className="p-4 border rounded-md relative bg-card shadow-sm">
             <button type="button" onClick={() => deleteSchedule(index)} className="absolute top-4 right-4 text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
               <Trash2 size={16} />
             </button>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pr-12">
               <FieldWithHelp label="Item Code" description="Code of the item from the items list">
                 <input type="text" className={inputClass} value={item.item_code} onChange={e => updateSchedule(index, 'item_code', e.target.value)} />
               </FieldWithHelp>
               <FieldWithHelp label="Object Name" description="Name of the object to be delivered">
                 <input type="text" className={inputClass} value={item.object_name} onChange={e => updateSchedule(index, 'object_name', e.target.value)} />
               </FieldWithHelp>
               <FieldWithHelp label="Scheduled Quantity" description="Quantity to be delivered">
                 <input type="number" className={inputClass} value={item.scheduled_quantity} onChange={e => updateSchedule(index, 'scheduled_quantity', e.target.value)} />
               </FieldWithHelp>
               <FieldWithHelp label="Delivery Location" description="Address or location for delivery">
                 <input type="text" className={inputClass} value={item.delivery_location} onChange={e => updateSchedule(index, 'delivery_location', e.target.value)} />
               </FieldWithHelp>
               <FieldWithHelp label="Expected Delivery Date" description="Date by which delivery is expected">
                 <input type="date" className={inputClass} value={item.expected_delivery_date} onChange={e => updateSchedule(index, 'expected_delivery_date', e.target.value)} />
               </FieldWithHelp>
               <div className="flex flex-col justify-center mt-6">
                 <label className="flex items-center gap-2 text-sm font-medium">
                   <input type="checkbox" className={checkboxClass} checked={item.inspection_required} onChange={e => updateSchedule(index, 'inspection_required', e.target.checked)} />
                   Inspection Required Before Delivery
                 </label>
               </div>
               <div className="col-span-1 md:col-span-2">
                 <FieldWithHelp label="Penalty Clause" description="Details of penalty for late delivery">
                   <textarea className={textareaClass} value={item.penalty_clause} onChange={e => updateSchedule(index, 'penalty_clause', e.target.value)} />
                 </FieldWithHelp>
               </div>
             </div>
          </div>
        ))}
        
        <button type="button" onClick={addSchedule} className="flex items-center gap-2 text-sm font-medium px-4 py-3 border-2 border-dashed border-muted-foreground/30 hover:border-primary rounded-md w-full justify-center transition-colors">
          <Plus size={16} /> Add Delivery Schedule
        </button>
      </div>
    </StepPage>
  )
}
