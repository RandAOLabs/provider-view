import React, { useState, useEffect } from 'react';
import { aoHelpers } from '../../utils/ao-helpers';
import { ViewPullsResponse, ViewEntrantsResponse } from 'ao-js-sdk';
import { useWallet } from '../../contexts/WalletContext';
import { ConnectWallet } from '../../components/common/ConnectWallet';
import { raffleRandomResponses, pullIdToMessage } from '../../utils/graphQLquery';
import { saveAs } from 'file-saver';
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
  const [expandedPulls, setExpandedPulls] = useState<number[]>([]);
  const [messageIds, setMessageIds] = useState<{[key: number]: string}>({});
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    // Fetch raffle random responses when component mounts
    raffleRandomResponses().then(responses => {
      console.log('Raffle random responses:', responses);
    });
  }, []);

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
      // Clear the form and preview
      setEntrants('');
      setFormattedEntrants([]);
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

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      
      // Collect all pull data
      const exportData = {
        pulls: userPulls?.pulls || [],
        messageDetails: {}
      };

      // Fetch message details for all pulls
      if (userPulls?.pulls) {
        for (const pull of userPulls.pulls) {
          if (pull.Winner) { // Only fetch for completed pulls
            const response = await pullIdToMessage(pull.Id.toString(), userId);
            if (response.length > 0) {
              exportData.messageDetails[pull.Id] = response[0].node;
            }
          }
        }
      }

      // Create and download file
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'randomdraw-data.txt');
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExpand = async (pullId: number) => {
    const expanded = expandedPulls.includes(pullId);
    if (expanded) {
      setExpandedPulls(expandedPulls.filter(id => id !== pullId));
    } else {
      setExpandedPulls([...expandedPulls, pullId]);
      // Fetch message when expanding
      const response = await pullIdToMessage(pullId.toString(), userId);
      if (response.length > 0) {
        const messageId = response[0].node.id;
        setMessageIds(prev => ({ ...prev, [pullId]: messageId }));
        console.log(`Message ID for pull ${pullId}:`, messageId);
      }
    }
  };

  return (
    <div className="raffle-container">
      <header className="raffle-header">
        <h1>Random Draw</h1>
        <ConnectWallet />
      </header>
      
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
            <h2>Current Random Draw Entrants</h2>
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
            <h2>Your Random Draws</h2>
            <div className="winners-list">
              {userPulls.pulls.map((pull, index) => (
                <div key={index} className="winner-item">
                  <div className="winner-main">
                    <span className="winner-name">{pull.Winner || 'Pending...'}</span>
                    <span className="winner-id">Draw #{pull.Id}</span>
                    {pull.Winner && (
                      <button 
                        className="expand-button"
                        onClick={() => handleExpand(pull.Id)}
                      >
                        {expandedPulls.includes(pull.Id) ? '▼' : '▶'}
                      </button>
                    )}
                  </div>
                  {pull.Winner && expandedPulls.includes(pull.Id) && (
                    <div className="winner-details">
                      {messageIds[pull.Id] && (
                        <a 
                          href={`https://www.ao.link/#/message/${messageIds[pull.Id]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-link"
                        >
                          View Message Details
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="raffle-section full-width">
        <h2>Draw Winner</h2>
        <div className="button-group">
          <button 
            onClick={handlePullRaffle}
            disabled={actionLoading || exportLoading}
            className="raffle-button pull"
          >
            {actionLoading ? 'Drawing...' : 'Draw Winner'}
          </button>
          <button
            onClick={handleExportData}
            disabled={actionLoading || exportLoading || !userPulls?.pulls.length}
            className="raffle-button export"
          >
            {exportLoading ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
