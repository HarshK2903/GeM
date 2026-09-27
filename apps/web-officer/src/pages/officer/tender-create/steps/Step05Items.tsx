import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import FieldWithHelp, { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Plus, Trash2 } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const textareaClass = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step05Items() {
  const { formData, updateField } = useTenderForm()
  const { tender_items } = formData

  const addGroup = () => {
    const newGroup = {
      group_name: '',
      is_mandatory: false,
      all_items_mandatory: false,
      items: []
    }
    updateField('tender_items', [...tender_items, newGroup])
  }

  const deleteGroup = (index: number) => {
    const updated = [...tender_items]
    updated.splice(index, 1)
    updateField('tender_items', updated)
  }

  const updateGroup = (index: number, field: string, value: any) => {
    const updated = [...tender_items]
    updated[index] = { ...updated[index], [field]: value }
    updateField('tender_items', updated)
  }

  const addItem = (groupIndex: number) => {
    const updated = [...tender_items]
    updated[groupIndex].items.push({
      item_code: '',
      item_name: '',
      unit_of_measurement: '',
      quantity: '',
      estimated_unit_price: '',
      make_brand: '',
      specifications: ''
    })
    updateField('tender_items', updated)
  }

  const updateItem = (groupIndex: number, itemIndex: number, field: string, value: any) => {
    const updated = [...tender_items]
    updated[groupIndex].items[itemIndex] = { ...updated[groupIndex].items[itemIndex], [field]: value }
    updateField('tender_items', updated)
  }

  const deleteItem = (groupIndex: number, itemIndex: number) => {
    const updated = [...tender_items]
    updated[groupIndex].items.splice(itemIndex, 1)
    updateField('tender_items', updated)
  }

  return (
    <StepPage>
      <SectionHeader title="Tender Items" subtitle="Manage groups of items to be procured" />

      <div className="space-y-8">
        {tender_items.map((group, gIndex) => (
          <div key={gIndex} className="p-4 border rounded-md relative bg-card shadow-sm">
            <button type="button" onClick={() => deleteGroup(gIndex)} className="absolute top-4 right-4 text-destructive hover:bg-destructive/10 p-2 rounded-md transition-colors">
              <Trash2 size={16} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6 pr-12">
              <FieldWithHelp label="Group Name" description="Name of the item group">
                <input type="text" className={inputClass} value={group.group_name} onChange={e => updateGroup(gIndex, 'group_name', e.target.value)} />
              </FieldWithHelp>
              <div className="flex flex-col gap-4 justify-center mt-6">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className={checkboxClass} checked={group.is_mandatory} onChange={e => updateGroup(gIndex, 'is_mandatory', e.target.checked)} />
                  Is Mandatory
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className={checkboxClass} checked={group.all_items_mandatory} onChange={e => updateGroup(gIndex, 'all_items_mandatory', e.target.checked)} />
                  All Items Mandatory
                </label>
              </div>
            </div>

            <div className="pl-6 border-l-2 border-primary/20 space-y-6">
              <h4 className="text-sm font-semibold mb-4">Items in {group.group_name || 'this group'}</h4>
              {group.items.map((item, iIndex) => (
                <div key={iIndex} className="relative bg-muted/30 p-4 rounded-md">
                   <button type="button" onClick={() => deleteItem(gIndex, iIndex)} className="absolute top-4 right-4 text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors">
                     <Trash2 size={14} />
                   </button>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pr-10">
                     <FieldWithHelp label="Item Code" description="Unique code for this item">
                       <input type="text" className={inputClass} value={item.item_code} onChange={e => updateItem(gIndex, iIndex, 'item_code', e.target.value)} />
                     </FieldWithHelp>
                     <FieldWithHelp label="Item Name" description="Name of the item">
                       <input type="text" className={inputClass} value={item.item_name} onChange={e => updateItem(gIndex, iIndex, 'item_name', e.target.value)} />
                     </FieldWithHelp>
                     <FieldWithHelp label="Unit of Measurement" description="e.g. Nos, Kgs, Liters">
                       <input type="text" className={inputClass} value={item.unit_of_measurement} onChange={e => updateItem(gIndex, iIndex, 'unit_of_measurement', e.target.value)} />
                     </FieldWithHelp>
                     <FieldWithHelp label="Quantity" description="Required quantity">
                       <input type="number" className={inputClass} value={item.quantity} onChange={e => updateItem(gIndex, iIndex, 'quantity', e.target.value)} />
                     </FieldWithHelp>
                     <FieldWithHelp label="Estimated Unit Price" description="Estimated price per unit">
                       <input type="number" className={inputClass} value={item.estimated_unit_price} onChange={e => updateItem(gIndex, iIndex, 'estimated_unit_price', e.target.value)} />
                     </FieldWithHelp>
                     <FieldWithHelp label="Make / Brand" description="Preferred make or brand">
                       <input type="text" className={inputClass} value={item.make_brand} onChange={e => updateItem(gIndex, iIndex, 'make_brand', e.target.value)} />
                     </FieldWithHelp>
                     <div className="col-span-1 md:col-span-2">
                       <FieldWithHelp label="Specifications" description="Detailed specifications for this item">
                         <textarea className={textareaClass} value={item.specifications} onChange={e => updateItem(gIndex, iIndex, 'specifications', e.target.value)} />
                       </FieldWithHelp>
                     </div>
                   </div>
                </div>
              ))}
              <button type="button" onClick={() => addItem(gIndex)} className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 px-4 py-2 border border-dashed border-primary rounded-md w-full justify-center">
                <Plus size={16} /> Add Item to Group
              </button>
            </div>
          </div>
        ))}
        
        <button type="button" onClick={addGroup} className="flex items-center gap-2 text-sm font-medium px-4 py-3 border-2 border-dashed border-muted-foreground/30 hover:border-primary rounded-md w-full justify-center transition-colors">
          <Plus size={16} /> Add Item Group
        </button>
      </div>
    </StepPage>
  )
}
