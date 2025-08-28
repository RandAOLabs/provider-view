import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { aoHelpers } from '../utils/ao-helpers';

// Define request node structure
export type RequestNode = {
  id: string;
  status: 'challenge' | 'output' | 'complete';
  firstSeen: number;
  lastSeen: number;
  providerIds: string[];
  providerNames: Record<string, string>;
  defunct: boolean;
};

// Context state interface
interface RequestsContextState {
  challenges: RequestNode[];
  outputs: RequestNode[];
  completed: RequestNode[];
  avgCompletionTime: number;
  longestCompletionTime: number;
  longestCompletionId: string;
  shortestCompletionTime: number;
  shortestCompletionId: string;
  isPaused: boolean;
  isLoading: boolean;
  lastUpdated: number;
}

// Context actions interface
interface RequestsContextActions {
  togglePause: () => void;
  getRequestsByProvider: (providerId: string) => {
    challenges: RequestNode[];
    outputs: RequestNode[];
    completed: RequestNode[];
  };
  getAllRequests: () => {
    challenges: RequestNode[];
    outputs: RequestNode[];
    completed: RequestNode[];
  };
}

// Combined context interface
interface RequestsContextValue extends RequestsContextState, RequestsContextActions {}

// Create context
const RequestsContext = createContext<RequestsContextValue | undefined>(undefined);

// Provider props
interface RequestsContextProviderProps {
  children: ReactNode;
}

// Configuration constants
const FETCH_INTERVAL = 50; // Fetch new data every 50ms for maximum speed
const RENDER_INTERVAL = 100; // Update the UI every 100ms
const DEFUNCT_THRESHOLD = 30000; // 30 seconds
const COMPLETED_HISTORY_LIMIT = 1000; // Keep 1000 most recent completed requests

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

// Utility functions
const isDefunct = (time: number) => Date.now() - time > DEFUNCT_THRESHOLD;

export const RequestsContextProvider: React.FC<RequestsContextProviderProps> = ({ children }) => {
  // State for UI rendering
  const [state, setState] = useState<RequestsContextState>({
    challenges: [],
    outputs: [],
    completed: [],
    avgCompletionTime: 0,
    longestCompletionTime: 0,
    longestCompletionId: '',
    shortestCompletionTime: 0,
    shortestCompletionId: '',
    isPaused: false,
    isLoading: false,
    lastUpdated: 0
  });

  // Refs for data storage to avoid re-renders
  const requestMapRef = useRef(new Map<string, RequestNode>());
  const completedMapRef = useRef(new Map<string, RequestNode>());
  const lastFetchTimeRef = useRef(0);
  const processingRef = useRef(false);
  const intervalIdRef = useRef<any>(null);

  // Main data processing function
  const processData = async () => {
    // Skip if already processing or paused
    if (processingRef.current || state.isPaused) return;
    if (Date.now() - lastFetchTimeRef.current < FETCH_INTERVAL) return;
    
    processingRef.current = true;
    
    try {
      // Fetch new data
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
        const activityProviderId = activity.provider_id;
        if (!activityProviderId) return;
        
        // Use shortened provider ID as name since we're not fetching provider info
        const providerName = activityProviderId.substring(0, 8);
        
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
            if (!req.providerIds.includes(activityProviderId)) {
              req.providerIds.push(activityProviderId);
              req.providerNames[activityProviderId] = providerName;
            }
          } else {
            // Create new request
            requestMap.set(id, {
              id,
              status: 'challenge',
              firstSeen: now,
              lastSeen: now,
              providerIds: [activityProviderId],
              providerNames: { [activityProviderId]: providerName },
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
            if (!req.providerIds.includes(activityProviderId)) {
              req.providerIds.push(activityProviderId);
              req.providerNames[activityProviderId] = providerName;
            }
          } else {
            // Create new request
            requestMap.set(id, {
              id,
              status: 'output',
              firstSeen: now,
              lastSeen: now,
              providerIds: [activityProviderId],
              providerNames: { [activityProviderId]: providerName },
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
      
      // Keep only the most recent completed requests
      const completedList = Array.from(completedMap.values())
        .sort((a, b) => b.lastSeen - a.lastSeen);
        
      if (completedList.length > COMPLETED_HISTORY_LIMIT) {
        completedList.slice(COMPLETED_HISTORY_LIMIT).forEach(req => completedMap.delete(req.id));
      }
      
      // Always update the UI after each data fetch
      updateRenderState();
    } catch (err) {
      console.error('Error processing request data:', err);
    } finally {
      processingRef.current = false;
    }
  };

  // Update render state
  const updateRenderState = () => {
    const requestMap = requestMapRef.current;
    const completedMap = completedMapRef.current;
    
    // Sort challenges
    const challenges = Array.from(requestMap.values())
      .filter(r => r.status === 'challenge')
      .sort((a, b) => b.lastSeen - a.lastSeen);
    
    // Sort outputs
    const outputs = Array.from(requestMap.values())
      .filter(r => r.status === 'output')
      .sort((a, b) => b.lastSeen - a.lastSeen);
    
    // Sort completed
    const completed = Array.from(completedMap.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
    
    // Calculate completion time statistics
    let avgCompletionTime = 0;
    let longestCompletionTime = 0;
    let longestCompletionId = '';
    let shortestCompletionTime = Infinity;
    let shortestCompletionId = '';
    
    if (completedMap.size > 0) {
      let totalCompletionTime = 0;
      
      Array.from(completedMap.values()).forEach(req => {
        const completionTime = req.lastSeen - req.firstSeen;
        totalCompletionTime += completionTime;
        
        if (completionTime > longestCompletionTime) {
          longestCompletionTime = completionTime;
          longestCompletionId = req.id;
        }
        
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
    
    // Update state in a single batch
    setState(prevState => ({
      ...prevState,
      challenges,
      outputs,
      completed,
      avgCompletionTime,
      longestCompletionTime,
      longestCompletionId,
      shortestCompletionTime,
      shortestCompletionId,
      lastUpdated: Date.now()
    }));
  };

  // Toggle pause/play
  const togglePause = () => {
    setState(prevState => ({
      ...prevState,
      isPaused: !prevState.isPaused
    }));
  };

  // Get requests filtered by provider
  const getRequestsByProvider = (providerId: string) => {
    const filterByProvider = (requests: RequestNode[]) => 
      requests.filter(req => req.providerIds.includes(providerId));

    return {
      challenges: filterByProvider(state.challenges),
      outputs: filterByProvider(state.outputs),
      completed: filterByProvider(state.completed)
    };
  };

  // Get all requests
  const getAllRequests = () => ({
    challenges: state.challenges,
    outputs: state.outputs,
    completed: state.completed
  });

  // Set up data fetching interval
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

  // Context value
  const contextValue: RequestsContextValue = {
    ...state,
    togglePause,
    getRequestsByProvider,
    getAllRequests
  };

  return (
    <RequestsContext.Provider value={contextValue}>
      {children}
    </RequestsContext.Provider>
  );
};

// Custom hook to use the context
export const useRequests = (): RequestsContextValue => {
  const context = useContext(RequestsContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestsContextProvider');
  }
  return context;
};
