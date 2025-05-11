import React, { useEffect, useState } from 'react';
import { SubscriptionInfo } from '~/components/subscription/SubscriptionInfo';
import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseClient } from '~/lib/supabase/client';

export async function loader({ request }: LoaderFunctionArgs) {
  // In a real app, you would get these from environment variables or cookies
  const supabaseUrl = request.headers.get('x-supabase-url') || '';
  const supabaseKey = request.headers.get('x-supabase-key') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    return json({ 
      error: 'Missing Supabase credentials',
      isAuthenticated: false,
      profile: null,
      plans: []
    });
  }
  
  try {
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return json({ 
        error: userError?.message || 'Not authenticated',
        isAuthenticated: false,
        profile: null,
        plans: []
      });
    }
    
    // Get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return json({ 
        error: profileError.message,
        isAuthenticated: true,
        profile: null,
        plans: []
      });
    }
    
    // Get available subscription plans
    const { data: plans, error: plansError } = await supabase
      .from('prices')
      .select('*, products(*)')
      .eq('active', true)
      .order('unit_amount', { ascending: true });
    
    if (plansError) {
      return json({ 
        error: plansError.message,
        isAuthenticated: true,
        profile,
        plans: []
      });
    }
    
    return json({ 
      isAuthenticated: true,
      profile,
      plans: plans || [],
      error: null
    });
  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'An error occurred',
      isAuthenticated: false,
      profile: null,
      plans: []
    });
  }
}

export default function SubscriptionPage() {
  const { isAuthenticated, profile, plans, error } = useLoaderData<typeof loader>();
  const [stripeKey, setStripeKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  
  useEffect(() => {
    // In a real app, you would get these from environment variables or a secure store
    const storedStripeKey = localStorage.getItem('stripeKey');
    const storedSupabaseUrl = localStorage.getItem('supabaseUrl');
    const storedSupabaseKey = localStorage.getItem('supabaseKey');
    
    if (storedStripeKey) setStripeKey(storedStripeKey);
    if (storedSupabaseUrl) setSupabaseUrl(storedSupabaseUrl);
    if (storedSupabaseKey) setSupabaseKey(storedSupabaseKey);
  }, []);
  
  const handleUpgrade = async (priceId: string) => {
    if (!isAuthenticated || !profile) {
      alert('You must be logged in to upgrade your subscription');
      return;
    }
    
    try {
      // Create a checkout session
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createCheckoutSession',
          priceId,
          customerId: profile.stripe_customer_id,
          userId: profile.id,
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscription?canceled=true`,
          stripeKey,
          supabaseUrl,
          supabaseKey,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to create checkout session');
    }
  };
  
  const handleManageSubscription = async () => {
    if (!isAuthenticated || !profile || !profile.stripe_customer_id) {
      alert('You must have an active subscription to manage it');
      return;
    }
    
    try {
      // Create a billing portal session
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPortalSession',
          customerId: profile.stripe_customer_id,
          returnUrl: `${window.location.origin}/subscription`,
          stripeKey,
          supabaseUrl,
          supabaseKey,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      // Redirect to Stripe Billing Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Failed to create portal session');
    }
  };
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Please log in to manage your subscription.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
      
      {profile && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Current Subscription</h2>
          <SubscriptionInfo 
            profile={profile} 
            onUpgrade={() => {}} 
          />
          
          {profile.subscription_status === 'active' && (
            <button
              onClick={handleManageSubscription}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Manage Subscription
            </button>
          )}
        </div>
      )}
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((price) => (
            <div key={price.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium">{price.products?.name || 'Unknown Plan'}</h3>
              <p className="text-gray-600 mb-2">{price.products?.description || ''}</p>
              
              <div className="text-2xl font-bold mb-4">
                ${(price.unit_amount / 100).toFixed(2)}/{price.interval}
              </div>
              
              <ul className="mb-4 space-y-2">
                {price.products?.metadata?.features?.split(',').map((feature: string, index: number) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature.trim()}
                  </li>
                )) || []}
              </ul>
              
              <button
                onClick={() => handleUpgrade(price.stripe_price_id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {profile?.subscription_tier === price.products?.metadata?.tier ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
          
          {plans.length === 0 && (
            <p>No subscription plans available.</p>
          )}
        </div>
      </div>
    </div>
  );
}