import React, { useState, useEffect, useRef } from 'react';
import { FiCircle, FiCheck, FiCopy, FiLoader, FiRefreshCw, FiPlay, FiPause, FiAlertTriangle } from 'react-icons/fi';
import { ProviderInfoAggregate, ProviderInfo, ProviderActivity, RequestList } from 'ao-process-clients';
import { aoHelpers } from '../../utils/ao-helpers';
import './UnresolvedRandomRequests.css';

interface UnresolvedRandomRequestsProps {
  providers: ProviderInfoAggregate[];
  refreshProviders?: () => Promise<void>; // Optional callback to refresh parent data
}

interface ProviderWithRequests {
  provider: ProviderInfoAggregate;
  challengeRequests: string[];
  outputRequests: string[];
}

interface RequestStatus {
  id: string;
  firstSeen: number; // Timestamp when first detected
  lastSeen: number;  // Timestamp of last update
  status: 'challenge' | 'output' | 'disappeared';
  previousStatus?: 'challenge' | 'output' | 'disappeared'; // For tracking transitions
  providerIds: string[]; // Which providers this request is associated with
  defunct: boolean;      // Whether the request has been in the system too long
}

export const UnresolvedRandomRequests = ({ providers, refreshProviders }: UnresolvedRandomRequestsProps) => {
  const [providersWithRequests, setProvidersWithRequests] = useState<ProviderWithRequests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [expandedLists, setExpandedLists] = useState<{ [key: string]: boolean }>({});
  const [infoDropdownVisible, setInfoDropdownVisible] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Animation state management with clearer naming for each animation type
  const [updatedProviderIds, setUpdatedProviderIds] = useState<string[]>([]);
  const [currentProviders, setCurrentProviders] = useState<ProviderInfoAggregate[]>(providers);
  
  // Request animation states
  const [newRequestIds, setNewRequestIds] = useState<string[]>([]);           // Brand new requests that fade in green
  const [existingRequestIds, setExistingRequestIds] = useState<string[]>([]); // Unchanged requests that flash red
  const [movingFromChallengeIds, setMovingFromChallengeIds] = useState<string[]>([]); // Requests moving from challenges (fade out purple)
  const [movingToOutputIds, setMovingToOutputIds] = useState<string[]>([]);   // Requests arriving in outputs (fade in purple)
  const [disappearingIds, setDisappearingIds] = useState<string[]>([]);       // Requests disappearing completely (flash gold)
  
  // State for toggling various debug and visualization features
  const [debugMode] = useState<boolean>(true); // Enable detailed console logs
  const [showVisualIndicators, setShowVisualIndicators] = useState<boolean>(true); // Toggle for visual indicators (default enabled now)
  const [testAnimations, setTestAnimations] = useState<boolean>(false); // Test animation button
  
  // Track all requests by their IDs with timestamps and status information
  const [requestStatusMap, setRequestStatusMap] = useState<Map<string, RequestStatus>>(new Map());
  const [defunctRequests, setDefunctRequests] = useState<string[]>([]); // Track requests that have been in the system too long
  
  // Constants for tracking
  const DEFUNCT_REQUEST_THRESHOLD_MS = 30000; // 30 seconds before a request is considered defunct
  
  // Previous state tracking via refs (persists between renders)
  const prevProvidersMapRef = useRef<Map<string, ProviderWithRequests>>(new Map());
  const prevRequestIdsRef = useRef<Set<string>>(new Set());
  const prevChallengeIdsRef = useRef<Set<string>>(new Set());
  const prevOutputIdsRef = useRef<Set<string>>(new Set());
  
  // How many requests to show initially
  const VISIBLE_REQUESTS_COUNT = 3;

  /**
   * Update request timestamps and track their status changes
   * @param currentRequestsMap Map of current request IDs to their statuses
   */
  const updateRequestTimestamps = (providersThatHaveRequests: ProviderWithRequests[]) => {
    const now = Date.now();
    const currentRequestMap = new Map<string, RequestStatus>();
    const expiredRequests: string[] = [];
    
    // Process all current requests from all providers
    providersThatHaveRequests.forEach(providerWithRequests => {
      const providerId = providerWithRequests.provider.providerId;
      
      // Process challenge requests
      providerWithRequests.challengeRequests.forEach(requestId => {
        const existingStatus = requestStatusMap.get(requestId);
        let providerIds = existingStatus?.providerIds || [];
        
        if (!providerIds.includes(providerId)) {
          providerIds = [...providerIds, providerId];
        }
        
        currentRequestMap.set(requestId, {
          id: requestId,
          firstSeen: existingStatus?.firstSeen || now,
          lastSeen: now,
          status: 'challenge',
          previousStatus: existingStatus?.status || undefined,
          providerIds,
          defunct: existingStatus?.defunct || false
        });
      });
      
      // Process output requests
      providerWithRequests.outputRequests.forEach(requestId => {
        const existingStatus = requestStatusMap.get(requestId);
        let providerIds = existingStatus?.providerIds || [];
        
        if (!providerIds.includes(providerId)) {
          providerIds = [...providerIds, providerId];
        }
        
        currentRequestMap.set(requestId, {
          id: requestId,
          firstSeen: existingStatus?.firstSeen || now,
          lastSeen: now,
          status: 'output',
          previousStatus: existingStatus?.status || undefined,
          providerIds,
          defunct: existingStatus?.defunct || false
        });
      });
    });
    
    // Check for requests that are not in the current set but were in the previous set
    // Mark them as disappeared
    requestStatusMap.forEach((status, requestId) => {
      if (!currentRequestMap.has(requestId)) {
        // Request has disappeared from all providers
        currentRequestMap.set(requestId, {
          ...status,
          status: 'disappeared',
          previousStatus: status.status,
          lastSeen: now
        });
      }
    });
    
    // Check for defunct requests (those that have been in the system too long)
    currentRequestMap.forEach((status, requestId) => {
      if (status.status !== 'disappeared' && 
          now - status.firstSeen > DEFUNCT_REQUEST_THRESHOLD_MS) {
        // Mark as defunct
        status.defunct = true;
        expiredRequests.push(requestId);
      }
    });
    
    if (expiredRequests.length > 0) {
      console.warn(`Found ${expiredRequests.length} defunct requests:`, 
        expiredRequests.map(id => id.substring(0, 8) + "...").join(", "));
      setDefunctRequests(expiredRequests);
    } else {
      setDefunctRequests([]);
    }
    
    // Update the request status map
    setRequestStatusMap(currentRequestMap);
    return currentRequestMap;
  };
  
  // Fetch fresh provider data from API - only refresh this component's data
  const fetchProviderData = async () => {
    try {
      console.log('Refreshing unresolved requests data...');
      
      // Don't use parent's refresh function to avoid a full GraphQL refresh
      // Instead, get ONLY the activity data we need for this component
      const randclient = await aoHelpers.getRandomClient();
      
      // Get only the activity data which contains the request info we need
      const freshProviderActivity = await randclient.getAllProviderActivity();
      
      // Create a lightweight update using existing provider data and fresh activity
      const freshProviders = currentProviders.map(provider => {
        const activityInfo = freshProviderActivity.find(a => a.provider_id === provider.providerId);
        
        if (activityInfo) {
          // Only update the activity data, keep everything else the same
          return {
            ...provider,
            providerActivity: activityInfo
          } as ProviderInfoAggregate;
        }
        
        // If no updated activity found, return original provider
        return provider;
      });
      
      console.log('Refreshed unresolved requests data for', freshProviders.length, 'providers');
      return freshProviders;
    } catch (error) {
      console.error('Error refreshing unresolved requests data:', error);
      return null;
    }
  };

  // Schedule next auto-refresh with a delay
  const scheduleNextRefresh = () => {
    if (autoRefreshEnabled) {
      const timer = setTimeout(() => {
        refreshData();
      }, 3500); // 3.5 second delay - much longer to allow animations to complete
      
      setRefreshTimer(timer);
    }
  };
  
  // Clear any existing refresh timer
  const clearRefreshTimer = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
  };
  
  const refreshData = async () => {
    if (!isLoading) {
      // Clear any existing timer
      clearRefreshTimer();
      
      // Set loading state but keep showing current data
      setIsLoading(true);
      
      // Store current provider data for comparison after refresh
      const currentMap = new Map<string, ProviderWithRequests>();
      providersWithRequests.forEach(provider => {
        currentMap.set(provider.provider.providerId, provider);
      });
      prevProvidersMapRef.current = currentMap;
      
      try {
        // Fetch new provider data (data still displayed during fetch)
        const freshProviders = await fetchProviderData();
        
        if (freshProviders) {
          // Update providers state but maintain display of data
          setCurrentProviders(freshProviders);
          
          // Process the fresh data
          processProviderData(freshProviders);
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        // Always reset loading state
        setIsLoading(false);
        
        // Schedule next refresh
        scheduleNextRefresh();
      }
    }
  };

  /**
   * Helper function to determine styles for each request based on its state
   * Visual indicators are only applied when showVisualIndicators is true
   */
  const getRequestStyles = (requestId: string, listType: 'challenge' | 'output') => {
    // Default style - plain background for requests
    const style: React.CSSProperties = {
      padding: '8px 12px',
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#f0f0f0',
      position: 'relative',
      fontWeight: 'normal',
      color: 'black',
      border: '1px solid #ddd',
      fontSize: '14px'
    };
    
    let prefix = '';
    
    // Only apply special styles if visual indicators are enabled
    if (showVisualIndicators) {
      // The system tracks the following states:
      // 1. NEW - Request wasn't in any previous list and appears for the first time
      // 2. UNCHANGED - Request was in the same list before and remains there
      // 3. MOVING - Request that moved from challenge list to output list
      // 4. DISAPPEARING - Request that was in a list before but is now gone
      
      if (newRequestIds.includes(requestId)) {
        // New requests: Green background, bold text
        style.backgroundColor = '#d4edda';
        style.border = '4px solid #28a745';
        style.fontWeight = 'bold';
        style.boxShadow = '0 0 12px rgba(40, 167, 69, 0.8)';
        style.transform = 'scale(1.05)';
        prefix = '🟢 NEW! ';
      } 
      else if (existingRequestIds.includes(requestId)) {
        // Unchanged requests: Red background
        style.backgroundColor = '#f8d7da';
        style.border = '4px solid #dc3545';
        style.boxShadow = '0 0 12px rgba(220, 53, 69, 0.8)';
        prefix = '🔴 UNCHANGED ';
      } 
      else if (movingFromChallengeIds.includes(requestId) && listType === 'challenge') {
        // Moving from challenges: Purple background
        style.backgroundColor = '#e6e6fa';
        style.border = '4px solid #9966CC';
        style.boxShadow = '0 0 12px rgba(128, 0, 128, 0.8)';
        style.opacity = 0.7;
        prefix = '💜 MOVING OUT ';
      } 
      else if (movingToOutputIds.includes(requestId) && listType === 'output') {
        // Moving to outputs: Purple background
        style.backgroundColor = '#e6e6fa';
        style.border = '4px solid #9966CC';
        style.boxShadow = '0 0 12px rgba(128, 0, 128, 0.8)';
        style.fontWeight = 'bold';
        style.transform = 'scale(1.05)';
        prefix = '💜 MOVING IN ';
      } 
      else if (disappearingIds.includes(requestId)) {
        // Disappearing requests: Gold background
        style.backgroundColor = '#fff9c4';
        style.border = '4px solid #FFD700';
        style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.8)';
        style.opacity = 0.8;
        prefix = '🟡 DISAPPEARING ';
      }
    }
    
    return { style, prefix };
  };

  const toggleInfoDropdown = () => {
    setInfoDropdownVisible(!infoDropdownVisible);
  };
  
  const toggleRequestList = (providerId: string, listType: 'challenge' | 'output') => {
    const key = `${providerId}-${listType}`;
    setExpandedLists(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Initial effect to process providers data when component mounts
  useEffect(() => {
    if (providers.length > 0) {
      setCurrentProviders(providers);
      processProviderData(providers);
    }
  }, [providers]);
  
  // Effect to trigger initial auto-refresh and clean up on unmount
  useEffect(() => {
    // Start the auto-refresh cycle after initial data load
    if (providers.length > 0 && autoRefreshEnabled && !isLoading) {
      console.log('Starting initial auto-refresh cycle');
      refreshData();
    }
    
    // Clean up any timers when component unmounts
    return () => {
      clearRefreshTimer();
    };
  }, [autoRefreshEnabled, providers.length]);

  const processProviderData = (providersToProcess = currentProviders) => {
    setIsLoading(true);
    console.log('Processing provider data for unresolved requests, providers count:', providersToProcess.length);
    
    // Extract data from the provider objects directly without making additional API calls
    const processedProviders = providersToProcess
      // Don't filter out providers - we'll show all of them now
      .map(provider => {
        const activity = provider.providerActivity as ProviderActivity;
        
        // We expect the request_ids fields to be properly parsed arrays by now
        // But we'll handle all possible cases carefully
        
        // Get challenge requests from the activity data
        let challengeRequests: string[] = [];
        if (activity && activity.active_challenge_requests) {
          if (typeof activity.active_challenge_requests === 'string') {
            // If by some chance it's still a string, try to parse it
            try {
              const parsed = JSON.parse(activity.active_challenge_requests);
              challengeRequests = Array.isArray(parsed.request_ids) ? parsed.request_ids : [];
            } catch (e) {
              console.error(`Error parsing challenge requests for ${provider.providerId}:`, e);
            }
          } else if (typeof activity.active_challenge_requests === 'object') {
            // It's an object, extract the request_ids array
            const requestIds = activity.active_challenge_requests.request_ids;
            if (Array.isArray(requestIds)) {
              challengeRequests = requestIds;
            } else if (typeof requestIds === 'string') {
              // If request_ids is still a string, try to parse it
              try {
                challengeRequests = JSON.parse(requestIds);
              } catch (e) {
                console.error(`Error parsing challenge request_ids for ${provider.providerId}:`, e);
              }
            }
          }
        }
        
        // Get output requests from the activity data, same approach
        let outputRequests: string[] = [];
        if (activity && activity.active_output_requests) {
          if (typeof activity.active_output_requests === 'string') {
            // If by some chance it's still a string, try to parse it
            try {
              const parsed = JSON.parse(activity.active_output_requests);
              outputRequests = Array.isArray(parsed.request_ids) ? parsed.request_ids : [];
            } catch (e) {
              console.error(`Error parsing output requests for ${provider.providerId}:`, e);
            }
          } else if (typeof activity.active_output_requests === 'object') {
            // It's an object, extract the request_ids array
            const requestIds = activity.active_output_requests.request_ids;
            if (Array.isArray(requestIds)) {
              outputRequests = requestIds;
            } else if (typeof requestIds === 'string') {
              // If request_ids is still a string, try to parse it
              try {
                outputRequests = JSON.parse(requestIds);
              } catch (e) {
                console.error(`Error parsing output request_ids for ${provider.providerId}:`, e);
              }
            }
          }
        }
        
        console.log(`Provider ${provider.providerId} requests (processed by component):`, {
          challengeRequestsCount: challengeRequests.length,
          outputRequestsCount: outputRequests.length
        });
        
        return {
          provider,
          challengeRequests,
          outputRequests
        };
      })
      // Only include providers that have active requests
      .filter(item => item.challengeRequests.length > 0 || item.outputRequests.length > 0);
      
    console.log('Providers with unresolved requests:', processedProviders.length);
    
    // Extract all request IDs for change detection
    const processedRequestIds = processedProviders.flatMap(p => [
      ...p.challengeRequests,
      ...p.outputRequests
    ]);
    
    const currentRequestIds = new Set(processedRequestIds);
    const currentChallengeIds = new Set(processedProviders.flatMap(p => p.challengeRequests));
    const currentOutputIds = new Set(processedProviders.flatMap(p => p.outputRequests));
    
    // Create provider list with all providers, even those without requests
    const allProviders = providersToProcess.map(provider => {
      // First try to find this provider in the processed results
      const existingProvider = processedProviders.find(p => p.provider.providerId === provider.providerId);
      
      if (existingProvider) {
        return existingProvider;
      }
      
      // If not found (no activity data or no requests), create an empty entry
      return {
        provider,
        challengeRequests: [],
        outputRequests: []
      };
    });
    
    // Sort providers: active ones first, then inactive ones
    // For providers with the same status, sort by provider ID as secondary key
    const sortedProviders = [...allProviders].sort((a, b) => {
      const aIsActive = (a.provider.providerActivity?.random_balance || 0) > 1;
      const bIsActive = (b.provider.providerActivity?.random_balance || 0) > 1;
      
      // If activity status is different, sort active first
      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1; // Active providers first
      }
      
      // If both have same status, sort by provider ID
      return a.provider.providerId.localeCompare(b.provider.providerId);
    });
    
    // Update the state with sorted providers
    setProvidersWithRequests(sortedProviders);
    
    // Track state changes between refreshes
    const processStateChanges = (providersMap: Map<string, ProviderWithRequests>) => {
      console.log('-----------------------------------------------');
      console.log('▶️ TRACKING REQUEST STATE CHANGES');
      console.log('-----------------------------------------------');
      
      // Tracking for all providers that have any changes
      const changedProviderIds: string[] = [];
      
      // Tracking for specific request animation states
      const newRequests: string[] = [];
      const unchangedRequests: string[] = [];
      const movingFromChallengeRequests: string[] = [];
      const movingToOutputRequests: string[] = [];
      const disappearingRequests: string[] = [];
      
      // Previous state sets for comparison
      const prevRequestIds = prevRequestIdsRef.current;
      const prevChallengeIds = prevChallengeIdsRef.current;
      const prevOutputIds = prevOutputIdsRef.current;
      
      // Current state sets for this refresh
      const currentRequestIds = new Set<string>();
      const currentChallengeIds = new Set<string>();
      const currentOutputIds = new Set<string>();
      
      console.log(`Previous state: ${prevRequestIds.size} total requests, ${prevChallengeIds.size} challenges, ${prevOutputIds.size} outputs`);
      
      // Collect all requests for this refresh
      providersMap.forEach((providerData, providerId) => {
        // Add request IDs to current sets
        providerData.challengeRequests.forEach(reqId => {
          currentRequestIds.add(reqId);
          currentChallengeIds.add(reqId);
        });
        
        providerData.outputRequests.forEach(reqId => {
          currentRequestIds.add(reqId);
          currentOutputIds.add(reqId);
        });
      });
      
      console.log(`Current state: ${currentRequestIds.size} total requests, ${currentChallengeIds.size} challenges, ${currentOutputIds.size} outputs`);
      
      // Check each previous request ID to see if it has changed state
      prevRequestIds.forEach(reqId => {
        let providerChanged = false;
        
        // Moving status: from challenges to outputs
        if (prevChallengeIds.has(reqId) && !currentChallengeIds.has(reqId) && currentOutputIds.has(reqId)) {
          movingFromChallengeRequests.push(reqId);
          movingToOutputRequests.push(reqId);
          providerChanged = true;
          console.log(`⚠️ Request ${reqId.substring(0, 8)}... is MOVING from challenge to output`);
        }
        
        // Completely disappearing (no longer in any list)
        if (prevRequestIds.has(reqId) && !currentRequestIds.has(reqId)) {
          disappearingRequests.push(reqId);
          providerChanged = true;
          console.log(`⚠️ Request ${reqId.substring(0, 8)}... is DISAPPEARING completely`);
        }
        
        // Find provider for status update and mark changed if needed
        if (providerChanged) {
          providersMap.forEach((data, providerId) => {
            if (!changedProviderIds.includes(providerId)) {
              changedProviderIds.push(providerId);
            }
          });
        }
      });
      
      // Look for completely new requests (not present before)
      currentRequestIds.forEach(reqId => {
        if (!prevRequestIds.has(reqId)) {
          newRequests.push(reqId);
          console.log(`⚠️ Request ${reqId.substring(0, 8)}... is NEW (wasn't present before)`);
          // Find provider for this request and mark it as changed
          providersMap.forEach((data, providerId) => {
            if (
              data.challengeRequests.includes(reqId) ||
              data.outputRequests.includes(reqId)
            ) {
              if (!changedProviderIds.includes(providerId)) {
                changedProviderIds.push(providerId);
              }
            }
          });
        } else {
          // Request existed before and still exists
          unchangedRequests.push(reqId);
          // Only log a few of these to avoid console spam
          if (unchangedRequests.length < 5) {
            console.log(`Request ${reqId.substring(0, 8)}... is UNCHANGED`);
          }
        }
      });
      
      // Log categorization summary
      console.log('-----------------------------------------------');
      console.log('🔄 REQUEST STATE CHANGES SUMMARY');
      console.log('-----------------------------------------------');
      
      console.log(`🟢 NEW (green): ${newRequests.length} requests`);
      if (newRequests.length > 0) {
        console.log(`   IDs: ${newRequests.map(id => id.substring(0, 8)).join(', ')}...`);
      }
      
      console.log(`🔴 UNCHANGED (red): ${unchangedRequests.length} requests`);
      if (unchangedRequests.length > 0 && unchangedRequests.length < 5) {
        console.log(`   IDs: ${unchangedRequests.map(id => id.substring(0, 8)).join(', ')}...`);
      }
      
      console.log(`💜 MOVING FROM challenges: ${movingFromChallengeRequests.length} requests`);
      if (movingFromChallengeRequests.length > 0) {
        console.log(`   IDs: ${movingFromChallengeRequests.map(id => id.substring(0, 8)).join(', ')}...`);
      }
      
      console.log(`💜 MOVING TO outputs: ${movingToOutputRequests.length} requests`);
      if (movingToOutputRequests.length > 0) {
        console.log(`   IDs: ${movingToOutputRequests.map(id => id.substring(0, 8)).join(', ')}...`);
      }
      
      console.log(`🟡 DISAPPEARING: ${disappearingRequests.length} requests`);
      if (disappearingRequests.length > 0) {
        console.log(`   IDs: ${disappearingRequests.map(id => id.substring(0, 8)).join(', ')}...`);
      }
      console.log('-----------------------------------------------');
      
      // Update refs for next comparison
      prevRequestIdsRef.current = currentRequestIds;
      prevChallengeIdsRef.current = currentChallengeIds;
      prevOutputIdsRef.current = currentOutputIds;
      
      // Update provider animation state
      setUpdatedProviderIds(changedProviderIds);
      
      // Return all animation states
      return {
        newRequests,
        unchangedRequests,
        movingFromChallengeRequests,
        movingToOutputRequests,
        disappearingRequests,
        changedProviderIds // Include the changed provider IDs in the return value
      };
    };
    
    // Create a map of provider data for each provider ID
    const providersMap = new Map<string, ProviderWithRequests>();
    
    // Process each provider
    sortedProviders.forEach(provider => {
      // Store provider with its request data
      providersMap.set(provider.provider.providerId, provider);
    });
    
    // Process state changes and get animation states
    const { 
      newRequests, 
      unchangedRequests, 
      movingFromChallengeRequests, 
      movingToOutputRequests, 
      disappearingRequests,
      changedProviderIds // Make sure to extract this from the return value
    } = processStateChanges(providersMap);
    
    // Check if any animation should be applied
    if (newRequests.length > 0 || unchangedRequests.length > 0 || 
        movingFromChallengeRequests.length > 0 || movingToOutputRequests.length > 0 || 
        disappearingRequests.length > 0 || testAnimations) {
      
      // Mark providers that had changes
      setUpdatedProviderIds(changedProviderIds);
      
      if (debugMode) {
        console.log('Applying animations to providers:', changedProviderIds);
      }
      
      // First reset all animation states
      setNewRequestIds([]);
      setExistingRequestIds([]);
      setMovingFromChallengeIds([]);
      setMovingToOutputIds([]);
      setDisappearingIds([]);
      
      // Force a more significant delay to ensure the DOM is updated before applying animations
      setTimeout(() => {
        // Apply each animation type with a slight staggered delay for better visibility
        setNewRequestIds(newRequests);                    // Green fade in (brand new)
        
        // Wait a bit before applying the next batch of animations
        setTimeout(() => {
          setExistingRequestIds(unchangedRequests);          // Flash red (unchanged)
        }, 100);
        
        setTimeout(() => {
          setMovingFromChallengeIds(movingFromChallengeRequests);       // Fade out purple (moving from challenges)
        }, 200);
        
        setTimeout(() => {
          setMovingToOutputIds(movingToOutputRequests);                 // Fade in purple (moving to outputs)
        }, 300);
        
        setTimeout(() => {
          setDisappearingIds(disappearingRequests);          // Flash gold and disappear
        }, 400);
        
      }, 500); // Longer delay to ensure the DOM updates completely
      
      // Clear animations after delays
        // Clear provider update indicators after animations are complete
      setTimeout(() => {
        console.log('Clearing provider update indicators');
        setUpdatedProviderIds([]);
      }, 3300); // 3.3 seconds, ensure this happens after animation clearing
      
      // Clear all request animation states after they've completed - longer delay to match animation duration
      setTimeout(() => {
        console.log('Clearing all animation states');
        setNewRequestIds([]);
        setExistingRequestIds([]);
        setMovingFromChallengeIds([]);
        setMovingToOutputIds([]);
        setDisappearingIds([]);
      }, 3500); // 3.5 seconds, slightly longer than the animation duration
    }
    
    setIsLoading(false);
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Show loading overlay only for initial loading, not for refreshes
  if (isLoading && providersWithRequests.length === 0) {
    return (
      <div className="unresolved-random-section">
        <h2>Unresolved Random Requests</h2>
        <div className="loading-container">
          <FiLoader className="icon-spin" />
          <span>Loading unresolved requests...</span>
        </div>
      </div>
    );
  }

  // DEBUG: TEST ANIMATIONS button that will apply animations directly to show what they look like
  const runTestAnimations = () => {
    setTestAnimations(true);
    
    // Apply animations directly to DOM elements for testing
    const allItems = document.querySelectorAll('.request-item');
    const items = Array.from(allItems);
    
    if (items.length === 0) {
      console.log('No request items found to animate!');
      return;
    }
    
    console.log(`Found ${items.length} request items to animate`);
    
    // Test a green animation
    if (items.length > 0) {
      items[0].classList.add('fade-in-green');
      console.log('Applied GREEN animation to first item');
    }
    
    // Test a red animation
    if (items.length > 1) {
      items[1].classList.add('flash-red');
      console.log('Applied RED animation to second item');
    }
    
    // Test a purple-out animation
    if (items.length > 2) {
      items[2].classList.add('fade-out-purple');
      console.log('Applied PURPLE OUT animation to third item');
    }
    
    // Test a purple-in animation
    if (items.length > 3) {
      items[3].classList.add('fade-in-purple');
      console.log('Applied PURPLE IN animation to fourth item');
    }
    
    // Test a gold animation
    if (items.length > 4) {
      items[4].classList.add('flash-gold-disappear');
      console.log('Applied GOLD animation to fifth item');
    }
    
    // Clear the animations after 5 seconds
    setTimeout(() => {
      setTestAnimations(false);
      items.forEach(item => {
        item.classList.remove('fade-in-green', 'flash-red', 'fade-out-purple', 'fade-in-purple', 'flash-gold-disappear');
      });
      console.log('Cleared all test animations');
    }, 5000);
  };

  return (
    <div className="unresolved-random-section">
      <div className="section-header">
        <div className="section-title-container">
          <h2 className="section-title">Unresolved Random Requests</h2>
          <div className="info-dropdown">
            <div className="info-icon" onClick={toggleInfoDropdown}>
              <span>?</span>
            </div>
            <div className={`info-content ${infoDropdownVisible ? 'active' : ''}`}>
              <p>
                This section displays providers with outstanding random challenges or output requests that have not been finalized yet.
              </p>
              <p>
                It is normal to see your provider on this list occasionally, but it is not good for the same requests to linger too long or for the number of outstanding requests to grow too large (5+ outstanding would be concerning).
              </p>
              <p>
                Providers should regularly process their pending random requests to maintain good performance and reliability.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="refresh-controls">
        {/* Auto-refresh toggle button */}
        <div className="refresh-container">
          <button
            className={`refresh-button${isLoading ? ' loading' : ''}${autoRefreshEnabled ? ' auto-on' : ''}`}
            onClick={() => {
              // Toggle auto-refresh when clicked
              const newState = !autoRefreshEnabled;
              setAutoRefreshEnabled(newState);
              
              if (newState && !isLoading) {
                // If turning on and not currently loading, start refresh cycle
                refreshData();
              } else if (!newState) {
                // If turning off, clear any scheduled refreshes
                clearRefreshTimer();
              }
            }}
            disabled={isLoading}
            title={autoRefreshEnabled ? "Auto-refresh is ON - Click to pause" : "Auto-refresh is OFF - Click to start"}
          >
            {isLoading ? (
              <FiLoader className="icon-spin" />
            ) : autoRefreshEnabled ? (
              <FiPause className="refresh-icon" />
            ) : (
              <FiPlay className="refresh-icon" />
            )}
          </button>
          <span>Auto-Refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
        </div>
        
        {/* Manual refresh button */}
        <div className="refresh-container">
          <button
            className={`refresh-button${isLoading ? ' loading' : ''}`}
            onClick={() => {
              // Just do a one-time refresh
              if (!isLoading) {
                const wasAutoRefreshing = autoRefreshEnabled;
                
                // Temporarily disable auto-refresh
                if (wasAutoRefreshing) {
                  clearRefreshTimer();
                }
                
                // Do the refresh
                refreshData();
                
                // If auto-refresh was on, it will resume after this refresh
                // If it was off, it stays off
              }
            }}
            disabled={isLoading}
            title="Refresh once"
          >
            {isLoading ? (
              <FiLoader className="icon-spin" />
            ) : (
              <FiRefreshCw className="refresh-icon" />
            )}
          </button>
          <span>Manual Refresh</span>
        </div>
        
        {/* Debug controls */}
        {debugMode && (
          <div className="debug-controls">
            {/* Test animations button */}
            <button
              className="debug-button test-animations-button"
              onClick={() => runTestAnimations()}
              title="Apply test animations to sample request items"
            >
              Test Animations
            </button>
            
            {/* Visual indicators toggle */}
            <button
              className={`debug-button visual-indicators-button ${showVisualIndicators ? 'active' : ''}`}
              onClick={() => setShowVisualIndicators(!showVisualIndicators)}
              title={showVisualIndicators ? "Hide colored indicators for request state" : "Show colored indicators for request state"}
            >
              {showVisualIndicators ? 'Hide Visual Indicators' : 'Show Visual Indicators'}
            </button>
          </div>
        )}
      </div>
      
      <div className="unresolved-container">
        {/* Providers are already sorted with active ones first, then inactive ones */}
        {providersWithRequests.map((providerWithRequests) => {
          const providerId = providerWithRequests.provider.providerId;
          const challengeExpanded = expandedLists[`${providerId}-challenge`] || false;
          const outputExpanded = expandedLists[`${providerId}-output`] || false;
          const hasRequests = providerWithRequests.challengeRequests.length > 0 || providerWithRequests.outputRequests.length > 0;
          
          return (
            <div 
              key={providerId} 
              className={`provider-requests-card ${updatedProviderIds.includes(providerId) ? 'refreshing' : ''}`}
            >
              <div className="provider-header">
                <div className="provider-status">
                  <FiCircle 
                    className={`status-indicator ${(providerWithRequests.provider.providerActivity?.random_balance || 0) > 1 ? 'online' : 'offline'}`}
                  />
                </div>
                <div className="provider-name">
                  {(providerWithRequests.provider.providerInfo as ProviderInfo)?.provider_details?.name || 'Unnamed Provider'}
                </div>
                <div 
                  className="provider-address"
                  onClick={(e) => copyToClipboard(e, providerId)}
                  title="Click to copy address"
                >
                  {truncateAddress(providerId)}
                  {copiedAddress === providerId ? (
                    <FiCheck className="copy-icon success" />
                  ) : (
                    <FiCopy className="copy-icon" />
                  )}
                </div>
              </div>
              
              <div className="request-summary">
                {/* Always render both sections but they might be empty */}
                <div className="request-type challenges">
                  <h4>Challenges ({providerWithRequests.challengeRequests.length})</h4>
                  {providerWithRequests.challengeRequests.length > 0 ? (
                    !challengeExpanded ? (
                      <div className="request-list scrollable">
                        {providerWithRequests.challengeRequests
                          .slice(0, VISIBLE_REQUESTS_COUNT)
                          .map(requestId => {
                            const styles = getRequestStyles(requestId, 'challenge');
                            return (
                              <div 
                                key={requestId} 
                                style={styles.style}
                              >
                                {styles.prefix}{truncateAddress(requestId)}
                              </div>
                            );
                          })}
                        {providerWithRequests.challengeRequests.length > VISIBLE_REQUESTS_COUNT && (
                          <div className="more-indicator">
                            + {providerWithRequests.challengeRequests.length - VISIBLE_REQUESTS_COUNT} more
                            <button 
                              className="view-all-button"
                              onClick={() => toggleRequestList(providerId, 'challenge')}
                            >
                              View all
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="request-list-full">
                        {providerWithRequests.challengeRequests.map(requestId => {
                          const styles = getRequestStyles(requestId, 'challenge');
                          return (
                            <div 
                              key={requestId} 
                              style={styles.style}
                            >
                              {styles.prefix}{truncateAddress(requestId)}
                            </div>
                          );
                        })}
                        <button 
                          className="view-all-button"
                          onClick={() => toggleRequestList(providerId, 'challenge')}
                        >
                          Show less
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="no-requests-message" style={{ padding: '0.25rem' }}>
                      {/* Empty placeholder - count is shown in header */}
                    </div>
                  )}
                </div>
                
                <div className="request-type output">
                  <h4>Output ({providerWithRequests.outputRequests.length})</h4>
                  {providerWithRequests.outputRequests.length > 0 ? (
                    !outputExpanded ? (
                      <div className="request-list scrollable">
                        {providerWithRequests.outputRequests
                          .slice(0, VISIBLE_REQUESTS_COUNT)
                          .map(requestId => {
                            const styles = getRequestStyles(requestId, 'output');
                            return (
                              <div 
                                key={requestId} 
                                style={styles.style}
                              >
                                {styles.prefix}{truncateAddress(requestId)}
                              </div>
                            );
                          })}
                        {providerWithRequests.outputRequests.length > VISIBLE_REQUESTS_COUNT && (
                          <div className="more-indicator">
                            + {providerWithRequests.outputRequests.length - VISIBLE_REQUESTS_COUNT} more
                            <button 
                              className="view-all-button"
                              onClick={() => toggleRequestList(providerId, 'output')}
                            >
                              View all
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="request-list-full">
                        {providerWithRequests.outputRequests.map(requestId => {
                          const styles = getRequestStyles(requestId, 'output');
                          return (
                            <div 
                              key={requestId} 
                              style={styles.style}
                            >
                              {styles.prefix}{truncateAddress(requestId)}
                            </div>
                          );
                        })}
                        <button 
                          className="view-all-button"
                          onClick={() => toggleRequestList(providerId, 'output')}
                        >
                          Show less
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="no-requests-message" style={{ padding: '0.25rem' }}>
                      {/* Empty placeholder - count is shown in header */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
