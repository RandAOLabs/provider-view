import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { aoHelpers, TOKEN_DECIMALS } from '../../utils/ao-helpers';
import { RNGToken } from 'ao-js-sdk';
import { FiRefreshCw, FiSend, FiCheck } from 'react-icons/fi';
import { ButtonSpinner } from '../common/ButtonSpinner';
import './SendTokens.css';

const SendTokens: React.FC = () => {
  const { address: connectedAddress, isConnected } = useWallet();
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState<boolean>(false);
  const [transferSuccess, setTransferSuccess] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    if (!connectedAddress || !isConnected) return;

    setLoadingBalance(true);
    try {
      const balance = await aoHelpers.getWalletBalance(connectedAddress);
      setWalletBalance(balance);
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (connectedAddress && isConnected) {
      fetchWalletBalance();
    }
  }, [connectedAddress, isConnected]);

  const handleSendTokens = async () => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!recipientAddress) {
      setTransferError('Please enter a recipient address.');
      return;
    }

    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferError('Please enter a valid amount.');
      return;
    }

    setTransferLoading(true);
    setTransferSuccess(false);
    setTransferError(null);

    try {
      const amount = parseFloat(transferAmount);
      const tokenAmount = (amount * Math.pow(10, TOKEN_DECIMALS)).toString();

      const tokenClient = await RNGToken.defaultBuilder().build();
      await tokenClient.transfer(recipientAddress, tokenAmount);

      setTransferSuccess(true);
      setRecipientAddress('');
      setTransferAmount('');

      setTimeout(() => {
        fetchWalletBalance();
        setTransferSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending tokens:', err);
      setTransferError(`Failed to send tokens: ${err}`);
    } finally {
      setTransferLoading(false);
    }
  };

  const formatBalance = (balanceStr: string) => {
    try {
      const balanceNum = parseFloat(balanceStr) / Math.pow(10, TOKEN_DECIMALS);
      return balanceNum.toLocaleString(undefined, { maximumFractionDigits: 6 });
    } catch (e) {
      return '0';
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="send-tokens-section">
      <h2>Send RANDAO Tokens</h2>
      <div className="balance-display">
        <span>Your Balance: </span>
        {loadingBalance ? (
          <span className="loading-text">Loading...</span>
        ) : (
          <span className="token-balance">{formatBalance(walletBalance)} RANDAO</span>
        )}
        <button onClick={fetchWalletBalance} className="refresh-button">
          <FiRefreshCw />
        </button>
      </div>
      <div className="transfer-form">
        <div className="form-group">
          <label htmlFor="recipient">Recipient Address:</label>
          <input
            type="text"
            id="recipient"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Enter recipient wallet address"
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="Enter amount to send"
            min="0"
            step="0.000001"
          />
        </div>
        <button
          className="send-button"
          onClick={handleSendTokens}
          disabled={transferLoading || !recipientAddress || !transferAmount}
        >
          {transferLoading ? (
            <ButtonSpinner />
          ) : transferSuccess ? (
            <><FiCheck className="success-icon" /> Sent!</>
          ) : (
            <><FiSend /> Send Tokens</>
          )}
        </button>
        {transferError && <div className="error-message">{transferError}</div>}
      </div>
    </div>
  );
};

export default SendTokens;
