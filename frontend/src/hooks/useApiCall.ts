import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

interface UseApiCallOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

export const useApiCall = <T = any>(options: UseApiCallOptions<T> = {}) => {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    retryAttempt = 0
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const result = await apiCall();
      
      setState({
        data: result,
        loading: false,
        error: null,
        retryCount: retryAttempt,
      });

      if (showSuccessToast) {
        toast.success('Operation completed successfully');
      }

      onSuccess?.(result);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error occurred');
      
      // Retry logic
      if (retryAttempt < maxRetries) {
        setTimeout(() => {
          execute(apiCall, retryAttempt + 1);
        }, retryDelay * Math.pow(2, retryAttempt)); // Exponential backoff
        
        return null;
      }

      setState({
        data: null,
        loading: false,
        error: errorObj,
        retryCount: retryAttempt,
      });

      if (showErrorToast) {
        toast.error(errorObj.message || 'Something went wrong');
      }

      onError?.(errorObj);
      return null;
    }
  }, [onSuccess, onError, showSuccessToast, showErrorToast, maxRetries, retryDelay]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
    });
  }, []);

  const retry = useCallback((apiCall: () => Promise<T>) => {
    return execute(apiCall, 0);
  }, [execute]);

  return {
    ...state,
    execute,
    reset,
    retry,
    canRetry: state.retryCount < maxRetries,
  };
};

export default useApiCall;