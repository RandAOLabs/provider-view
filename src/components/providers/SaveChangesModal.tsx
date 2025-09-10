import React from 'react'
import './SaveChangesModal.css'

interface SaveChangesModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  changes: {
    field: string
    before: string
    after: string
  }[]
}

export const SaveChangesModal: React.FC<SaveChangesModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  changes
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content save-changes-modal">
        <div className="modal-header">
          <h3>Confirm Changes</h3>
        </div>
        
        <div className="modal-body">
          <p>You are about to save the following changes:</p>
          
          <div className="changes-list">
            {changes.map((change, index) => (
              <div key={index} className="change-item">
                <div className="change-field">{change.field}:</div>
                <div className="change-comparison">
                  <div className="before-value">
                    <span className="label">Before:</span>
                    <span className="value">{change.before || '(empty)'}</span>
                  </div>
                  <div className="after-value">
                    <span className="label">After:</span>
                    <span className="value">{change.after || '(empty)'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="confirmation-text">
            Are you sure you want to save these changes?
          </p>
        </div>
        
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn" onClick={onConfirm}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
