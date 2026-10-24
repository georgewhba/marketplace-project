import { z } from 'zod';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function getPaginationMeta(page: number, limit: number, total: number) {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const clampedLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIMIT, MAX_LIMIT));
  const safeTotal = Math.max(0, Number.isFinite(total) ? Math.floor(total) : 0);
  return {
    page: safePage,
    limit: clampedLimit,
    total: safeTotal,
    totalPages: Math.ceil(safeTotal / clampedLimit),
  };
}

export function getOffset(page: number, limit: number): number {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const clampedLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : DEFAULT_LIMIT, MAX_LIMIT));
  return (safePage - 1) * clampedLimit;
}
