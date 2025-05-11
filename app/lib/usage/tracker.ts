import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usage-tracker');

export interface UsageTrackerOptions {
  userId: string;
  stripeKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  apiBaseUrl?: string;
}

export interface RecordUsageOptions {
  actionType: string;
  creditsUsed: number;
  metadata?: Record<string, any>;
}

export interface UsageResponse {
  success: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  usageLimit: number;
  error?: string;
}

export class UsageTracker {
  private userId: string;
  private stripeKey: string;
  private supabaseUrl: string;
  private supabaseKey: string;
  private apiBaseUrl: string;

  constructor(options: UsageTrackerOptions) {
    this.userId = options.userId;
    this.stripeKey = options.stripeKey;
    this.supabaseUrl = options.supabaseUrl;
    this.supabaseKey = options.supabaseKey;
    this.apiBaseUrl = options.apiBaseUrl || '';
  }

  /**
   * Record usage for a specific action
   */
  async recordUsage({ actionType, creditsUsed, metadata }: RecordUsageOptions): Promise<UsageResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'recordUsage',
          userId: this.userId,
          actionType,
          creditsUsed,
          metadata,
          stripeKey: this.stripeKey,
          supabaseUrl: this.supabaseUrl,
          supabaseKey: this.supabaseKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Failed to record usage:', data.error);
        return {
          success: false,
          creditsUsed: 0,
          creditsRemaining: 0,
          usageLimit: 0,
          error: data.error,
        };
      }

      return {
        success: true,
        creditsUsed: data.creditsUsed,
        creditsRemaining: data.creditsRemaining,
        usageLimit: data.usageLimit,
      };
    } catch (error) {
      logger.error('Error recording usage:', error);
      return {
        success: false,
        creditsUsed: 0,
        creditsRemaining: 0,
        usageLimit: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's usage statistics
   */
  async getUserUsage(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getUserUsage',
          userId: this.userId,
          stripeKey: this.stripeKey,
          supabaseUrl: this.supabaseUrl,
          supabaseKey: this.supabaseKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('Failed to get user usage:', data.error);
        return { error: data.error };
      }

      return data;
    } catch (error) {
      logger.error('Error getting user usage:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check if user has enough credits for an action
   */
  async hasEnoughCredits(creditsNeeded: number): Promise<boolean> {
    try {
      const usage = await this.getUserUsage();
      if (usage.error) {
        return false;
      }

      return usage.profile.usage_credits >= creditsNeeded;
    } catch (error) {
      logger.error('Error checking credits:', error);
      return false;
    }
  }
}