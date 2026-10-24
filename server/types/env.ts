import type { AuthUser, AuthVendor } from '../middleware/authenticate.js';

/**
 * Hono environment type declarations for context variables.
 * This makes c.get('user') and c.get('vendor') type-safe.
 */
export type AppEnv = {
  Variables: {
    user: AuthUser;
    vendor: AuthVendor;
    requestId: string;
  };
};
