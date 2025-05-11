import { UsageTracker } from '~/lib/usage/tracker';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usage-middleware');

export interface UsageMiddlewareOptions {
  userId: string;
  stripeKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  actionType: string;
  creditsRequired: number;
  metadata?: Record<string, any>;
  apiBaseUrl?: string;
}

/**
 * Middleware to check and record usage before processing a request
 */
export async function checkAndRecordUsage(options: UsageMiddlewareOptions): Promise<{ allowed: boolean; error?: string }> {
  const { userId, stripeKey, supabaseUrl, supabaseKey, actionType, creditsRequired, metadata, apiBaseUrl } = options;

  if (!userId || !stripeKey || !supabaseUrl || !supabaseKey) {
    logger.error('Missing required credentials for usage tracking');
    return { allowed: false, error: 'Missing required credentials' };
  }

  const tracker = new UsageTracker({
    userId,
    stripeKey,
    supabaseUrl,
    supabaseKey,
    apiBaseUrl,
  });

  // Check if user has enough credits
  const hasEnoughCredits = await tracker.hasEnoughCredits(creditsRequired);
  if (!hasEnoughCredits) {
    logger.warn(`User ${userId} does not have enough credits for action ${actionType}`);
    return { allowed: false, error: 'Insufficient credits' };
  }

  // Record the usage
  const result = await tracker.recordUsage({
    actionType,
    creditsUsed: creditsRequired,
    metadata,
  });

  if (!result.success) {
    logger.error(`Failed to record usage for user ${userId}:`, result.error);
    return { allowed: false, error: result.error };
  }

  return { allowed: true };
}