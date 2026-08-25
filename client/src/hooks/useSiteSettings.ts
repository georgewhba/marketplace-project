import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../api';
import { useEffect } from 'react';

export function useSiteName() {
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => storeApi.getSettings().then((res: any) => res.data || res),
    staleTime: 5 * 60 * 1000,
  });
  
  const siteName = data?.siteName || 'سوق مصر';

  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  return siteName;
}
