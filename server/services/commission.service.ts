import { db } from '../db/index.js';
import { commissionRules } from '../db/schema/commission-rules.js';
import { vendors } from '../db/schema/vendors.js';
import { and, eq, isNull, lte, or } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';

/**
 * Resolves the active commission rate for a vendor and category.
 * Rules priority: vendor specific (targetId = vendorId) > category specific (targetId = categoryId) > global (targetId is null)
 * Among rules of the same scope, the one with highest `priority` wins.
 */
export async function resolveCommissionRate(vendorId: number, categoryId: number): Promise<number> {
  const now = new Date();

  // Find all active rules that could apply
  const activeRules = await db.select()
    .from(commissionRules)
    .where(
      and(
        lte(commissionRules.effectiveFrom, now),
        or(
          isNull(commissionRules.effectiveTo),
          // >= doesn't exist directly like lte, so we use SQL or building a custom clause if needed
          // Actually, we can just fetch and filter in memory since rules won't be huge, 
          // or use the appropriate operator. Let's filter in memory for effectiveTo to be safe.
        )
      )
    );

  // Filter effective rules
  const validRules = activeRules.filter(rule => {
    if (rule.effectiveTo && rule.effectiveTo < now) return false;
    
    if (rule.scope === 'vendor' && rule.targetId === vendorId) return true;
    if (rule.scope === 'category' && rule.targetId === categoryId) return true;
    if (rule.scope === 'global') return true;
    
    return false;
  });

  if (validRules.length > 0) {
    // Sort by priority (highest first)
    validRules.sort((a, b) => {
      // First by scope priority
      const scopeWeight = { 'vendor': 3, 'category': 2, 'global': 1 };
      const weightA = scopeWeight[a.scope as keyof typeof scopeWeight] || 0;
      const weightB = scopeWeight[b.scope as keyof typeof scopeWeight] || 0;
      
      if (weightA !== weightB) return weightB - weightA;
      
      // Then by rule priority
      return b.priority - a.priority;
    });

    return parseFloat(validRules[0]!.rate);
  }

  // Fallback to vendors.commissionRate
  const [vendor] = await db.select({ commissionRate: vendors.commissionRate })
    .from(vendors)
    .where(eq(vendors.id, vendorId))
    .limit(1);

  if (vendor?.commissionRate) {
    return parseFloat(vendor.commissionRate);
  }

  return 10.0; // Default if nothing is found (shouldn't happen)
}
