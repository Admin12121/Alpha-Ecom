/**
 * Standardized loading state management hook
 * Provides consistent loading state handling across the application
 */

import { useState, useCallback } from 'react';

export interface UseLoadingStateReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for managing loading states consistently
 * @param initialState - Initial loading state (default: false)
 * @returns Loading state utilities
 */
export function useLoadingState(initialState = false): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  /**
   * Wraps an async function with loading state management
   * Automatically sets loading to true before execution and false after
   */
  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsLoading(true);
      try {
        const result = await fn();
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

/**
 * Hook for managing multiple loading states
 * Useful when tracking different operations simultaneously
 */
export function useMultipleLoadingStates<K extends string>(
  keys: readonly K[]
): {
  isLoading: (key: K) => boolean;
  isAnyLoading: () => boolean;
  startLoading: (key: K) => void;
  stopLoading: (key: K) => void;
  withLoading: <T>(key: K, fn: () => Promise<T>) => Promise<T>;
} {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {} as Record<K, boolean>
  );

  const isLoading = useCallback(
    (key: K) => Boolean(loadingStates[key]),
    [loadingStates]
  );

  const isAnyLoading = useCallback(
    () => Object.values(loadingStates).some(Boolean),
    [loadingStates]
  );

  const startLoading = useCallback((key: K) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: K) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  }, []);

  const withLoading = useCallback(
    async <T,>(key: K, fn: () => Promise<T>): Promise<T> => {
      setLoadingStates((prev) => ({ ...prev, [key]: true }));
      try {
        const result = await fn();
        return result;
      } finally {
        setLoadingStates((prev) => ({ ...prev, [key]: false }));
      }
    },
    []
  );

  return {
    isLoading,
    isAnyLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}
