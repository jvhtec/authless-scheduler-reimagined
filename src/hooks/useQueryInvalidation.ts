import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export const useQueryInvalidation = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate and refetch queries when route changes
    queryClient.invalidateQueries();
  }, [location.pathname, queryClient]);
};