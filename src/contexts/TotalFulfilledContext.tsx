import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getProviderCurrentRandom } from '../utils/graphQLquery';

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

// Batch processing config
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface CacheEntry {
  value: number;
  timestamp: number;
}

interface ProviderStatus {
  status: LoadStatus;
  value: number | null;
  error: string | null;
}

interface TotalFulfilledContextValue {
  loadProvider: (providerId: string) => void;
  refreshProvider: (providerId: string) => void;
  loadProviders: (providerIds: string[]) => void;
  getStatus: (providerId: string) => ProviderStatus;
  getCachedValue: (providerId: string) => number | null;
}

const TotalFulfilledContext = createContext<TotalFulfilledContextValue | undefined>(undefined);

export const TotalFulfilledProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global cache shared across all components
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // Status for each provider (this triggers re-renders)
  const [providerStatuses, setProviderStatuses] = useState<Map<string, ProviderStatus>>(new Map());

  // Queue of providers waiting to be fetched
  const queueRef = useRef<Set<string>>(new Set());

  // Currently processing batch
  const isProcessingRef = useRef(false);

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback((entry: CacheEntry | undefined): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
  }, []);

  /**
   * Get cached value if valid
   */
  const getCachedValue = useCallback((providerId: string): number | null => {
    const entry = cacheRef.current.get(providerId);
    if (entry && isCacheValid(entry)) {
      return entry.value;
    }
    return null;
  }, [isCacheValid]);

  /**
   * Process the queue in batches
   */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.size === 0) {
      return;
    }

    isProcessingRef.current = true;

    try {
      while (queueRef.current.size > 0) {
        // Take next batch
        const batch = Array.from(queueRef.current).slice(0, BATCH_SIZE);

        // Remove from queue
        batch.forEach(id => queueRef.current.delete(id));

        // Update status to loading
        setProviderStatuses(prev => {
          const next = new Map(prev);
          batch.forEach(id => {
            next.set(id, { status: 'loading', value: null, error: null });
          });
          return next;
        });

        // Fetch in parallel for this batch using direct GraphQL queries (only current process)
        const results = await Promise.allSettled(
          batch.map(async (providerId) => {
            try {
              const count = await getProviderCurrentRandom(providerId);
              return { providerId, value: count };
            } catch (error) {
              throw { providerId, error };
            }
          })
        );

        // Update statuses and cache
        setProviderStatuses(prev => {
          const next = new Map(prev);

          results.forEach((result, index) => {
            const providerId = batch[index];

            if (result.status === 'fulfilled') {
              const { value } = result.value;

              // Cache the result
              cacheRef.current.set(providerId, {
                value,
                timestamp: Date.now()
              });

              // Update status
              next.set(providerId, {
                status: 'loaded',
                value,
                error: null
              });
            } else {
              // Error
              const errorMsg = result.reason?.error?.message || 'Failed to fetch';
              next.set(providerId, {
                status: 'error',
                value: null,
                error: errorMsg
              });
            }
          });

          return next;
        });

        // Wait before next batch (unless this was the last batch)
        if (queueRef.current.size > 0) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  /**
   * Load data for a provider (checks cache first, then queues if needed)
   */
  const loadProvider = useCallback((providerId: string) => {
    // Check cache first
    const cached = getCachedValue(providerId);
    if (cached !== null) {
      setProviderStatuses(prev => {
        const next = new Map(prev);
        next.set(providerId, {
          status: 'loaded',
          value: cached,
          error: null
        });
        return next;
      });
      return;
    }

    // Check if already in queue or loading
    const currentStatus = providerStatuses.get(providerId);
    if (currentStatus?.status === 'loading' || queueRef.current.has(providerId)) {
      return;
    }

    // Add to queue
    queueRef.current.add(providerId);

    // Start processing
    processQueue();
  }, [getCachedValue, providerStatuses, processQueue]);

  /**
   * Force refresh a provider (bypass cache)
   */
  const refreshProvider = useCallback((providerId: string) => {
    // Invalidate cache
    cacheRef.current.delete(providerId);

    // Remove from queue if present
    queueRef.current.delete(providerId);

    // Clear existing status
    setProviderStatuses(prev => {
      const next = new Map(prev);
      next.delete(providerId);
      return next;
    });

    // Load fresh
    loadProvider(providerId);
  }, [loadProvider]);

  /**
   * Batch load multiple providers
   */
  const loadProviders = useCallback((providerIds: string[]) => {
    providerIds.forEach(id => loadProvider(id));
  }, [loadProvider]);

  /**
   * Get current status for a provider
   */
  const getStatus = useCallback((providerId: string): ProviderStatus => {
    return providerStatuses.get(providerId) || {
      status: 'idle',
      value: null,
      error: null
    };
  }, [providerStatuses]);

  const value: TotalFulfilledContextValue = {
    loadProvider,
    refreshProvider,
    loadProviders,
    getStatus,
    getCachedValue
  };

  return (
    <TotalFulfilledContext.Provider value={value}>
      {children}
    </TotalFulfilledContext.Provider>
  );
};

export const useTotalFulfilled = () => {
  const context = useContext(TotalFulfilledContext);
  if (!context) {
    throw new Error('useTotalFulfilled must be used within TotalFulfilledProvider');
  }
  return context;
};
