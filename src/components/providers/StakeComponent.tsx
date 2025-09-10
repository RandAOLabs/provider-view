import React, { useState, useEffect } from 'react'
import { MINIMUM_STAKE_AMOUNT, TOKEN_DECIMALS } from '../../utils/ao-helpers'

interface StakeComponentProps {
  currentStake?: string; // Raw stake amount from blockchain
  walletBalance?: string | null; // Raw wallet balance
  isEditing?: boolean;
  onStakeChange?: (newStakeAmount: string) => void; // Callback with raw amount
  className?: string;
}

export const StakeComponent: React.FC<StakeComponentProps> = ({
  currentStake = '0',
  walletBalance,
  isEditing = false,
  onStakeChange,
  className = ''
}) => {
  // Convert raw values to display values
  const rawToDisplay = (raw: string): number => {
    return parseFloat(raw) / Math.pow(10, TOKEN_DECIMALS);
  };

  const displayToRaw = (display: number): string => {
    return Math.floor(display * Math.pow(10, TOKEN_DECIMALS)).toString();
  };

  // Current stake in display format
  const currentStakeDisplay = rawToDisplay(currentStake);
  const minimumRequired = rawToDisplay(MINIMUM_STAKE_AMOUNT.toString());
  const availableBalance = walletBalance ? rawToDisplay(walletBalance) : 0;
  
  // Calculate how much more is needed to reach minimum
  const neededForMinimum = Math.max(0, minimumRequired - currentStakeDisplay);
  
  // Additional stake amount (what user wants to add)
  const [additionalStake, setAdditionalStake] = useState<number>(0);
  
  // Reset additional stake when switching modes
  useEffect(() => {
    if (!isEditing) {
      setAdditionalStake(0);
    } else {
      // Default to what's needed for 10k, or 0 if already at 10k
      setAdditionalStake(neededForMinimum);
    }
  }, [isEditing, neededForMinimum]);

  // Notify parent of changes
  useEffect(() => {
    if (onStakeChange && additionalStake > 0) {
      onStakeChange(displayToRaw(additionalStake));
    } else if (onStakeChange && additionalStake === 0) {
      onStakeChange('0');
    }
  }, [additionalStake, onStakeChange]);

  const handleDecrease = () => {
    setAdditionalStake(prev => Math.max(0, prev - 1000));
  };

  const handleIncrease = () => {
    const maxIncrease = availableBalance - additionalStake;
    if (maxIncrease >= 1000) {
      setAdditionalStake(prev => prev + 1000);
    }
  };

  const handleMax = () => {
    setAdditionalStake(availableBalance);
  };


  return (
    <div className={`stake-component ${className}`}>
      {/* Current Balance Display */}
      <div className="current-balance">
        <span className="label">Current Stake:</span>
        <span className="value">{currentStakeDisplay.toLocaleString()}</span>
      </div>

      {/* Stake Controls - Only show when editing */}
      {isEditing && (
        <div className="stake-controls">
          <button 
            className="control-btn decrease"
            onClick={handleDecrease}
            disabled={additionalStake <= 0}
            title="Decrease by 1,000"
          >
            ↓
          </button>
          
          <div className="stake-display">
            <span className="increase-value">{additionalStake.toLocaleString()}</span>
          </div>
          <button 
            className="control-btn increase"
            onClick={handleIncrease}
            disabled={additionalStake + 1000 > availableBalance}
            title="Increase by 1,000"
          >
            ↑
          </button>
          
          <button 
            className="max-btn"
            onClick={handleMax}
            disabled={availableBalance <= 0}
            title="Stake maximum available balance"
          >
            Max
          </button>
        </div>
      )}

      <style>{`
        .stake-component {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: #ffffff;
        }

        .current-balance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${isEditing ? '12px' : '0'};
          padding-bottom: ${isEditing ? '12px' : '0'};
          border-bottom: ${isEditing ? '1px solid #e2e8f0' : 'none'};
        }

        .label {
          font-weight: 500;
          color: #64748b;
          font-size: 14px;
        }

        .value {
          font-weight: 600;
          color: #1e293b;
          font-size: 14px;
        }

        .stake-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-btn {
          width: 28px;
          height: 28px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #ffffff;
          color: #000000;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 14px;
        }

        .control-btn:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .control-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: #f9fafb;
        }

        .stake-display {
          flex: 1;
          text-align: center;
          padding: 0;
          border: none;
          background: transparent;
          min-height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .increase-value {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }

        .max-btn {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: #ffffff;
          color: #374151;
          cursor: pointer;
          font-weight: 500;
          font-size: 12px;
          transition: all 0.2s;
          height: 28px;
          display: flex;
          align-items: center;
        }

        .max-btn:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .max-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: #f9fafb;
        }
      `}</style>
    </div>
  );
};
