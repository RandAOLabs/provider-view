import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import './StakingModal.css'

export const StakingModal = ({ provider, onClose }) => {
  const [amount, setAmount] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Implement staking logic
    console.log('Staking amount:', amount, 'for provider:', provider.name)
    onClose()
  }

  return (
    <div className="staking-modal-overlay" onClick={onClose}>
      <div className="staking-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="modal-header">
          <h2>Stake with {provider.name}</h2>
        </div>

        <div className="provider-info">
          <div className="info-item">
            <span className="label">Provider Address:</span>
            <span className="value">{provider.address}</span>
          </div>
          <div className="info-item">
            <span className="label">Delegation Fee:</span>
            <span className="value">{provider.delegationFee}%</span>
          </div>
          <div className="info-item">
            <span className="label">Total Staked:</span>
            <span className="value">{new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(provider.totalStaked)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="stake-amount">Stake Amount (USD)</label>
            <input
              id="stake-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to stake"
              required
            />
          </div>

          <div className="fee-calculation">
            <p>Estimated Monthly Rewards:</p>
            <p className="amount">{amount ? `$${(amount * 0.05).toFixed(2)}` : '$0.00'}</p>
            <p className="note">*Based on current network statistics</p>
          </div>

          <button type="submit" className="stake-button">
            Stake Now
          </button>
        </form>
      </div>
    </div>
  )
}
