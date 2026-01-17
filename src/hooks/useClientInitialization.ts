import { useEffect, useState } from 'react';
import { aoHelpers } from '../utils/ao-helpers';

/**
 * Hook to pre-initialize all AO clients at app startup
 * This prevents concurrent initialization queries
 */
export const useClientInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // console.log('[useClientInitialization] Starting client initialization...');
        await aoHelpers.initializeClients();

        if (mounted) {
          // console.log('[useClientInitialization] Client initialization complete');
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('[useClientInitialization] Initialization failed:', err);
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return { isInitialized, error };
};
