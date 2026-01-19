import React, { useState } from 'react';
import { aoHelpers } from '../../utils/ao-helpers';
import { useProviders } from '../../contexts/ProviderContext';
import { ConnectWallet } from '../../components/common/ConnectWallet';
import { Spinner } from '../../components/common/Spinner';
import { ButtonSpinner } from '../../components/common/ButtonSpinner';
import { ProviderInfoAggregate, MonitoringData, ProviderActivity } from 'ao-js-sdk';
import { useWallet } from '../../contexts/WalletContext';
import { FiCheck, FiRefreshCw, FiZap, FiMinus, FiInfo } from 'react-icons/fi';
import './Admin.css';
import { ProviderMonitoringDisplay } from '../../components/providers/ProviderMonitoringDisplay';

// Combined Provider Management Component
interface ProviderManagementProps {
  providers: ProviderInfoAggregate[];
  isConnected: boolean;
  isLoading: boolean;
  error: any;
  reinitializingProviders: { [key: string]: boolean };
  reinitSuccessProviders: { [key: string]: boolean };
  reinitAllLoading: boolean;
  onReinitializeAll: () => void;
  onRestartAll: () => void;
  onReinitializeProvider: (providerId: string) => void;
  onRestartProvider: (providerId: string) => void;
  onTurnOffProvider: (providerId: string) => void;
  connectedAddress?: string;
}

