import { Hono } from 'hono';
import { db } from '../db/index.js';
import { products, categories, vendors } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { getRequestBaseUrl } from '../middleware/httpsRedirect.js';

const agentRoutes = new Hono();

// Helper to get the base URL dynamically (with SSL & reverse proxy support)
const getBaseUrl = (c: any) => getRequestBaseUrl(c);

// 1. robots.txt
agentRoutes.get('/robots.txt', (c) => {
  const baseUrl = getBaseUrl(c);
  const robots = `User-agent: *
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/
Disallow: /api/admin/
Disallow: /api/payments/
Disallow: /api/refunds/

# AI Agents specific rules
User-agent: GPTBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: ClaudeBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: Google-Extended
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

User-agent: PerplexityBot
Allow: /api/store/
Disallow: /api/auth/
Disallow: /api/cart/
Disallow: /api/orders/

Sitemap: ${baseUrl}/sitemap.xml
`;
  return c.text(robots);
});

// 2. sitemap.xml
agentRoutes.get('/sitemap.xml', async (c) => {
  const baseUrl = getBaseUrl(c);
  
  const allProducts = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true));
  const allCategories = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
  const allVendors = await db.select({ slug: vendors.storeSlug }).from(vendors).where(eq(vendors.status, 'approved'));

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  allCategories.forEach(cat => {
    xml += `
  <url>
    <loc>${baseUrl}/api/store/categories/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  allVendors.forEach(vendor => {
    xml += `
  <url>
    <loc>${baseUrl}/api/store/vendors/${vendor.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  allProducts.forEach(prod => {
    const lastMod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    xml += `
  <url>
    <loc>${baseUrl}/api/store/products/${prod.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  xml += `\n</urlset>`;
  
  return c.text(xml, 200, { 'Content-Type': 'application/xml' });
});

// 3. llms.txt
agentRoutes.get('/llms.txt', (c) => {
  const baseUrl = getBaseUrl(c);
  const text = `# Marketplace Agent Guide

This is a multi-vendor ecommerce marketplace. AI agents are welcome to discover products, read reviews, and explore vendor storefronts.

## Machine-Readable Resources
- **API Catalog (OpenAPI):** ${baseUrl}/api/catalog
- **MCP Server Card:** ${baseUrl}/.well-known/mcp-server.json
- **Agent Plugin config:** ${baseUrl}/.well-known/ai-plugin.json
- **Sitemap:** ${baseUrl}/sitemap.xml

## Content Negotiation
All public \`/api/store/*\` routes support Markdown content negotiation.
Include \`Accept: text/markdown\` in your request headers to receive agent-optimized, clean markdown representations of products, categories, and vendors, complete with Schema.org JSON-LD structured data.

## Authentication
For endpoints requiring authentication (e.g. cart, orders), we use standard JWT. See OAuth discovery for details:
${baseUrl}/.well-known/oauth-authorization-server

## Policies
- Agents may not perform checkout or payment actions without explicit human-in-the-loop confirmation.
- Prompt injection protection and rate limits are enforced.
`;
  return c.text(text);
});

// 4. OAuth Discovery
agentRoutes.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/login`,
    token_endpoint: `${baseUrl}/api/auth/refresh`,
    scopes_supported: ["customer:read", "customer:write", "cart:read", "cart:write", "orders:read", "orders:write"],
    response_types_supported: ["token"],
    grant_types_supported: ["password", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post"]
  });
});

// 5. MCP Server Card
agentRoutes.get('/.well-known/mcp-server.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    mcp_version: "1.0",
    server: {
      name: "Marketplace MCP Server",
      description: "Provides access to the marketplace catalog for AI Agents.",
      version: "1.0.0",
      capabilities: {
        tools: [
          {
            name: "search_products",
            description: "Search the product catalog by keyword, price, or category.",
            inputs: {
              type: "object",
              properties: {
                search: { type: "string" },
                minPrice: { type: "number" },
                maxPrice: { type: "number" }
              }
            }
          },
          {
            name: "get_product",
            description: "Retrieve details of a specific product by slug.",
            inputs: {
              type: "object",
              properties: {
                slug: { type: "string" }
              },
              required: ["slug"]
            }
          }
        ],
        resources: [
          {
            uri: `${baseUrl}/api/store/categories`,
            description: "List of all product categories."
          }
        ]
      }
    }
  });
});

// 6. AI Plugin config
agentRoutes.get('/.well-known/ai-plugin.json', (c) => {
  const baseUrl = getBaseUrl(c);
  return c.json({
    schema_version: "v1",
    name_for_human: "Marketplace Search",
    name_for_model: "marketplace_search",
    description_for_human: "Search for products and browse the marketplace catalog.",
    description_for_model: "Help the user search for products, view vendor stores, and read reviews on the marketplace. Use the OpenAPI spec to understand available endpoints.",
    auth: {
      type: "none" // Public catalog doesn't require auth
    },
    api: {
      type: "openapi",
      url: `${baseUrl}/api/catalog`,
      is_user_authenticated: false
    },
    logo_url: `${baseUrl}/favicon.ico`,
    contact_email: "support@marketplace.com",
    legal_info_url: `${baseUrl}/legal`
  });
});

// 7. API Catalog (OpenAPI Spec)
agentRoutes.get('/api/catalog', (c) => {
  const baseUrl = getBaseUrl(c);
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Marketplace Agent API",
      description: "Machine-readable API for discovering products, categories, and vendors.",
      version: "1.0.0"
    },
    servers: [
      { url: baseUrl }
    ],
    paths: {
      "/api/store/products": {
        get: {
          summary: "List Products",
          operationId: "listProducts",
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "vendor", in: "query", schema: { type: "string" } },
            { name: "minPrice", in: "query", schema: { type: "number" } },
            { name: "maxPrice", in: "query", schema: { type: "number" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
          ],
          responses: {
            "200": {
              description: "A list of products.",
              content: {
                "application/json": {
                  schema: { type: "object" }
                },
                "text/markdown": {
                  schema: { type: "string" }
                }
              }
            }
          }
        }
      },
      "/api/store/products/{slug}": {
        get: {
          summary: "Get Product Details",
          operationId: "getProduct",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Product details including vendor and reviews.",
              content: {
                "application/json": { schema: { type: "object" } },
                "text/markdown": { schema: { type: "string" } }
              }
            }
          }
        }
      },
      "/api/store/vendors/{slug}": {
        get: {
          summary: "Get Vendor Details",
          operationId: "getVendor",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            "200": {
              description: "Vendor store profile and top products.",
              content: {
                "application/json": { schema: { type: "object" } },
                "text/markdown": { schema: { type: "string" } }
              }
            }
          }
        }
      }
    }
  };
  return c.json(openApiSpec);
});

export default agentRoutes;
