/**
 * WebMCP (Web Model Context Protocol) Integration
 * Exposes site tools to AI agents via navigator.modelContext.provideContext()
 * Reference: https://webmachinelearning.github.io/webmcp/
 */
export function initWebMCP() {
  if (typeof window === 'undefined') return;

  try {
    const nav = navigator as any;
    if ('modelContext' in nav && typeof nav.modelContext?.provideContext === 'function') {
      nav.modelContext.provideContext({
        tools: [
          {
            name: 'search_marketplace_products',
            description: 'Search for products available in the multi-vendor marketplace by keyword or category',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search keywords or product title' },
                category: { type: 'string', description: 'Category slug' },
                limit: { type: 'number', description: 'Max items to return (default 10)' }
              },
              required: ['query']
            },
            execute: async ({ query, category, limit }: { query: string; category?: string; limit?: number }) => {
              const url = new URL('/api/store/products', window.location.origin);
              url.searchParams.set('search', query);
              if (category) url.searchParams.set('category', category);
              url.searchParams.set('limit', String(limit || 10));
              const res = await fetch(url.toString(), {
                headers: { 'Accept': 'application/json' }
              });
              return res.json();
            }
          },
          {
            name: 'get_product_details',
            description: 'Get specifications, pricing, seller, and stock status for a product slug',
            inputSchema: {
              type: 'object',
              properties: {
                slug: { type: 'string', description: 'Unique product slug' }
              },
              required: ['slug']
            },
            execute: async ({ slug }: { slug: string }) => {
              const res = await fetch(`/api/store/products/${encodeURIComponent(slug)}`, {
                headers: { 'Accept': 'application/json' }
              });
              return res.json();
            }
          }
        ]
      });
    }
  } catch (err) {
    // Non-blocking for browsers that don't support WebMCP yet
  }
}
