import { useEffect } from 'react';
import { useSiteName } from './useSiteSettings';

interface TitleOptions {
  description?: string;
  canonicalPath?: string;
}

/**
 * Senior SEO hook to maintain unique page titles, canonical URLs, and meta descriptions.
 */
export function useDocumentTitle(pageTitle?: string, options?: TitleOptions) {
  const siteName = useSiteName();

  useEffect(() => {
    // 1. Update Title
    const formattedTitle = pageTitle ? `${pageTitle} — ${siteName}` : `${siteName} — تسوّق من أفضل البائعين`;
    document.title = formattedTitle;

    // 2. Update Meta Description if provided
    if (options?.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', options.description);
      }
    }

    // 3. Update Canonical Tag
    const canonicalHref = options?.canonicalPath
      ? `${window.location.origin}${options.canonicalPath}`
      : window.location.href.split('?')[0];

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalHref);
  }, [pageTitle, siteName, options?.description, options?.canonicalPath]);
}
