import { useMemo } from 'react';

interface SafeDataOptions<T> {
  fallback?: T;
  logErrors?: boolean;
}

export const useSafeData = <T>(
  data: T | null | undefined,
  options: SafeDataOptions<T> = {}
) => {
  const { fallback, logErrors = false } = options;

  const safeData = useMemo(() => {
    // Handle null/undefined data
    if (data === null || data === undefined) {
      if (logErrors && process.env.NODE_ENV === 'development') {
        console.warn('useSafeData: Received null/undefined data, using fallback');
      }
      return fallback;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.length > 0 ? data : (fallback || [] as T);
    }

    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const hasValidData = Object.keys(data).length > 0;
      if (!hasValidData && fallback) {
        if (logErrors && process.env.NODE_ENV === 'development') {
          console.warn('useSafeData: Received empty object, using fallback');
        }
        return fallback;
      }
    }

    return data;
  }, [data, fallback, logErrors]);

  const isEmpty = useMemo(() => {
    if (safeData === null || safeData === undefined) return true;
    if (Array.isArray(safeData)) return safeData.length === 0;
    if (typeof safeData === 'object') return Object.keys(safeData).length === 0;
    if (typeof safeData === 'string') return safeData.trim().length === 0;
    return false;
  }, [safeData]);

  const isValid = useMemo(() => {
    return safeData !== null && safeData !== undefined && !isEmpty;
  }, [safeData, isEmpty]);

  return {
    data: safeData,
    isEmpty,
    isValid,
    hasData: isValid,
  };
};

// Utility functions for safe data operations
export const safeArray = <T>(arr: T[] | null | undefined, fallback: T[] = []): T[] => {
  return Array.isArray(arr) ? arr : fallback;
};

export const safeString = (str: string | null | undefined, fallback = ''): string => {
  return typeof str === 'string' ? str : fallback;
};

export const safeNumber = (num: number | null | undefined, fallback = 0): number => {
  return typeof num === 'number' && !isNaN(num) ? num : fallback;
};

export const safeObject = <T extends object>(
  obj: T | null | undefined,
  fallback: T | {} = {}
): T => {
  return obj && typeof obj === 'object' ? obj : (fallback as T);
};

export default useSafeData;