const ProviderManagement: React.FC<ProviderManagementProps> = ({
  providers,
  isConnected,
  isLoading,
  error,
  reinitializingProviders,
  reinitSuccessProviders,
  reinitAllLoading,
  onReinitializeAll,
  onRestartAll,
  onReinitializeProvider,
  onRestartProvider,
  onTurnOffProvider,
  connectedAddress,
}) => {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<string | null>(null);

  // Filter providers by search term
  const filteredProviders = providers.filter(provider => {
    const searchableText = `${provider.owner} ${provider.providerId} ${provider.providerInfo?.provider_details?.name || ''}`;
    return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  // Get monitoring data for a provider with enhanced logging
  const getProviderMonitoringData = (provider: ProviderInfoAggregate): MonitoringData | undefined => {
    try {
      const providerInfo = provider.providerActivity?.provider_info;
      
      // Log provider info to debug issues
      if (provider.providerId) {
        console.log(`Provider ${provider.providerId} monitoring data:`, 
          typeof providerInfo === 'string' ? 'String data (needs parsing)' : providerInfo);
      }
      
      // If provider_info is a string, try to parse it
      if (typeof providerInfo === 'string') {
        try {
          return JSON.parse(providerInfo) as MonitoringData;
        } catch (parseError) {
          console.error('Failed to parse provider_info string:', parseError);
          return undefined;
        }
      }
      
      return providerInfo as MonitoringData | undefined;
    } catch (error) {
      console.error('Error getting provider monitoring data:', error);
      return undefined;
    }
  };
  
  // Safe access helper for deep properties
  const safeGet = <T,>(obj: any, path: string, defaultValue: T): T => {
    try {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current === undefined || current === null) return defaultValue;
        current = current[part];
      }
      return (current === undefined || current === null) ? defaultValue : current as T;
    } catch (e) {
      console.log(`Error accessing path ${path}:`, e);
      return defaultValue;
    }
  };
  
  // Get selected provider for modal
  const getSelectedProvider = () => {
    if (!selectedProviderForModal) return null;
    return providers.find(p => p.providerId === selectedProviderForModal);
  };
  
  // Open modal with provider details
  const openProviderDetails = (providerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProviderForModal(providerId);
    setModalOpen(true);
  };


  return (
    <div className="provider-management-section">
      {/* Provider Details Modal */}
      {modalOpen && selectedProviderForModal && (
        <ProviderMonitoringDisplay 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          providerId={selectedProviderForModal}
          providerName={getSelectedProvider()?.providerInfo?.provider_details?.name || ''}
          monitoringData={getSelectedProvider() ? getProviderMonitoringData(getSelectedProvider()!) : undefined}
        />
      )}
      
      <div className="section-controls">
        <div className="main-controls">
          <button 
            className="reinit-all-button" 
            onClick={onReinitializeAll}
            disabled={reinitAllLoading || isLoading || providers.length === 0 || !isConnected}
          >
            {reinitAllLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <FiRefreshCw />
                <span>Reinitialize All Providers</span>
              </>
            )}
          </button>
          
          <button 
            className="reinit-all-button warning" 
            onClick={onRestartAll}
            disabled={reinitAllLoading || isLoading || providers.length === 0 || !isConnected}
          >
            {reinitAllLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <FiZap />
                <span>Restart All Providers</span>
              </>
            )}
          </button>
          
          <div className="view-toggle">
            <button 
              className={`view-button ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button 
              className={`view-button ${view === 'table' ? 'active' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search providers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>
      
      {/* Provider Grid/Table */}
      <div className="providers-panel">
        <h3>Providers</h3>
          
          {isLoading ? (
            <div className="loading-container">
              <Spinner text="Loading providers..." />
            </div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : filteredProviders.length === 0 ? (
            <div className="empty-state">No providers found</div>
          ) : view === 'grid' ? (
            <div className="provider-grid">
              {filteredProviders.map(provider => {
                const isReinitializing = reinitializingProviders[provider.providerId];
                const isReinitSuccess = reinitSuccessProviders[provider.providerId];
                const needsReinit = (provider.providerActivity?.random_balance || 0) < 0;
                const monitoringData = getProviderMonitoringData(provider);

                return (
                  <div
                    key={provider.providerId}
                    className={`provider-card ${needsReinit ? 'needs-reinit' : ''}`}
                  >
                    <div className="provider-name">
                      {provider.providerInfo?.provider_details?.name || provider.providerId.slice(0, 4) + '...' + provider.providerId.slice(-4)}
                      {monitoringData && (
                        <span className="provider-version">v{monitoringData.providerVersion}</span>
                      )}
                    </div>
                    <div 
                      className="provider-id" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(provider.providerId);
                        // Optional: Show a temporary tooltip or notification
                        const target = e.currentTarget;
                        target.setAttribute('data-copied', 'true');
                        setTimeout(() => target.removeAttribute('data-copied'), 1500);
                      }}
                      title="Click to copy full ID"
                    >
                      {provider.providerId.slice(0, 4)}...{provider.providerId.slice(-4)}
                    </div>
                      
                    <div className={`provider-status ${(provider.providerActivity?.random_balance || 0) > 0 ? 'status-active' : (provider.providerActivity?.random_balance || 0) === 0 ? 'status-off' : 'status-disabled'}`}>
                      <span className="status-text">
                        {(provider.providerActivity?.random_balance || 0) > 0 ? 'Active' : (provider.providerActivity?.random_balance || 0) === 0 ? 'Off' : 'Disabled'}
                        <span className="status-value"> ({provider.providerActivity?.random_balance || 0})</span>
                      </span>
                    </div>
                    
                    {connectedAddress === "N90q65iT59dCo01-gtZRUlLMX0w6_ylFHv2uHaSUFNk" && (
                      <div 
                        className="provider-info-button" 
                        title="View provider details"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProviderDetails(provider.providerId, e);
                        }}
                      >
                        <FiInfo className="info-icon" />
                      </div>
                    )}
                    
                    <div className="provider-metrics">
                      <div className="metric-row">
                        <div className="metric">
                          <span className="metric-label">Status:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'health.status', 'N/A')}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Uptime:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'systemSpecs.uptime', null) ? 
                              `${Math.floor(safeGet(monitoringData, 'systemSpecs.uptime', 0) / 3600)}h` : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="metric-row">
                        <div className="metric">
                          <span className="metric-label">Last Update:</span>
                          <span className={monitoringData ? "metric-value" : "metric-value missing"}>
                            {safeGet(monitoringData, 'timestamp', null) ? 
                              new Date(safeGet(monitoringData, 'timestamp', '')).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                        <div className="health-indicator" title="Provider health status">
                          <span className={`status-circle ${safeGet(monitoringData, 'health.status', 'unknown')}`}></span>
                          {safeGet(monitoringData, 'health.errorTotal', 0) > 0 && (
                            <span className="error-count" title={`${safeGet(monitoringData, 'health.errorTotal', 0)} errors detected`}>
                              {safeGet(monitoringData, 'health.errorTotal', 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="provider-actions">
                      <div className="action-buttons">
                        <button
                          className={`action-button ${needsReinit ? 'primary' : 'secondary'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReinitializeProvider(provider.providerId);
                          }}
                          disabled={isReinitializing}
                          title="Reinitialize provider (sets available to 0)"
                        >
                          {isReinitializing ? (
                            <ButtonSpinner />
                          ) : isReinitSuccess ? (
                            <FiCheck className="success-icon" />
                          ) : (
                            <FiRefreshCw />
                          )}
                        </button>
                        <button
                          className="action-button warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestartProvider(provider.providerId);
                          }}
                          disabled={isReinitializing}
                          title="Restart provider (sets available to -5)"
                        >
                          <FiZap />
                        </button>
                        <button
                          className="action-button danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTurnOffProvider(provider.providerId);
                          }}
                          disabled={isReinitializing}
                          title="Turn off provider (sets available to -3)"
                        >
                          <FiMinus />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="provider-table-container">
              <table className="provider-table">
                <thead>
                  <tr>
                    <th>Provider ID</th>
                    <th>Name</th>
                    <th>Random Available</th>
                    <th>Health</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map(provider => {
                    const isReinitializing = reinitializingProviders[provider.providerId];
                    const isReinitSuccess = reinitSuccessProviders[provider.providerId];
                    const needsReinit = (provider.providerActivity?.random_balance || 0) < 0;
                    const monitoringData = getProviderMonitoringData(provider);

                    return (
                      <tr key={provider.providerId} className={needsReinit ? 'needs-reinit' : ''}>
                        <td className="provider-id-cell">{provider.providerId}</td>
                        <td>
                          {provider.providerInfo?.provider_details?.name || provider.providerId.slice(0, 4) + '...' + provider.providerId.slice(-4)}
                          {monitoringData && (
                            <span className="provider-version">v{monitoringData.providerVersion}</span>
                          )}
                        </td>
                        <td className={needsReinit ? 'negative-balance' : ''}>
                          {provider.providerActivity?.random_balance || 0}
                        </td>
                        <td>
                          <div className="health-pill">
                            {monitoringData ? (
                              <>
                                <div className={`status-dot ${monitoringData.health.status}`}></div>
                                <span>{monitoringData.health.status}</span>
                              </>
                            ) : (
                              <>
                                <div className="status-dot missing"></div>
                                <span className="missing">N/A</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className="details-button"
                            onClick={(e) => openProviderDetails(provider.providerId, e)}
                            title="View provider details"
                          >
                            <FiInfo />
                          </button>
                          
                          {needsReinit && (
<div className="table-actions">
                              <button
                                className="action-button small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReinitializeProvider(provider.providerId);
                                }}
                                disabled={isReinitializing}
                                title="Reinitialize (0)"
                              >
                                {isReinitializing ? (
                                  <ButtonSpinner />
                                ) : isReinitSuccess ? (
                                  <FiCheck className="success-icon" />
                                ) : (
                                  <FiRefreshCw />
                                )}
                              </button>
                              <button
                                className="action-button small warning"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRestartProvider(provider.providerId);
                                }}
                                disabled={isReinitializing}
                                title="Restart (-5)"
                              >
                                <FiZap />
                              </button>
                              <button
                                className="action-button small danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTurnOffProvider(provider.providerId);
                                }}
                                disabled={isReinitializing}
                                title="Turn Off (-3)"
                              >
                                <FiMinus />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
};

export default function Admin() {
  // State for provider management
  const [reinitializing, setReinitializing] = useState<{ [key: string]: boolean }>({});
  const [reinitSuccess, setReinitSuccess] = useState<{ [key: string]: boolean }>({});
  const [reinitAllLoading, setReinitAllLoading] = useState(false);

  // Get providers data from context
  const { providers, loading, error } = useProviders();
  const { address: connectedAddress, isConnected, isConnecting, isReady } = useWallet();

  // Common function to handle provider actions
  const handleProviderAction = async (providerId: string, action: 'reinit' | 'restart' | 'turnOff') => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    // Determine the value to set based on action
    const actionValue = {
      reinit: 0,
      restart: -5,
      turnOff: -3
    }[action];

    // Get the provider info
    const provider = providers.find(p => p.providerId === providerId);
    if (!provider) {
      alert('Provider not found');
      return;
    }

    setReinitializing(prev => ({ ...prev, [providerId]: true }));
    setReinitSuccess(prev => ({ ...prev, [providerId]: false }));

    try {
      // Create a properly typed provider activity object
      const providerActivity = provider.providerActivity ? {
        ...provider.providerActivity,
        random_balance: actionValue,
        // Ensure required fields are present to satisfy the ProviderActivity type
        active_challenge_requests: provider.providerActivity.active_challenge_requests || [],
        active_output_requests: provider.providerActivity.active_output_requests || [],
        provider_id: provider.providerActivity.provider_id || providerId
      } : {
        // Create a minimal valid ProviderActivity if it doesn't exist
        random_balance: actionValue,
        active_challenge_requests: [],
        active_output_requests: [],
        provider_id: providerId,
        active: 0,
        created_at: Math.floor(Date.now() / 1000)
      };

      // Use the reinitProvider method with the appropriate target value
      await aoHelpers.reinitProvider(providerId, window.arweaveWallet, {
        ...provider,
        providerActivity: providerActivity as ProviderActivity
      });
      
      setReinitSuccess(prev => ({ ...prev, [providerId]: true }));
      
      // Reset success indicator after 3 seconds
      setTimeout(() => {
        setReinitSuccess(prev => {
          const newState = { ...prev };
          delete newState[providerId];
          return newState;
        });
      }, 3000);
    } catch (err) {
      console.error(`Error in ${action} provider:`, err);
      alert(`Failed to ${action} provider: ${err}`);
    } finally {
      setReinitializing(prev => {
        const newState = { ...prev };
        delete newState[providerId];
        return newState;
      });
    }
  };

  // Wrapper functions for each action type
  const handleReinitialize = (providerId: string) => handleProviderAction(providerId, 'reinit');
  const handleRestartProvider = (providerId: string) => handleProviderAction(providerId, 'restart');
  const handleTurnOffProvider = (providerId: string) => handleProviderAction(providerId, 'turnOff');

  const handleReinitializeAll = async () => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    setReinitAllLoading(true);
    const results = {
      success: [] as string[],
      failed: [] as Array<{id: string, reason: string}>
    };
    
    try {
      // Find all providers with random_balance = -2
      const providersToReinit = providers.filter(provider => 
        provider.providerActivity?.random_balance === -2
      );

      if (providersToReinit.length === 0) {
        alert('No providers with value -2 found for reinitialization.');
        return;
      }

      // Process all eligible providers in parallel
      await Promise.all(providersToReinit.map(async (provider) => {
        const providerId = provider.providerId;
        try {
          // Mark as in progress
          setReinitializing(prev => ({ ...prev, [providerId]: true }));
          
          // Use the reinitProvider method which sends the correct action format
          await aoHelpers.reinitProvider(providerId, window.arweaveWallet, provider);
          
          setReinitSuccess(prev => ({ ...prev, [providerId]: true }));
          results.success.push(providerId);
        } catch (err) {
          console.error(`Failed to reinitialize provider ${providerId}:`, err);
          results.failed.push({
            id: providerId,
            reason: err instanceof Error ? err.message : String(err)
          });
        } finally {
          setReinitializing(prev => {
            const newState = { ...prev };
            delete newState[providerId];
            return newState;
          });
        }
      }));
      
      // Prepare summary message
      let summary = '';
      
      // Add success message if any providers were reinitialized
      if (results.success.length > 0) {
        summary += `✅ Successfully reinitialized ${results.success.length} provider${results.success.length !== 1 ? 's' : ''}.`;
      }
      
      // Add failed providers information if any
      if (results.failed.length > 0) {
        if (summary) summary += '\n\n';
        summary += `❌ Failed to reinitialize ${results.failed.length} provider${results.failed.length !== 1 ? 's' : ''}:`;
        results.failed.forEach(failure => {
          summary += `\n- ${failure.id}: ${failure.reason}`;
        });
      }
      
      // Show the summary if there's something to report
      if (summary) {
        alert(summary);
      }
      
      // Clear success indicators after 3 seconds
      setTimeout(() => {
        setReinitSuccess({});
      }, 3000);
      
    } catch (err) {
      console.error('Unexpected error during bulk reinitialization:', err);
      alert('An error occurred during reinitialization. Please check the console for details.');
    } finally {
      setReinitAllLoading(false);
    }
  };

  const handleRestartAll = async () => {
    if (!isConnected || !window.arweaveWallet) {
      alert('Please connect your wallet first.');
      return;
    }

    setReinitAllLoading(true);
    const results = {
      success: [] as string[],
      failed: [] as Array<{id: string, reason: string}>
    };
    
    try {
      // Process all providers and set them to -5
      await Promise.all(providers.map(async (provider) => {
        const providerId = provider.providerId;
        try {
          // Mark as in progress
          setReinitializing(prev => ({ ...prev, [providerId]: true }));
          
          // Create a properly typed provider activity object with random_balance = -5
          const providerActivity = provider.providerActivity ? {
            ...provider.providerActivity,
            random_balance: -5,
            // Ensure required fields are present to satisfy the ProviderActivity type
            active_challenge_requests: provider.providerActivity.active_challenge_requests || [],
            active_output_requests: provider.providerActivity.active_output_requests || [],
            provider_id: provider.providerActivity.provider_id || providerId
          } : {
            // Create a minimal valid ProviderActivity if it doesn't exist
            random_balance: -5,
            active_challenge_requests: [],
            active_output_requests: [],
            provider_id: providerId,
            active: 0,
            created_at: Math.floor(Date.now() / 1000)
          };

          // Use the reinitProvider method with the appropriate target value
          await aoHelpers.reinitProvider(providerId, window.arweaveWallet, {
            ...provider,
            providerActivity: providerActivity as ProviderActivity
          });
          
          setReinitSuccess(prev => ({ ...prev, [providerId]: true }));
          results.success.push(providerId);
        } catch (err) {
          console.error(`Failed to restart provider ${providerId}:`, err);
          results.failed.push({
            id: providerId,
            reason: err instanceof Error ? err.message : String(err)
          });
        } finally {
          setReinitializing(prev => {
            const newState = { ...prev };
            delete newState[providerId];
            return newState;
          });
        }
      }));
      
      // Prepare summary message
      let summary = '';
      
      // Add success message if any providers were restarted
      if (results.success.length > 0) {
        summary += `✅ Successfully restarted ${results.success.length} provider${results.success.length !== 1 ? 's' : ''}.`;
      }
      
      // Add failed providers information if any
      if (results.failed.length > 0) {
        if (summary) summary += '\n\n';
        summary += `❌ Failed to restart ${results.failed.length} provider${results.failed.length !== 1 ? 's' : ''}:`;
        results.failed.forEach(failure => {
          summary += `\n- ${failure.id}: ${failure.reason}`;
        });
      }
      
      // Show the summary if there's something to report
      if (summary) {
        alert(summary);
      }
      
      // Clear success indicators after 3 seconds
      setTimeout(() => {
        setReinitSuccess({});
      }, 3000);
      
    } catch (err) {
      console.error('Unexpected error during bulk restart:', err);
      alert('An error occurred during restart. Please check the console for details.');
    } finally {
      setReinitAllLoading(false);
    }
  };


  return (
    <div className="providers-page">
      <main>
        <header className="page-header">
          <h1>RandAO Admin</h1>
          <ConnectWallet />
        </header>
        <div className="content">
          {isConnected && (
            <div className="admin-section provider-management-container">
              <h2>Provider Management</h2>
              <ProviderManagement
                providers={providers}
                isConnected={isConnected}
                isLoading={loading}
                error={error}
                reinitializingProviders={reinitializing}
                reinitSuccessProviders={reinitSuccess}
                reinitAllLoading={reinitAllLoading}
                onReinitializeAll={handleReinitializeAll}
                onRestartAll={handleRestartAll}
                onReinitializeProvider={handleReinitialize}
                onRestartProvider={handleRestartProvider}
                onTurnOffProvider={handleTurnOffProvider}
                connectedAddress={connectedAddress}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
