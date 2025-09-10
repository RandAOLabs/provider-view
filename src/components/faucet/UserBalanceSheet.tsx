import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useProviders } from '../../contexts/ProviderContext';
import { aoHelpers } from '../../utils/ao-helpers';
import { GetUserInfoResponse } from 'ao-js-sdk';
import './UserBalanceSheet.css';

// RNG token has 9 decimal places
const TOKEN_DECIMALS = 9;

interface UserInfo {
  balance: string;
  createdAt: string;
}

// Helper function to ensure we always return a string balance
const ensureStringBalance = (balance: string | number | undefined): string => {
  if (balance === undefined) return '0';
  return typeof balance === 'number' ? balance.toString() : balance;
};

const UserBalanceSheet: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { currentProvider } = useProviders();
  const [rngBalance, setRngBalance] = useState<string>('0');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [prepayAmount, setPrepayAmount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
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
    setUserInfo(null);
    setError(null);
    setSuccess(null);
  };

  const fetchBalances = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch wallet balance
      const balance = await aoHelpers.getWalletBalance(address);
      setRngBalance(balance);
      
      // Fetch user info using aoHelpers function
      const info: GetUserInfoResponse = await aoHelpers.getUserInfo(address);
      setUserInfo({
        balance: ensureStringBalance(info.balance),
        createdAt: info.created_at ? new Date(info.created_at).toLocaleString() : 'N/A'
      });
    } catch (err: any) {
      console.error("Error fetching balance information:", err);
      setError(`Failed to fetch balance: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrepay = async () => {
    if (!isConnected || !address || prepayAmount <= 0) {
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
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
          <span className="balance-label">Wallet Balance:</span>
          <span className="balance-value">{isLoading ? 'Loading...' : formatBalance(rngBalance)} RNG</span>
        </div>
        
        {userInfo && (
          <div className="balance-row">
            <span className="balance-label">Prepaid Balance:</span>
            <span className="balance-value">{formatBalance(userInfo.balance)} RNG</span>
          </div>
        )}
        
        {userInfo && (
          <div className="balance-row">
            <span className="balance-label">Account Created:</span>
            <span className="balance-value">{userInfo.createdAt}</span>
          </div>
        )}
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
            disabled={isLoading}
          />
          <button 
            onClick={handlePrepay}
            disabled={isLoading || !isConnected}
            className={isLoading ? 'loading' : ''}
          >
            {isLoading ? 'Processing...' : 'Prepay RNG Tokens'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
      
      <button 
        className="refresh-button"
        onClick={fetchBalances}
        disabled={isLoading || !isConnected}
      >
        Refresh Balances
      </button>
    </div>
  );
};

export default UserBalanceSheet;
