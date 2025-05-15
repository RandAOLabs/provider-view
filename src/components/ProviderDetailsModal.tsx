import React, { useState } from 'react';
import { FiX, FiServer, FiCpu, FiHardDrive, FiActivity, FiHash, FiPower } from 'react-icons/fi';
import { BiRefresh } from 'react-icons/bi';
import { ProviderMonitoringData } from '../types/monitoring';
import { aoHelpers } from '../utils/ao-helpers';
import './ProviderDetailsModal.css';

interface ProviderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  monitoringData?: ProviderMonitoringData;
  providerIsActive?: boolean;
  availableRandom?: number | null;
}

export const ProviderDetailsModal: React.FC<ProviderDetailsModalProps> = ({
  isOpen,
  onClose,
  providerId,
  providerName,
  monitoringData,
  providerIsActive = true,
  availableRandom = null
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [providerStatus, setProviderStatus] = useState(availableRandom);
  if (!isOpen) return null;
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Helper function to format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };
  
  // Handle provider status toggle
  const handleUpdateProviderStatus = async (value: number) => {
    setIsUpdatingStatus(true);
    setStatusUpdateSuccess(false);
    try {
      // Call the helper function to update provider status
      const result = await aoHelpers.updateProviderAvalibleRandom(value);
      if (result) {
        setProviderStatus(value);
        setStatusUpdateSuccess(true);
        setTimeout(() => setStatusUpdateSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating provider status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  // Get message based on available random value
  const getStatusMessage = () => {
    if (providerStatus === -1) {
      return {
        message: "Provider has been turned off by user",
        action: "Click here to turn back on",
        value: 0,
        className: "provider-status-user-off"
      };
    } else if (providerStatus === -2) {
      return {
        message: "Provider has been turned off by random process",
        subMessage: "Your provider failed to meet requirements. Contact team for more info.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-process-off"
      };
    } else if (providerStatus === -3) {
      return {
        message: "Provider has been turned off by team",
        subMessage: "Contact team if you don't know why.",
        action: "Turn back on",
        value: 0,
        className: "provider-status-team-off"
      };
    } else {
      return {
        message: `Provider is active`,
        subMessage: `${providerStatus !== null ? `Available random values: ${providerStatus}` : ''}`,
        action: "Turn off provider",
        value: -1,
        className: "provider-status-active"
      };
    }
  };

  // If no monitoring data is available
  if (!monitoringData) {
    return (
      <div className="modal-overlay">
        <div className="modal-container">
          <div className="modal-header">
            <h2>{providerName || providerId.slice(0, 10) + '...'}</h2>
            <button className="close-button" onClick={onClose}><FiX /></button>
          </div>
          <div className="modal-content">
            <p className="no-data-message">No monitoring data available for this provider.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{providerName || providerId.slice(0, 10) + '...'}</h2>
          <div className="provider-version">v{monitoringData.providerVersion || 'unknown'}</div>
          <button className="close-button" onClick={onClose}><FiX /></button>
        </div>
        
        <div className="modal-content">
          {/* Provider Status Toggle - Moved to top */}
          <div className="provider-status-section">
            {providerStatus !== null ? (
              <div className={`provider-status ${getStatusMessage().className}`}>
                <div className="status-message">
                  <div>
                    <p><strong>{getStatusMessage().message}</strong></p>
                    {getStatusMessage().subMessage && (
                      <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                        {getStatusMessage().subMessage}
                      </p>
                    )}
                  </div>
                  <button 
                    className="status-action-btn"
                    onClick={() => handleUpdateProviderStatus(getStatusMessage().value)}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <span className="loading-spinner"><BiRefresh className="spin" /></span>
                    ) : (
                      <>
                        <FiPower /> {getStatusMessage().action}
                      </>
                    )}
                  </button>
                  {statusUpdateSuccess && (
                    <div className="success-message">Provider status updated successfully!</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="detail-value">Loading status...</div>
            )}
          </div>
          
          <div className="modal-section">
            <h3><FiCpu className="section-icon" /> System Specs</h3>
            <div className="detail-grid">

              <div className="detail-item">
                <span className="detail-label">Architecture</span>
                <span className="detail-value">{monitoringData.systemSpecs?.arch || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">CPU Cores</span>
                <span className="detail-value">{monitoringData.systemSpecs?.cpuCount || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Memory</span>
                <span className="detail-value">{monitoringData.systemSpecs?.memoryTotalBytes ? formatBytes(monitoringData.systemSpecs.memoryTotalBytes) : 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Token</span>
                <span className="detail-value">{monitoringData.systemSpecs?.token || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div className="modal-section">
            <h3><FiActivity className="section-icon" /> Performance</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Load Average (1m/5m/15m)</span>
                <span className="detail-value">
                  {monitoringData.performance?.loadAverage ? monitoringData.performance.loadAverage.map(load => load.toFixed(2)).join(' / ') : 'Unknown'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Memory Used</span>
                <span className="detail-value">{monitoringData.performance?.memoryUsedPercent ? formatPercentage(monitoringData.performance.memoryUsedPercent) : 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Disk Used</span>
                <span className="detail-value">{monitoringData.performance?.diskUsedPercent ? formatPercentage(monitoringData.performance.diskUsedPercent) : 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Network Rx/Tx</span>
                <span className="detail-value">
                  {monitoringData.performance?.network ? `${formatBytes(monitoringData.performance.network.rxBytes)} / ${formatBytes(monitoringData.performance.network.txBytes)}` : 'Unknown'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Overall Execution Time</span>
                <span className="detail-value">{monitoringData.executionMetrics?.stepTimingsMs?.overall ? `${monitoringData.executionMetrics.stepTimingsMs.overall.toFixed(1)}ms` : 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          <div className="modal-section">
            <h3>Step Timing Breakdown</h3>
            <div className="step-timing-grid">
              {monitoringData.executionMetrics?.stepTimingsMs ? Object.entries(monitoringData.executionMetrics.stepTimingsMs)
                .filter(([key]) => key !== 'overall')
                .map(([step, time]) => (
                  <div key={step} className="step-timing-item">
                    <div className="step-name">{step}</div>
                    <div className="step-time">{time.toFixed(1)}ms</div>
                    <div className="step-bar-container">
                      <div 
                        className="step-bar" 
                        style={{
                          width: `${Math.min(100, (time / monitoringData.executionMetrics.stepTimingsMs.overall) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                ))
              : <div>No step timing data available</div>}
            </div>
          </div>
          
          <div className="modal-section health-section">
            <h3>Health Status</h3>
            <div className={`health-status ${monitoringData.health?.status === 'healthy' ? 'status-healthy' : 'status-warning'}`}>
              <div className="status-indicator"></div>
              <span className="status-text">{monitoringData.health?.status ? monitoringData.health.status.toUpperCase() : 'UNKNOWN'}</span>
              <span className="error-count">Errors: {monitoringData.health?.errors !== undefined ? monitoringData.health.errors : '?'}</span>
            </div>
          </div>
          
          {/* Provider Status section removed from here since it's moved to the top */}
        </div>
      </div>
    </div>
  );
};

export default ProviderDetailsModal;
