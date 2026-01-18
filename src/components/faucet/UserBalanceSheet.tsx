import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { aoHelpers } from '../../utils/ao-helpers';
import { GetUserInfoResponse } from 'ao-js-sdk';
import './UserBalanceSheet.css';

// RNG token has 9 decimal places
const TOKEN_DECIMALS = 9;

// Helper function to ensure we always return a string balance
const ensureStringBalance = (balance: string | number | undefined): string => {
  if (balance === undefined) return '0';
  return typeof balance === 'number' ? balance.toString() : balance;
};

const UserBalanceSheet: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [rngBalance, setRngBalance] = useState<string>('0');
  const [aoBalance, setAoBalance] = useState<string>('0');
  const [prepaidBalance, setPrepaidBalance] = useState<string>('0');
  const [prepayAmount, setPrepayAmount] = useState<number>(1);
  const [isLoadingRng, setIsLoadingRng] = useState(false);
  const [isLoadingAo, setIsLoadingAo] = useState(false);
  const [isLoadingPrepaid, setIsLoadingPrepaid] = useState(false);
  const [isPrepaying, setIsPrepaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    } else {
      resetState();
    }
  }, [isConnected, address]);

  const resetState = () => {
    setRngBalance('0');
    setAoBalance('0');
    setPrepaidBalance('0');
    setError(null);
    setSuccess(null);
  };

  const fetchBalances = async () => {
    if (!address) return;

    setError(null);

    // Fetch all balances in parallel - each updates independently when it completes
    const fetchRngBalance = async () => {
      setIsLoadingRng(true);
      try {
        const balance = await aoHelpers.getWalletBalance(address);
        setRngBalance(balance);
      } catch (err: any) {
        console.error("Error fetching RNG balance:", err);
        setError(prev => prev ? `${prev}\nFailed to fetch RNG balance` : "Failed to fetch RNG balance");
      } finally {
        setIsLoadingRng(false);
      }
    };

    const fetchAoBalance = async () => {
      setIsLoadingAo(true);
      try {
        const aoBalanceValue = await aoHelpers.getAOWalletBalance(address);
        setAoBalance(aoBalanceValue);
      } catch (err: any) {
        console.error("Error fetching AO balance:", err);
        setError(prev => prev ? `${prev}\nFailed to fetch AO balance` : "Failed to fetch AO balance");
      } finally {
        setIsLoadingAo(false);
      }
    };

    const fetchPrepaidBalance = async () => {
      setIsLoadingPrepaid(true);
      try {
        const info: GetUserInfoResponse = await aoHelpers.getUserInfo(address);
        setPrepaidBalance(ensureStringBalance(info.balance));
      } catch (err: any) {
        console.error("Error fetching prepaid balance:", err);
        setError(prev => prev ? `${prev}\nFailed to fetch prepaid balance` : "Failed to fetch prepaid balance");
      } finally {
        setIsLoadingPrepaid(false);
      }
    };

    // Execute all fetches in parallel - each updates UI as soon as it completes
    Promise.allSettled([
      fetchRngBalance(),
      fetchAoBalance(),
      fetchPrepaidBalance()
    ]);
  };

  const handlePrepay = async () => {
    if (!isConnected || !address || prepayAmount <= 0) {
      return;
    }

    setIsPrepaying(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert user-friendly amount to raw amount with 9 decimals
      const rawAmount = Math.floor(prepayAmount * Math.pow(10, TOKEN_DECIMALS));

      // Use aoHelpers function instead of direct getRandomClient call
      const result = await aoHelpers.prepayTokens(rawAmount, address);

      if (result) {
        setSuccess(`Successfully prepaid ${prepayAmount} RNG tokens for future random requests.`);
        // Refresh balances
        fetchBalances();
      } else {
        setError("Prepayment failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Prepay error:", err);
      setError(`Failed to prepay: ${err.message || "Unknown error"}`);
    } finally {
      setIsPrepaying(false);
    }
  };

  const formatBalance = (balance: string): string => {
    try {
      // Convert the raw balance (with 9 decimals) to a human-readable format
      const num = parseFloat(balance) / Math.pow(10, TOKEN_DECIMALS);
      return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    } catch (err) {
      return balance;
    }
  };

  if (!isConnected) {
    return null; // Don't render anything if not connected
  }

  return (
    <div className="balance-sheet-container">
      <h2>Your RNG Token Balance</h2>
      
      <div className="balance-info">
        <div className="balance-row">
          <span className="balance-label">AO Balance:</span>
          <span className="balance-value">{isLoadingAo ? 'Loading...' : formatBalance(aoBalance)} AO</span>
        </div>

        <div className="balance-row">
          <span className="balance-label">RNG Wallet Balance:</span>
          <span className="balance-value">{isLoadingRng ? 'Loading...' : formatBalance(rngBalance)} RNG</span>
        </div>

        <div className="balance-row">
          <span className="balance-label">RNG Prepaid Balance:</span>
          <span className="balance-value">
            {isLoadingPrepaid ? 'Loading...' : formatBalance(prepaidBalance)} RNG
          </span>
        </div>
      </div>

      <div className="prepay-section">
        <h3>Prepay for Random Values</h3>
        <p>Pre-purchase RNG tokens for future random value requests without requiring a transaction each time.</p>
        
        <div className="prepay-input-group">
          <input
            type="number"
            min="1"
            placeholder="Amount to prepay"
            value={prepayAmount}
            onChange={(e) => setPrepayAmount(Math.max(1, parseInt(e.target.value) || 0))}
            disabled={isPrepaying}
          />
          <button
            onClick={handlePrepay}
            disabled={isPrepaying || !isConnected}
            className={isPrepaying ? 'loading' : ''}
          >
            {isPrepaying ? 'Processing...' : 'Prepay RNG Tokens'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
};

export default UserBalanceSheet;
