import React, { useEffect, useRef, useState } from 'react';
import { useRequests } from '../../contexts/RequestsContext';
import './AnimatedRandomBalance.css';

interface AnimatedRandomBalanceProps {
  providerId: string;
  initialValue: number | undefined;
}

type AnimationState = 'idle' | 'flash-grey' | 'updating' | 'flash-change';

/**
 * Component that watches RequestsContext for random_balance changes
 * and animates the value update with visual feedback
 */
export const AnimatedRandomBalance: React.FC<AnimatedRandomBalanceProps> = ({
  providerId,
  initialValue
}) => {
  const { getAllRequests } = useRequests();
  const [currentValue, setCurrentValue] = useState<number | undefined>(initialValue);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [changeDirection, setChangeDirection] = useState<'increase' | 'decrease' | null>(null);
  const previousValueRef = useRef<number | undefined>(initialValue);

  // Poll RequestsContext for updates
  useEffect(() => {
    const checkForUpdates = () => {
      // Get all providers from RequestsContext
      const allRequests = getAllRequests();

      // Find this provider in the challenges or outputs
      // The RequestsContext has provider activity data
      // We need to check if the random_balance changed

      // Note: RequestsContext doesn't directly expose provider activity
      // We need to get this from the ProviderContext instead
      // For now, let's just update when the prop changes
    };

    const interval = setInterval(checkForUpdates, 1000);
    return () => clearInterval(interval);
  }, [getAllRequests, providerId]);

  // Watch for external value changes (from ProviderContext refresh)
  useEffect(() => {
    if (initialValue !== previousValueRef.current && initialValue !== undefined) {
      const oldValue = previousValueRef.current;
      previousValueRef.current = initialValue;

      // Trigger animation sequence
      animateChange(oldValue, initialValue);
    }
  }, [initialValue]);

  const animateChange = async (oldValue: number | undefined, newValue: number) => {
    // Determine direction
    if (oldValue !== undefined) {
      setChangeDirection(newValue > oldValue ? 'increase' : 'decrease');
    }

    // Animation sequence:
    // 1. Flash grey (200ms)
    setAnimationState('flash-grey');
    await sleep(200);

    // 2. Update value
    setAnimationState('updating');
    setCurrentValue(newValue);
    await sleep(100);

    // 3. Flash highlight based on direction (500ms)
    setAnimationState('flash-change');
    await sleep(500);

    // 4. Return to idle
    setAnimationState('idle');
    setChangeDirection(null);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const isLoading = currentValue === undefined;

  return (
    <div
      className={`animated-random-balance
        state-${animationState}
        ${changeDirection ? `direction-${changeDirection}` : ''}
        ${isLoading ? 'is-loading' : ''}`}
    >
      {isLoading ? (
        <div className="futuristic-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
      ) : (
        <span className="value">{currentValue}</span>
      )}
    </div>
  );
};

// Helper to format the value
const formatValue = (value: number | undefined): string => {
  if (value === undefined) return 'N/A';
  return value.toString();
};
