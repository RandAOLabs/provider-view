import React, { useState } from 'react'
import { FiPlus, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi'
import { WalletJson } from '../../utils/portalIntegration'

interface WalletInfo {
  walletJson: WalletJson | null
  isGenerating: boolean
  error: string | null
}

interface ExistingConfigStatus {
  seedPhrase: boolean
  providerId: boolean
  walletJson: boolean
}

interface WalletGenerationSectionProps {
  walletInfo: WalletInfo
  isCheckingExisting: boolean
  isGenerating: boolean
  generationStep: string
  error: string | null
  generatedSeedPhrase: string | null
  showSeedPhrase: boolean
  existingConfigStatus?: ExistingConfigStatus | null
  onGenerateAndInject: (forceOverwrite: boolean) => void
  onToggleShowSeedPhrase: () => void
}

export default function WalletGenerationSection({
  walletInfo,
  isCheckingExisting,
  isGenerating,
  generationStep,
  error,
  generatedSeedPhrase,
  showSeedPhrase,
  existingConfigStatus,
  onGenerateAndInject,
  onToggleShowSeedPhrase
}: WalletGenerationSectionProps) {
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false)

  // Check if there's existing data on device
  const hasExistingDataOnDevice = existingConfigStatus && 
    (existingConfigStatus.seedPhrase || existingConfigStatus.providerId || existingConfigStatus.walletJson)

  const handleOverwriteConfirm = () => {
    setShowOverwriteConfirm(false)
    onGenerateAndInject(true)
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
  }

  const handleShowOverwriteConfirm = () => {
    if (hasExistingDataOnDevice) {
      setShowOverwriteConfirm(true)
    } else {
      // If no existing data, generate directly
      onGenerateAndInject(false)
    }
  }
  return (
    <>
      {error && (
        <div className="env-vars-error">
          <p>{error}</p>
        </div>
      )}
      
      <div className="wallet-display">
        {isCheckingExisting ? (
          <div className="wallet-loading">
            <FiRefreshCw className="spinning" />
            Checking for existing configuration...
          </div>
        ) : (walletInfo.isGenerating || isGenerating) ? (
          <div className="wallet-loading">
            <FiRefreshCw className="spinning" />
            {generationStep || 'Generating wallet...'}
          </div>
        ) : walletInfo.error ? (
          <div className="wallet-error">
            <p>{walletInfo.error}</p>
            <small>Click refresh to try again</small>
          </div>
        ) : walletInfo.walletJson ? (
          <div className="wallet-success">
            <div className="wallet-item">
              <label>Provider ID:</label>
              <span className="address-value">
                {walletInfo.walletJson.address}
              </span>
            </div>
            {generatedSeedPhrase && (
              <div className="wallet-item">
                <label>Seed Phrase:</label>
                <div className="seed-phrase-container">
                  <span className="address-value" style={{fontSize: '0.85rem', wordBreak: 'break-word', filter: showSeedPhrase ? 'none' : 'blur(4px)'}}>
                    {generatedSeedPhrase}
                  </span>
                  <button 
                    onClick={onToggleShowSeedPhrase}
                    className="eye-button"
                    title={showSeedPhrase ? 'Hide seed phrase' : 'Show seed phrase'}
                  >
                    {showSeedPhrase ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            )}
            <div className="wallet-item">
              <label>Status:</label>
              <span className="json-value">
                ✓ Injected into RNG Miner
              </span>
            </div>
            <div className="wallet-item">
              <button 
                onClick={handleShowOverwriteConfirm}
                className="overwrite-button"
                disabled={isGenerating}
                title="Generate new seed phrase and overwrite existing data"
              >
                <FiRefreshCw />
                Make New Seed Phrase and Overwrite Old
              </button>
            </div>
          </div>
        ) : (
          <div className="wallet-placeholder">
            <p>Click "Generate Wallet and Inject into RNG Miner" to create a new wallet.</p>
            <button 
              onClick={handleShowOverwriteConfirm}
              className="generate-button"
              disabled={isGenerating}
              title="Generate wallet and inject into RNG miner"
            >
              <FiPlus />
              {isGenerating ? 'Generating...' : 'Generate Wallet and Inject into RNG Miner'}
            </button>
          </div>
        )}
      </div>

      {/* Overwrite Confirmation Modal - Only show if existing data on device */}
      {showOverwriteConfirm && hasExistingDataOnDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚠️ Warning: Overwrite Existing Data</h3>
            </div>
            <div className="modal-body">
              <p>This will overwrite the existing seed phrase, provider ID, and wallet data stored on your device.</p>
              <p><strong>This action cannot be undone.</strong></p>
              <p>Are you sure you want to continue?</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleOverwriteCancel}
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                onClick={handleOverwriteConfirm}
                className="confirm-button"
                disabled={isGenerating}
              >
                Yes, Overwrite Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
