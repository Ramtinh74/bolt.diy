import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

interface SubscriptionManagerProps {
  className?: string;
}

export default function SubscriptionManager({ className }: SubscriptionManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Sample plans - in a real app, these would come from your Stripe products
  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Basic access with limited features',
      price: 0,
      credits: 10,
      features: [
        '10 credits per month',
        'Basic chat functionality',
        'Standard response time',
      ],
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Perfect for personal projects',
      price: 9.99,
      credits: 100,
      features: [
        '100 credits per month',
        'Advanced chat functionality',
        'Priority response time',
        'Basic analytics',
      ],
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'For power users and small teams',
      price: 29.99,
      credits: 500,
      features: [
        '500 credits per month',
        'All advanced features',
        'Fastest response time',
        'Detailed analytics',
        'Priority support',
      ],
    },
  ];
  
  useEffect(() => {
    // Check if user is authenticated
    const authUser = localStorage.getItem('authUser');
    const userProfile = localStorage.getItem('userProfile');
    
    if (authUser && userProfile) {
      setIsAuthenticated(true);
      
      // Get current subscription tier
      try {
        const profile = JSON.parse(userProfile);
        setCurrentPlan(profile.subscription_tier);
      } catch (error) {
        console.error('Error parsing user profile:', error);
      }
    }
  }, []);
  
  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to subscribe to a plan');
      return;
    }
    
    if (planId === currentPlan) {
      toast.info('You are already subscribed to this plan');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get credentials from localStorage
      const stripeKey = localStorage.getItem('stripeKey');
      const authUser = localStorage.getItem('authUser');
      
      if (!stripeKey || !authUser) {
        throw new Error('Missing required credentials');
      }
      
      const user = JSON.parse(authUser);
      
      // Map plan IDs to Stripe price IDs (these would be your actual Stripe price IDs)
      const stripePriceIds: Record<string, string> = {
        free: 'price_free', // This would typically be handled differently since it's free
        basic: 'price_basic',
        premium: 'price_premium',
      };
      
      // For free plan, just update the user's profile
      if (planId === 'free') {
        // Get Supabase credentials
        const supabaseUrl = localStorage.getItem('supabaseUrl');
        const supabaseKey = localStorage.getItem('supabaseKey');
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase credentials');
        }
        
        // Update user profile directly
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateProfile',
            supabaseUrl,
            supabaseKey,
            userId: user.id,
            profileData: {
              subscription_tier: 'free',
              subscription_status: 'active',
              usage_limit: 10,
            },
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update subscription');
        }
        
        // Update local state
        setCurrentPlan('free');
        
        // Update stored profile
        const userProfile = localStorage.getItem('userProfile');
        if (userProfile) {
          const profile = JSON.parse(userProfile);
          profile.subscription_tier = 'free';
          profile.subscription_status = 'active';
          profile.usage_limit = 10;
          localStorage.setItem('userProfile', JSON.stringify(profile));
        }
        
        toast.success('Successfully switched to Free plan');
        return;
      }
      
      // For paid plans, create a Stripe checkout session
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createCheckoutSession',
          stripeKey,
          priceId: stripePriceIds[planId],
          customerId: user.stripe_customer_id, // This would come from the user's profile
          successUrl: `${window.location.origin}/settings?subscription=success`,
          cancelUrl: `${window.location.origin}/settings?subscription=canceled`,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe to plan');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManageSubscription = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to manage your subscription');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get credentials from localStorage
      const stripeKey = localStorage.getItem('stripeKey');
      const authUser = localStorage.getItem('authUser');
      const userProfile = localStorage.getItem('userProfile');
      
      if (!stripeKey || !authUser || !userProfile) {
        throw new Error('Missing required credentials');
      }
      
      const profile = JSON.parse(userProfile);
      
      if (!profile.stripe_customer_id) {
        throw new Error('No Stripe customer ID found');
      }
      
      // Create a Stripe billing portal session
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPortalSession',
          stripeKey,
          customerId: profile.stripe_customer_id,
          returnUrl: `${window.location.origin}/settings`,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create billing portal session');
      }
      
      // Redirect to Stripe Billing Portal
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to manage subscription');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <motion.div
      className={classNames(
        'bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="i-ph:currency-circle-dollar-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Subscription Plans</span>
        </div>
        
        {isAuthenticated && currentPlan && currentPlan !== 'free' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="text-xs"
          >
            Manage Subscription
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={classNames(
              'border rounded-lg p-4 relative',
              plan.popular
                ? 'border-purple-500 dark:border-purple-500'
                : 'border-gray-200 dark:border-gray-800',
              currentPlan === plan.id
                ? 'bg-purple-50 dark:bg-purple-900/10'
                : 'bg-white dark:bg-[#0A0A0A]'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                Popular
              </div>
            )}
            
            <div className="text-lg font-semibold text-bolt-elements-textPrimary mb-1">
              {plan.name}
            </div>
            
            <div className="text-sm text-bolt-elements-textSecondary mb-4">
              {plan.description}
            </div>
            
            <div className="flex items-baseline mb-4">
              <span className="text-2xl font-bold text-bolt-elements-textPrimary">
                ${plan.price}
              </span>
              {plan.price > 0 && (
                <span className="text-sm text-bolt-elements-textSecondary ml-1">
                  /month
                </span>
              )}
            </div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="i-ph:check-circle-fill w-4 h-4 text-green-500 mr-2 mt-0.5" />
                  <span className="text-sm text-bolt-elements-textSecondary">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button
              variant={currentPlan === plan.id ? 'outline' : 'default'}
              className="w-full"
              disabled={isLoading || currentPlan === plan.id}
              onClick={() => handleSubscribe(plan.id)}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin i-ph:spinner w-4 h-4 mr-2" />
                  <span>Processing...</span>
                </div>
              ) : currentPlan === plan.id ? (
                'Current Plan'
              ) : (
                `Subscribe${plan.price > 0 ? '' : ' (Free)'}`
              )}
            </Button>
          </div>
        ))}
      </div>
      
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg mt-4">
          <div className="flex items-start">
            <div className="i-ph:info-fill w-4 h-4 text-blue-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-bolt-elements-textPrimary font-medium">
                Sign in to manage your subscription
              </p>
              <p className="text-xs text-bolt-elements-textSecondary mt-1">
                You need to be signed in to subscribe to a plan or manage your existing subscription.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.href = '/auth'}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}