import React from 'react'
import { useTenderForm } from '../TenderFormContext'
import { SectionHeader, StepPage } from '../components/FieldWithHelp'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
const checkboxClass = "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export default function Step04Documents() {
  const { formData, updateField } = useTenderForm()

  const addDocument = () => {
    updateField('required_documents', [
      ...formData.required_documents,
      { id: Date.now().toString(), type: 'Qualification Document', description: '', is_mandatory: true }
    ])
  }

  const updateDocument = (index: number, field: string, value: any) => {
    const newDocs = [...formData.required_documents]
    newDocs[index] = { ...newDocs[index], [field]: value }
    updateField('required_documents', newDocs)
  }

  const removeDocument = (index: number) => {
    const newDocs = [...formData.required_documents]
    newDocs.splice(index, 1)
    updateField('required_documents', newDocs)
  }

  return (
    <StepPage>
      <SectionHeader 
        title="Required Documents" 
        subtitle="List all documents that bidders must submit with their tender." 
      />
      
      <div className="border rounded-lg bg-card overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
            <tr>
              <th className="px-4 py-3 w-16">S.No</th>
              <th className="px-4 py-3 w-64">Document Type</th>
              <th className="px-4 py-3">Document Description</th>
              <th className="px-4 py-3 w-28 text-center">Mandatory</th>
              <th className="px-4 py-3 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.required_documents.map((doc, index) => (
              <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{index + 1}</td>
                <td className="px-4 py-3">
                  <select 
                    className={inputClass}
                    value={doc.type}
                    onChange={(e) => updateDocument(index, 'type', e.target.value)}
                  >
                    <option value="Technical Bid">Technical Bid</option>
                    <option value="Financial Bid">Financial Bid</option>
                    <option value="Qualification Document">Qualification Document</option>
                    <option value="Experience Certificate">Experience Certificate</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Input 
                    value={doc.description}
                    onChange={(e) => updateDocument(index, 'description', e.target.value)}
                    placeholder="Enter document description..."
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={doc.is_mandatory}
                    onChange={(e) => updateDocument(index, 'is_mandatory', e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => removeDocument(index)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-4">
        <Button 
          variant="outline" 
          className="w-full border-dashed" 
          onClick={addDocument}
        >
          <Plus size={16} className="mr-2" />
          Add Document
        </Button>
      </div>
    </StepPage>
  )
}
