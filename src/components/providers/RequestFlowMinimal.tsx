import React, { useState, useEffect, useRef } from 'react';
import { aoHelpers } from '../../utils/ao-helpers';
import { FiAlertTriangle, FiCheck, FiArrowRight, FiClock, FiPause, FiPlay, FiCopy } from 'react-icons/fi';
import './RequestFlowVisualizer.css';

// Ultra-lightweight request flow visualization that's completely self-contained
export function RequestFlowMinimal() {
  // Use a single state object to minimize render cycles
  const [state, setState] = useState({
    challenges: [] as RequestNode[],
    outputs: [] as RequestNode[],
    completed: [] as RequestNode[],
    avgCompletionTime: 0,
    longestCompletionTime: 0,
    longestCompletionId: '',
    shortestCompletionTime: Infinity,
    shortestCompletionId: '',
    isPaused: false,
    lastCopiedId: '', // Track last copied ID for visual feedback
    lastCopiedProviders: '' // Track last copied providers for visual feedback
  });
  
  // Everything else uses refs to avoid triggering re-renders
  const requestMapRef = useRef(new Map<string, RequestNode>());
  const completedMapRef = useRef(new Map<string, RequestNode>());
  const lastFetchTimeRef = useRef(0);
  const processingRef = useRef(false);
  const intervalIdRef = useRef<any>(null);
  
  // Configuration constants
  const FETCH_INTERVAL = 100; // Fetch new data every 100ms (10 times per second)
  const RENDER_INTERVAL = 100; // Update the UI every 100ms (10 times per second)
  const DEFUNCT_THRESHOLD = 30000; // 30 seconds
  const UI_DISPLAY_LIMIT = 100; // Number of completed requests to display in the UI
  
  // Define request node structure
  type RequestNode = {
    id: string;
    status: 'challenge' | 'output' | 'complete';
    firstSeen: number;
    lastSeen: number;
    providerIds: string[];
    providerNames: Record<string, string>;
    defunct: boolean;
  };
  
  // Simple utility functions that don't cause re-renders
  const isDefunct = (time: number) => Date.now() - time > DEFUNCT_THRESHOLD;
  const getAge = (time: number) => Math.floor((Date.now() - time) / 1000);
  const shortenId = (id: string) => id ? `${id.slice(0, 6)}...${id.slice(-4)}` : '';
  
  // Extract request IDs safely
  const extractRequestIds = (data: any): string[] => {
    if (!data) return [];
    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed.request_ids) ? parsed.request_ids : [];
      } else if (data && typeof data === 'object') {
        const ids = data.request_ids;
        if (Array.isArray(ids)) return ids;
        if (typeof ids === 'string') return JSON.parse(ids);
      }
    } catch (e) {}
    return [];
  };

  // Main data processing function - carefully optimized to minimize work
  const processData = async () => {
    // Skip if already processing or if we've fetched recently
    if (processingRef.current) return;
    if (Date.now() - lastFetchTimeRef.current < FETCH_INTERVAL) return;
    
    processingRef.current = true;
    
    try {
      // Fetch new data (only every few seconds)
      const randclient = await aoHelpers.getRandomClient();
      
      lastFetchTimeRef.current = Date.now();
      
      // Only fetch provider activity to prevent page reloads
      const providerActivity = await randclient.getAllProviderActivity();
      
      // Track current request IDs to detect completed ones
      const currentIds = new Set<string>();
      const requestMap = requestMapRef.current;
      const completedMap = completedMapRef.current;
      const now = Date.now();
      
      // Process all providers
      providerActivity.forEach(activity => {
        const providerId = activity.provider_id;
        if (!providerId) return;
        
        // Use shortened provider ID as name since we're not fetching provider info
        const providerName = providerId.substring(0, 8);
        
        // Process challenge requests
        const challengeIds = extractRequestIds(activity.active_challenge_requests);
        challengeIds.forEach(id => {
          currentIds.add(id);
          
          if (requestMap.has(id)) {
            // Update existing request
            const req = requestMap.get(id)!;
            req.lastSeen = now;
            req.status = 'challenge';
            req.defunct = isDefunct(req.firstSeen);
            if (!req.providerIds.includes(providerId)) {
              req.providerIds.push(providerId);
              req.providerNames[providerId] = providerName;
            }
          } else {
            // Create new request
            requestMap.set(id, {
              id,
              status: 'challenge',
              firstSeen: now,
              lastSeen: now,
              providerIds: [providerId],
              providerNames: { [providerId]: providerName },
              defunct: false
            });
          }
        });
        
        // Process output requests
        const outputIds = extractRequestIds(activity.active_output_requests);
        outputIds.forEach(id => {
          currentIds.add(id);
          
          if (requestMap.has(id)) {
            // Update existing request
            const req = requestMap.get(id)!;
            req.lastSeen = now;
            req.status = 'output';
            req.defunct = isDefunct(req.firstSeen);
            if (!req.providerIds.includes(providerId)) {
              req.providerIds.push(providerId);
              req.providerNames[providerId] = providerName;
            }
          } else {
            // Create new request
            requestMap.set(id, {
              id,
              status: 'output',
              firstSeen: now,
              lastSeen: now,
              providerIds: [providerId],
              providerNames: { [providerId]: providerName },
              defunct: false
            });
          }
        });
      });
      
      // Find completed requests
      const toComplete: RequestNode[] = [];
      
      requestMap.forEach((req, id) => {
        if (!currentIds.has(id) && req.status !== 'complete') {
          // Request has completed - move it to completed collection
          req.status = 'complete';
          req.lastSeen = now;
          completedMap.set(id, req);
          toComplete.push(req);
        }
      });
      
      // Remove completed requests from active map
      toComplete.forEach(req => requestMap.delete(req.id));
      
      // Keep only the 1000 most recent completed requests
      const completedList = Array.from(completedMap.values())
        .sort((a, b) => b.lastSeen - a.lastSeen);
        
      if (completedList.length > 1000) {
        completedList.slice(1000).forEach(req => completedMap.delete(req.id));
      }
      
      // Always update the UI after each data fetch
      updateRenderState();
    } catch (err) {
      console.error('Error processing request data:', err);
    } finally {
      processingRef.current = false;
    }
  };

  // Update render state (only called periodically to prevent excessive renders)
  const updateRenderState = () => {
    const requestMap = requestMapRef.current;
    const completedMap = completedMapRef.current;
    
    // Sort challenges
    const challenges = Array.from(requestMap.values())
      .filter(r => r.status === 'challenge')
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 30);
    
    // Sort outputs
    const outputs = Array.from(requestMap.values())
      .filter(r => r.status === 'output')
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 30);
    
    // Sort completed
    const completed = Array.from(completedMap.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, UI_DISPLAY_LIMIT); // Display up to UI_DISPLAY_LIMIT most recent in UI
    
    // Calculate completion time statistics
    let avgCompletionTime = 0;
    let longestCompletionTime = 0;
    let longestCompletionId = '';
    let shortestCompletionTime = Infinity;
    let shortestCompletionId = '';
    
    if (completedMap.size > 0) {
      // Process all completed requests to find statistics
      let totalCompletionTime = 0;
      
      Array.from(completedMap.values()).forEach(req => {
        const completionTime = req.lastSeen - req.firstSeen;
        totalCompletionTime += completionTime;
        
        // Check for longest completion time
        if (completionTime > longestCompletionTime) {
          longestCompletionTime = completionTime;
          longestCompletionId = req.id;
        }
        
        // Check for shortest completion time
        if (completionTime < shortestCompletionTime) {
          shortestCompletionTime = completionTime;
          shortestCompletionId = req.id;
        }
      });
      
      avgCompletionTime = Math.round(totalCompletionTime / completedMap.size);
    }
    
    // If we never found a shortest time (empty map), reset to 0
    if (shortestCompletionTime === Infinity) {
      shortestCompletionTime = 0;
    }
    
    // Update state in a single batch to prevent multiple renders
    setState(prevState => ({
      ...prevState,
      challenges,
      outputs,
      completed,
      avgCompletionTime,
      longestCompletionTime,
      longestCompletionId,
      shortestCompletionTime,
      shortestCompletionId
    }));
  };

  // Copy to clipboard function with visual feedback
  const copyToClipboard = (text: string, isProviderId = false) => {
    navigator.clipboard.writeText(text).then(() => {
      // Set the appropriate state for visual feedback
      setState(prevState => ({
        ...prevState,
        lastCopiedId: isProviderId ? prevState.lastCopiedId : text,
        lastCopiedProviders: isProviderId ? text : prevState.lastCopiedProviders
      }));
      
      // Reset the visual feedback after 1 second
      setTimeout(() => {
        setState(prevState => ({
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
  
  // Toggle pause/play
  const togglePause = () => {
    setState(prevState => ({
      ...prevState,
      isPaused: !prevState.isPaused
    }));
  };
  
  // Set up lightweight intervals
  useEffect(() => {
    // Start with initial data fetch if not paused
    if (!state.isPaused) {
      processData();
    }
    
    // Set up interval for periodic updates
    const intervalId = setInterval(() => {
      if (!state.isPaused) {
        processData();
      }
    }, RENDER_INTERVAL);
    
    intervalIdRef.current = intervalId;
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [state.isPaused]); // Re-create interval when pause state changes

  // Render helper for request nodes
  const renderRequestNode = (request: RequestNode) => (
    <div 
      key={request.id}
      className={`request-node status-${request.status} ${request.defunct ? 'defunct' : ''}`}
      title={`ID: ${request.id} | Providers: ${request.providerIds.length} | Age: ${getAge(request.firstSeen)}s | Click ID to copy`}
    >
      <span 
        className={`request-id ${state.lastCopiedId === request.id ? 'copied' : ''}`} 
        onClick={() => copyToClipboard(request.id)}
        style={{ 
          cursor: 'pointer',
          backgroundColor: state.lastCopiedId === request.id ? '#4CAF5033' : 'transparent',
          borderRadius: '3px',
          transition: 'background-color 0.2s ease'
        }}
      >
        {shortenId(request.id)} 
        {state.lastCopiedId === request.id ? 
          <span style={{ color: '#4CAF50', fontSize: '10px', marginLeft: '3px' }}>✓ copied</span> : 
          <FiCopy size={10} className="copy-icon" />}
      </span>
      <div className="request-meta">
        <span className="request-age">
          <FiClock className="meta-icon" /> {getAge(request.firstSeen)}s
        </span>
        <span 
          className={`provider-count ${state.lastCopiedProviders === request.providerIds.join(', ') ? 'copied' : ''}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the ID copy
            copyProviderIds(request);
          }}
          style={{ 
            cursor: 'pointer',
            backgroundColor: state.lastCopiedProviders === request.providerIds.join(', ') ? '#4CAF5033' : 'transparent',
            borderRadius: '3px',
            transition: 'background-color 0.2s ease'
          }}
          title={`Click to copy ${request.providerIds.length} provider ID${request.providerIds.length !== 1 ? 's' : ''}`}
        >
          {request.providerIds.length} {request.providerIds.length === 1 ? 'Provider' : 'Providers'}
          {state.lastCopiedProviders === request.providerIds.join(', ') && 
            <span style={{ color: '#4CAF50', fontSize: '8px', marginLeft: '2px' }}>✓</span>}
        </span>
      </div>
      {request.defunct && <FiAlertTriangle className="defunct-icon" />}
      {request.status === 'complete' && <FiCheck className="complete-icon" />}
    </div>
  );

  // Get counts
  const counts = {
    challenges: state.challenges.length,
    outputs: state.outputs.length,
    completed: state.completed.length,
    totalCompleted: completedMapRef.current.size,
    defunct: [...state.challenges, ...state.outputs].filter(r => r.defunct).length,
    multiProvider: [...state.challenges, ...state.outputs, ...state.completed]
      .filter(r => r.providerIds.length > 1).length
  };

  return (
    <div className="request-flow-container">
      <div className="flow-header">
        <h3>Request Flow Visualization</h3>
        <button 
          onClick={togglePause} 
          className="pause-button" 
          title={state.isPaused ? "Resume updates" : "Pause updates"}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            color: state.isPaused ? '#4CAF50' : '#f44336',
            marginLeft: '10px'
          }}
        >
          {state.isPaused ? <FiPlay size={18} /> : <FiPause size={18} />}
        </button>
      </div>
      
      <div className="flow-pipeline">
        <div className="pipeline-stage challenge-stage">
          <div className="stage-header">
            <h4>Challenges</h4>
            <span className="count">{counts.challenges}</span>
          </div>
          <div className="stage-content">
            {state.challenges.map(renderRequestNode)}
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
            {state.outputs.map(renderRequestNode)}
          </div>
        </div>
        
        <div className="pipeline-arrows">
          <FiArrowRight className="flow-arrow" />
        </div>
        
        <div className="pipeline-stage complete-stage">
          <div className="stage-header">
            <h4>Completed</h4>
            <span className="count">{completedMapRef.current.size}</span>
          </div>
          <div className="stage-content">
            {state.completed.map(renderRequestNode)}
          </div>
        </div>
      </div>
      
      <div className="flow-stats">
        <div className="stats-item">
          <span className="stats-label">Defunct:</span> 
          <span className={`stats-value ${counts.defunct > 0 ? 'defunct' : ''}`}>
            {counts.defunct}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Avg Completion:</span> 
          <span className="stats-value">{state.avgCompletionTime > 0 ? `${(state.avgCompletionTime / 1000).toFixed(2)}s` : 'N/A'}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Shortest:</span> 
          <span className="stats-value" title={state.shortestCompletionId}>
            {state.shortestCompletionTime > 0 ? `${(state.shortestCompletionTime / 1000).toFixed(2)}s (${shortenId(state.shortestCompletionId)})` : 'N/A'}
          </span>
        </div>
        <div className="stats-item">
          <span className="stats-label">Longest:</span> 
          <span className="stats-value" title={state.longestCompletionId}>
            {state.longestCompletionTime > 0 ? `${(state.longestCompletionTime / 1000).toFixed(2)}s (${shortenId(state.longestCompletionId)})` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
