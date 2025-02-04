import React from 'react'
import './ProviderDetailsForm.css'
import { ProviderDetails } from 'ao-process-clients/dist/src/clients/staking/abstract/types'

interface ProviderDetailsFormProps {
  initialValues?: ProviderDetails
  onSubmit: (details: ProviderDetails) => void
  submitLabel?: string
  isSubmitting?: boolean
}

export const ProviderDetailsForm: React.FC<ProviderDetailsFormProps> = ({
  initialValues = {},
  onSubmit,
  submitLabel = 'Save Changes',
  isSubmitting = false
}) => {
  const [formData, setFormData] = React.useState<ProviderDetails>({
    name: '',
    commission: 10,
    description: '',
    twitter: '',
    discord: '',
    telegram: '',
    domain: '',
    ...initialValues
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'commission' ? Math.min(100, Math.max(1, Number(value))) : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="provider-details-form">
      <div className="form-section">
        <h3>Provider Information</h3>
        
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Enter provider name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="commission">Commission (%) *</label>
          <input
            type="number"
            id="commission"
            name="commission"
            value={formData.commission}
            onChange={handleInputChange}
            min="1"
            max="100"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="Describe your provider service"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Social Links</h3>
        
        <div className="form-group">
          <label htmlFor="twitter">Twitter</label>
          <input
            type="text"
            id="twitter"
            name="twitter"
            value={formData.twitter}
            onChange={handleInputChange}
            placeholder="@username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="discord">Discord</label>
          <input
            type="text"
            id="discord"
            name="discord"
            value={formData.discord}
            onChange={handleInputChange}
            placeholder="username#0000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="telegram">Telegram</label>
          <input
            type="text"
            id="telegram"
            name="telegram"
            value={formData.telegram}
            onChange={handleInputChange}
            placeholder="@username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="domain">Website Domain</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain}
            onChange={handleInputChange}
            placeholder="example.com"
          />
        </div>
      </div>

      <button 
        type="submit" 
        className="submit-btn" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing...' : submitLabel}
      </button>
    </form>
  )
}
