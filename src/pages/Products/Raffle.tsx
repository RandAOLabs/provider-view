import React, { useState, useEffect } from 'react';
import { aoHelpers } from '../../utils/ao-helpers';
import { ViewPullsResponse, ViewEntrantsResponse } from 'ao-process-clients';
import { useWallet } from '../../contexts/WalletContext';
import './Raffle.css';

export const Raffle = () => {
  const { address: userId } = useWallet();
  const [entrants, setEntrants] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'json'>('text');
  const [formattedEntrants, setFormattedEntrants] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentEntrants, setCurrentEntrants] = useState<ViewEntrantsResponse | null>(null);
  const [userPulls, setUserPulls] = useState<ViewPullsResponse | null>(null);
  const [hasPendingPulls, setHasPendingPulls] = useState(false);

  const fetchRaffleData = async () => {
    try {
      const [entrantsResponse, pullsResponse] = await Promise.all([
        aoHelpers.viewEntrants(userId),
        aoHelpers.viewUserPulls(userId)
      ]);
      setCurrentEntrants(entrantsResponse);
      setUserPulls(pullsResponse);
      
      // Check if there are any pending pulls (Winner is null or empty)
      const pendingPulls = pullsResponse?.pulls.some(pull => !pull.Winner);
      setHasPendingPulls(pendingPulls || false);
    } catch (error) {
      console.error('Error fetching raffle data:', error);
    }
  };

  useEffect(() => {
    fetchRaffleData();
  }, [userId]);

  useEffect(() => {
    if (!hasPendingPulls) return;

    const interval = setInterval(fetchRaffleData, 3000); // Refresh every 3 seconds when there are pending pulls
    return () => clearInterval(interval);
  }, [hasPendingPulls, userId]);

  const formatEntrants = (input: string, mode: 'text' | 'json'): string[] => {
    try {
      if (mode === 'text') {
        return input
          .split('\n')
          .map(name => name.trim())
          .filter(name => name.length > 0);
      } else {
        const parsed = JSON.parse(input);
        if (!Array.isArray(parsed)) {
          throw new Error('Input must be an array');
        }
        return parsed;
      }
    } catch (error) {
      console.error('Error formatting entrants:', error);
      return [];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEntrants(newValue);
    setFormattedEntrants(formatEntrants(newValue, inputMode));
  };

  const handleModeToggle = () => {
    const newMode = inputMode === 'text' ? 'json' : 'text';
    setInputMode(newMode);
    
    if (newMode === 'text' && formattedEntrants.length > 0) {
      setEntrants(formattedEntrants.join('\n'));
    } else if (newMode === 'json' && entrants) {
      setEntrants(JSON.stringify(formattedEntrants, null, 2));
    }
  };

  const handleUpdateList = async () => {
    try {
      setActionLoading(true);
      await aoHelpers.setRaffleEntrants(formattedEntrants);
      // Refresh the entrants data after update
      const entrantsResponse = await aoHelpers.viewEntrants(userId);
      setCurrentEntrants(entrantsResponse);
    } catch (error) {
      console.error('Error updating raffle list:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePullRaffle = async () => {
    try {
      setActionLoading(true);
      await aoHelpers.pullRaffle();
      // Refresh both entrants and pulls data after pulling
      await fetchRaffleData();
    } catch (error) {
      console.error('Error pulling raffle:', error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="raffle-container">
      <h1>Raffle</h1>
      
      <div className="raffle-grid">
        <div className="raffle-section">
          <div className="input-header">
            <h2>Update Entrants List</h2>
            <button 
              onClick={handleModeToggle}
              className="mode-toggle"
            >
              Switch to {inputMode === 'text' ? 'JSON' : 'Text'} Mode
            </button>
          </div>
          
          <textarea
            value={entrants}
            onChange={handleInputChange}
            placeholder={inputMode === 'text' ? 
              "Enter names (one per line):\nJohn Smith\nMary Johnson" :
              'Enter JSON array:\n["John Smith", "Mary Johnson"]'
            }
            rows={10}
            disabled={actionLoading}
          />
          
          {formattedEntrants.length > 0 && (
            <div className="preview-section">
              <h3>Preview:</h3>
              <pre>{JSON.stringify(formattedEntrants, null, 2)}</pre>
            </div>
          )}

          <button 
            onClick={handleUpdateList}
            disabled={actionLoading}
            className="raffle-button update"
          >
            {actionLoading ? 'Updating...' : 'Update List'}
          </button>
        </div>

        {currentEntrants && (
          <div className="raffle-section scrollable">
            <h2>Current Raffle Entrants</h2>
            <div className="entrants-list">
              {Array.from(currentEntrants.entries()).map(([index, entrant]) => (
                <div key={index} className="entrant-item">
                  {entrant}
                </div>
              ))}
            </div>
          </div>
        )}

        {userPulls && userPulls.pulls.length > 0 && (
          <div className="raffle-section scrollable">
            <h2>Your Raffle Pulls</h2>
            <div className="winners-list">
              {userPulls.pulls.map((pull, index) => (
                <div key={index} className="winner-item">
                  <span className="winner-name">{pull.Winner || 'Pending...'}</span>
                  <span className="winner-id">Pull #{pull.Id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="raffle-section full-width">
        <h2>Pull Raffle Winner</h2>
        <button 
          onClick={handlePullRaffle}
          disabled={actionLoading}
          className="raffle-button pull"
        >
          {actionLoading ? 'Pulling...' : 'Pull Winner'}
        </button>
      </div>
    </div>
  );
};
