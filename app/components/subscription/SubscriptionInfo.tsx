import React from 'react';
import { Progress } from '../ui/Progress';

interface SubscriptionInfoProps {
  profile: {
    subscription_tier: string | null;
    subscription_status: string | null;
    usage_credits: number;
    usage_limit: number;
  };
  onUpgrade?: () => void;
}

export function SubscriptionInfo({ profile, onUpgrade }: SubscriptionInfoProps) {
  const { subscription_tier, subscription_status, usage_credits, usage_limit } = profile;
  
  const usagePercentage = usage_limit > 0 ? (usage_credits / usage_limit) * 100 : 0;
  const isLowCredits = usagePercentage < 20;
  
  const getTierLabel = () => {
    switch (subscription_tier) {
      case 'free':
        return 'Free Tier';
      case 'basic':
        return 'Basic Plan';
      case 'premium':
        return 'Premium Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return 'Unknown Tier';
    }
  };
  
  const getStatusLabel = () => {
    switch (subscription_status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'incomplete':
        return 'Incomplete';
      default:
        return 'Not Subscribed';
    }
  };
  
  const getStatusColor = () => {
    switch (subscription_status) {
      case 'active':
        return 'text-green-500';
      case 'trialing':
        return 'text-blue-500';
      case 'past_due':
        return 'text-orange-500';
      case 'canceled':
      case 'incomplete':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">{getTierLabel()}</h3>
          <p className={`text-sm ${getStatusColor()}`}>{getStatusLabel()}</p>
        </div>
        {onUpgrade && (subscription_tier === 'free' || subscription_tier === 'basic') && (
          <button
            onClick={onUpgrade}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upgrade
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Usage Credits</span>
          <span>
            {usage_credits} / {usage_limit}
          </span>
        </div>
        <Progress value={usagePercentage} className={isLowCredits ? 'bg-red-200' : ''} />
        {isLowCredits && (
          <p className="text-xs text-red-500 mt-1">
            Low credits remaining. Consider upgrading your plan.
          </p>
        )}
      </div>
    </div>
  );
}