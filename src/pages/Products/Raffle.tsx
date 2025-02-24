import React, { useState, useEffect } from 'react';
import { aoHelpers } from '../../utils/ao-helpers';
import { RafflePull } from 'ao-process-clients/dist/src/clients/miscellaneous/raffle/abstract/types';
import './Raffle.css';

export const Raffle = () => {
  const [entrants, setEntrants] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'json'>('text');
  const [formattedEntrants, setFormattedEntrants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulls, setPulls] = useState<RafflePull[]>([]);

  useEffect(() => {
    const fetchPulls = async () => {
      try {
        const result = await aoHelpers.checkRaffle();
        setPulls(result.pulls || []);
      } catch (error) {
        console.error('Error fetching raffle pulls:', error);
      }
    };

    fetchPulls();
    const interval = setInterval(fetchPulls, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
      setLoading(true);
      await aoHelpers.updateRaffleList(formattedEntrants);
    } catch (error) {
      console.error('Error updating raffle list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePullRaffle = async () => {
    try {
      setLoading(true);
      await aoHelpers.pullRaffle();
    } catch (error) {
      console.error('Error pulling raffle:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="raffle-container">
      <h1>Raffle</h1>
      
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
          disabled={loading}
        />
        
        {formattedEntrants.length > 0 && (
          <div className="preview-section">
            <h3>Current Entrants:</h3>
            <pre>{JSON.stringify(formattedEntrants, null, 2)}</pre>
          </div>
        )}

        <button 
          onClick={handleUpdateList}
          disabled={loading}
          className="raffle-button update"
        >
          {loading ? 'Updating...' : 'Update List'}
        </button>
      </div>

      <div className="raffle-section">
        <h2>Pull Raffle Winner</h2>
        <button 
          onClick={handlePullRaffle}
          disabled={loading}
          className="raffle-button pull"
        >
          {loading ? 'Pulling...' : 'Pull Winner'}
        </button>
      </div>

      {pulls.length > 0 && (
        <div className="raffle-section">
          <h2>Raffle Winners</h2>
          <div className="winners-list">
            {pulls.map((pull, index) => (
              <div key={index} className="winner-item">
                <span className="winner-name">{pull.Winner || 'Pending...'}</span>
                <span className="winner-id">
                  Pull #{pull.Id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
