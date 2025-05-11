import React, { useEffect, useState } from 'react';
import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseClient } from '~/lib/supabase/client';
import { UsageStats } from '~/components/subscription/UsageStats';

export async function loader({ request }: LoaderFunctionArgs) {
  // In a real app, you would get these from environment variables or cookies
  const supabaseUrl = request.headers.get('x-supabase-url') || '';
  const supabaseKey = request.headers.get('x-supabase-key') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    return json({ 
      error: 'Missing Supabase credentials',
      isAuthenticated: false,
      profile: null,
      usageLogs: [],
      statistics: {
        totalUsed: 0,
        usageByType: {},
        percentUsed: 0,
      }
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
        usageLogs: [],
        statistics: {
          totalUsed: 0,
          usageByType: {},
          percentUsed: 0,
        }
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
        usageLogs: [],
        statistics: {
          totalUsed: 0,
          usageByType: {},
          percentUsed: 0,
        }
      });
    }
    
    // Get usage logs
    const { data: usageLogs, error: usageError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (usageError) {
      return json({ 
        error: usageError.message,
        isAuthenticated: true,
        profile,
        usageLogs: [],
        statistics: {
          totalUsed: 0,
          usageByType: {},
          percentUsed: 0,
        }
      });
    }
    
    // Calculate usage statistics
    const totalUsed = usageLogs?.reduce((sum, log) => sum + log.credits_used, 0) || 0;
    const usageByType = usageLogs?.reduce((acc, log) => {
      acc[log.action_type] = (acc[log.action_type] || 0) + log.credits_used;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const percentUsed = profile.usage_limit > 0 
      ? ((profile.usage_limit - profile.usage_credits) / profile.usage_limit) * 100 
      : 0;
    
    return json({ 
      isAuthenticated: true,
      profile,
      usageLogs: usageLogs || [],
      statistics: {
        totalUsed,
        usageByType,
        percentUsed,
      },
      error: null
    });
  } catch (error) {
    return json({ 
      error: error instanceof Error ? error.message : 'An error occurred',
      isAuthenticated: false,
      profile: null,
      usageLogs: [],
      statistics: {
        totalUsed: 0,
        usageByType: {},
        percentUsed: 0,
      }
    });
  }
}

export default function UsagePage() {
  const { isAuthenticated, profile, usageLogs, statistics, error } = useLoaderData<typeof loader>();
  
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Usage Statistics</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Usage Statistics</h1>
        <p>Please log in to view your usage statistics.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Usage Statistics</h1>
      
      {profile && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h2 className="text-xl font-semibold">{profile.full_name || profile.email}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {profile.subscription_tier ? `${profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)} Plan` : 'No Plan'}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 dark:text-gray-400">Credits Remaining:</span>
                  <span className="font-bold">{profile.usage_credits} / {profile.usage_limit}</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(profile.usage_credits / profile.usage_limit) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <UsageStats usageLogs={usageLogs} statistics={statistics} />
    </div>
  );
}