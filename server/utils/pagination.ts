import { z } from 'zod';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function getPaginationMeta(page: number, limit: number, total: number) {
  const clampedLimit = Math.min(limit, MAX_LIMIT);
  return {
    page,
    limit: clampedLimit,
    total,
    totalPages: Math.ceil(total / clampedLimit),
  };
}

export function getOffset(page: number, limit: number): number {
  const clampedLimit = Math.min(limit, MAX_LIMIT);
  return (page - 1) * clampedLimit;
}
