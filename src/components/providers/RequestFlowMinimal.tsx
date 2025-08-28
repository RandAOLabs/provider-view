import React, { useState, useEffect, useRef } from 'react';
import { FiAlertTriangle, FiCheck, FiArrowRight, FiClock, FiPause, FiPlay, FiCopy, FiChevronDown } from 'react-icons/fi';
import { useRequests, RequestNode } from '../../contexts/RequestsContext';
import './RequestFlowVisualizer.css';

// Ultra-lightweight request flow visualization that's completely self-contained
interface RequestFlowMinimalProps {
  providerId?: string;
  isMinimizable?: boolean;
  title?: string;
}

export function RequestFlowMinimal({ providerId, isMinimizable = false, title = "Request Flow Visualization" }: RequestFlowMinimalProps = {}) {
  // Get data from global context
  const requestsContext = useRequests();
  
  // Local state for UI-specific functionality
  const [localState, setLocalState] = useState({
    lastCopiedId: '', // Track last copied ID for visual feedback
    lastCopiedProviders: '', // Track last copied providers for visual feedback
    isExpanded: !isMinimizable // Start expanded if not minimizable
  });
  
  // Get filtered or all requests based on providerId
  const requestData = providerId 
    ? requestsContext.getRequestsByProvider(providerId)
    : requestsContext.getAllRequests();
  
  // Configuration constants
  const UI_DISPLAY_LIMIT = 100; // Number of completed requests to display in the UI
  
  // Simple utility functions
  const getAge = (time: number) => Math.floor((Date.now() - time) / 1000);
  const shortenId = (id: string) => id ? `${id.slice(0, 6)}...${id.slice(-4)}` : '';

  // Get display data with limits applied
  const displayData = {
    challenges: requestData.challenges.slice(0, 30),
    outputs: requestData.outputs.slice(0, 30),
    completed: requestData.completed.slice(0, UI_DISPLAY_LIMIT)
  };

  // Copy to clipboard function with visual feedback
  const copyToClipboard = (text: string, isProviderId = false) => {
    navigator.clipboard.writeText(text).then(() => {
      // Set the appropriate state for visual feedback
      setLocalState(prevState => ({
        ...prevState,
        lastCopiedId: isProviderId ? prevState.lastCopiedId : text,
        lastCopiedProviders: isProviderId ? text : prevState.lastCopiedProviders
      }));
      
      // Reset the visual feedback after 1 second
      setTimeout(() => {
        setLocalState(prevState => ({
          ...prevState,
          lastCopiedId: isProviderId ? prevState.lastCopiedId : '',
          lastCopiedProviders: isProviderId ? '' : prevState.lastCopiedProviders
        }));
      }, 1000);
      
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };
  
  // Copy provider IDs to clipboard
  const copyProviderIds = (request: RequestNode) => {
    const providerText = request.providerIds.join(', ');
    copyToClipboard(providerText, true);
  };
  
  // Toggle expand/collapse for minimizable mode
  const toggleExpanded = () => {
    setLocalState(prevState => ({
      ...prevState,
      isExpanded: !prevState.isExpanded
    }));
  };

  // Render helper for request nodes
  const renderRequestNode = (request: RequestNode) => (
    <div 
      key={request.id}
      className={`request-node status-${request.status} ${request.defunct ? 'defunct' : ''}`}
      title={`ID: ${request.id} | Providers: ${request.providerIds.length} | Age: ${getAge(request.firstSeen)}s | Click ID to copy`}
    >
      <span 
        className={`request-id ${localState.lastCopiedId === request.id ? 'copied' : ''}`} 
        onClick={() => copyToClipboard(request.id)}
        style={{ 
          cursor: 'pointer',
          backgroundColor: localState.lastCopiedId === request.id ? '#4CAF5033' : 'transparent',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease'
        }}
      >
        {shortenId(request.id)} 
        {localState.lastCopiedId === request.id ? 
          <span style={{ color: '#4CAF50', fontSize: '10px', marginLeft: '3px' }}>✓ copied</span> : 
          <FiCopy size={10} className="copy-icon" />}
      </span>
      <div className="request-meta">
        <span className="request-age">
          <FiClock className="meta-icon" /> {getAge(request.firstSeen)}s
        </span>
        <span 
          className={`provider-count ${localState.lastCopiedProviders === request.providerIds.join(', ') ? 'copied' : ''}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the ID copy
            copyProviderIds(request);
          }}
          style={{ 
            cursor: 'pointer',
            backgroundColor: localState.lastCopiedProviders === request.providerIds.join(', ') ? '#4CAF5033' : 'transparent',
            borderRadius: '3px',
            transition: 'background-color 0.2s ease'
          }}
          title={`Click to copy ${request.providerIds.length} provider ID${request.providerIds.length !== 1 ? 's' : ''}`}
        >
          {request.providerIds.length} {request.providerIds.length === 1 ? 'Provider' : 'Providers'}
          {localState.lastCopiedProviders === request.providerIds.join(', ') && 
            <span style={{ color: '#4CAF50', fontSize: '8px', marginLeft: '2px' }}>✓</span>}
        </span>
      </div>
      {request.defunct && <FiAlertTriangle className="defunct-icon" />}
      {request.status === 'complete' && <FiCheck className="complete-icon" />}
    </div>
  );

  // Get counts
  const counts = {
    challenges: requestData.challenges.length,
    outputs: requestData.outputs.length,
    completed: requestData.completed.length,
    totalCompleted: requestData.completed.length,
    defunct: [...requestData.challenges, ...requestData.outputs].filter(r => r.defunct).length,
    multiProvider: [...requestData.challenges, ...requestData.outputs, ...requestData.completed]
      .filter(r => r.providerIds.length > 1).length
  };

  return (
    <div className={`request-flow-container ${isMinimizable ? 'minimizable' : ''}`}>
      <div className="flow-header" onClick={isMinimizable ? toggleExpanded : undefined} style={{ cursor: isMinimizable ? 'pointer' : 'default' }}>
        <div className="header-content">
          <h3>{title}</h3>
          {providerId && (
            <span className="provider-filter-indicator">
              (Provider: {providerId.substring(0, 8)}...)
            </span>
          )}
          {isMinimizable && (
            <span className="request-count">
              ({counts.challenges + counts.outputs + counts.completed} total)
            </span>
          )}
        </div>
        <div className="header-controls">
          <button 
            onClick={(e) => {
              if (isMinimizable) e.stopPropagation();
              requestsContext.togglePause();
            }} 
            className="pause-button" 
            title={requestsContext.isPaused ? "Resume updates" : "Pause updates"}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              color: requestsContext.isPaused ? '#4CAF50' : '#f44336',
              marginLeft: '10px'
            }}
          >
            {requestsContext.isPaused ? <FiPlay size={18} /> : <FiPause size={18} />}
          </button>
          {isMinimizable && (
            <FiChevronDown className={`expand-icon ${localState.isExpanded ? 'expanded' : ''}`} style={{ marginLeft: '8px' }} />
          )}
        </div>
      </div>
      
      {(!isMinimizable || localState.isExpanded) && (
        <div className="flow-pipeline">
        <div className="pipeline-stage challenge-stage">
          <div className="stage-header">
            <h4>Challenges</h4>
            <span className="count">{counts.challenges}</span>
          </div>
          <div className="stage-content">
            {displayData.challenges.map(renderRequestNode)}
          </div>
        </div>
        
        <div className="pipeline-arrows">
          <FiArrowRight className="flow-arrow" />
        </div>
        
        <div className="pipeline-stage output-stage">
          <div className="stage-header">
            <h4>Outputs</h4>
            <span className="count">{counts.outputs}</span>
          </div>
          <div className="stage-content">
            {displayData.outputs.map(renderRequestNode)}
          </div>
        </div>
        
        <div className="pipeline-arrows">
          <FiArrowRight className="flow-arrow" />
        </div>
        
        <div className="pipeline-stage complete-stage">
          <div className="stage-header">
            <h4>Completed</h4>
            <span className="count">{counts.totalCompleted}</span>
          </div>
          <div className="stage-content">
            {displayData.completed.map(renderRequestNode)}
          </div>
        </div>
        </div>
      )}
      
      {(!isMinimizable || localState.isExpanded) && (
        <div className="flow-stats">
        <div className="stats-item">
          <span className="stats-label">Defunct:</span> 
          <span className={`stats-value ${counts.defunct > 0 ? 'defunct' : ''}`}>
            {counts.defunct}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Avg Completion:</span> 
          <span className="stats-value">{requestsContext.avgCompletionTime > 0 ? `${(requestsContext.avgCompletionTime / 1000).toFixed(2)}s` : 'N/A'}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Shortest:</span> 
          <span className="stats-value" title={requestsContext.shortestCompletionId}>
            {requestsContext.shortestCompletionTime > 0 ? `${(requestsContext.shortestCompletionTime / 1000).toFixed(2)}s (${shortenId(requestsContext.shortestCompletionId)})` : 'N/A'}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Longest:</span> 
          <span className="stats-value" title={requestsContext.longestCompletionId}>
            {requestsContext.longestCompletionTime > 0 ? `${(requestsContext.longestCompletionTime / 1000).toFixed(2)}s (${shortenId(requestsContext.longestCompletionId)})` : 'N/A'}
          </span>
        </div>
        </div>
      )}
    </div>
  );
}
