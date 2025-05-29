import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { FaucetClient } from 'ao-process-clients';
import UserBalanceSheet from '../components/UserBalanceSheet';
import './Faucet.css';

const Faucet: React.FC = () => {
  const { address, isConnected, connectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Function to handle faucet token exchange
  const handleFaucetExchange = async () => {
    if (!isConnected || !address) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);
    setSuccess(false);

    try {
      // Initialize the FaucetClient using defaultBuilder
      const faucetClient = (await FaucetClient.defaultBuilder()).build();
      
      // Use the faucet to exchange tokens
      const result = await faucetClient.useFaucet();
      
      // Handle successful transaction
      setTxHash(result.toString());
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      console.error("Faucet exchange error:", err);
      setError(`Failed to exchange tokens: ${err.message || "Unknown error"}`);
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="faucet-container">
      <h1>RNG Test Token Faucet</h1>
      
      <div className="faucet-card">
        <div className="faucet-info">
          <h2>Exchange AO for RNG Test Tokens</h2>
          <p>
            Use this faucet to exchange your AO tokens for RNG test tokens that you can use to:
          </p>
          <ul>
            <li>Become a RandAO provider</li>
            <li>Request random values for testing</li>
          </ul>
          
          <div className="exchange-rate">
            <div className="token-exchange">
              <span className="token-amount">0.1 AO</span>
              <span className="exchange-arrow">→</span>
              <span className="token-amount">10,000 RNG</span>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <button 
            className="connect-wallet-button" 
            onClick={connectWallet}
          >
            Connect Wallet to Use Faucet
          </button>
        ) : (
          <button 
            className={`faucet-button ${isLoading ? 'loading' : ''}`}
            onClick={handleFaucetExchange}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Exchange 0.1 AO for 10,000 RNG Tokens'}
          </button>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <h3>Success! You've received 10,000 RNG Test Tokens</h3>
            {txHash && (
              <p className="tx-hash">
                Transaction: <span>{txHash}</span>
              </p>
            )}
            <p>You can now use these tokens to become a provider or request random values.</p>
          </div>
        )}
      </div>
      
      {isConnected && <UserBalanceSheet />}
    </div>
  );
};

export default Faucet;
