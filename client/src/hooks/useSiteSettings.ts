import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../api';

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: () => storeApi.getSettings().then((res: any) => res.data || res),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteName() {
  const { data } = useSiteSettings();
  return data?.siteName || 'سوق مصر';
}
