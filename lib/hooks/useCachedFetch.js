// lib/hooks/useCachedFetch.js
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useCachedFetch(url, options = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 دقيقة
    ...options,
  });

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    isReady: !isLoading && !error && data,
  };
}