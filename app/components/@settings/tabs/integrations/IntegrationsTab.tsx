import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';
import { createSupabaseClient } from '~/lib/supabase/client';
import UsageStats from './UsageStats';
import SubscriptionManager from './SubscriptionManager';

export default function IntegrationsTab() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedSupabaseUrl = localStorage.getItem('supabaseUrl');
    const savedSupabaseKey = localStorage.getItem('supabaseKey');
    const savedStripeKey = localStorage.getItem('stripeKey');

    if (savedSupabaseUrl) setSupabaseUrl(savedSupabaseUrl);
    if (savedSupabaseKey) setSupabaseKey(savedSupabaseKey);
    if (savedStripeKey) setStripeKey(savedStripeKey);

    // Check connection status
    if (savedSupabaseUrl && savedSupabaseKey) {
      testSupabaseConnection(savedSupabaseUrl, savedSupabaseKey);
    }
    
    if (savedStripeKey) {
      testStripeConnection(savedStripeKey);
    }
  }, []);

  const saveSupabaseCredentials = () => {
    try {
      localStorage.setItem('supabaseUrl', supabaseUrl);
      localStorage.setItem('supabaseKey', supabaseKey);
      toast.success('Supabase credentials saved');
      testSupabaseConnection(supabaseUrl, supabaseKey);
    } catch (error) {
      console.error('Error saving Supabase credentials:', error);
      toast.error('Failed to save Supabase credentials');
    }
  };

  const saveStripeCredentials = () => {
    try {
      localStorage.setItem('stripeKey', stripeKey);
      toast.success('Stripe API key saved');
      testStripeConnection(stripeKey);
    } catch (error) {
      console.error('Error saving Stripe API key:', error);
      toast.error('Failed to save Stripe API key');
    }
  };

  const testSupabaseConnection = async (url: string, key: string) => {
    if (!url || !key) {
      toast.error('Supabase URL and key are required');
      return;
    }

    setTestingSupabase(true);
    try {
      const supabase = createSupabaseClient(url, key);
      const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      setSupabaseConnected(true);
      toast.success('Successfully connected to Supabase');
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      setSupabaseConnected(false);
      toast.error('Failed to connect to Supabase');
    } finally {
      setTestingSupabase(false);
    }
  };

  const testStripeConnection = async (key: string) => {
    if (!key) {
      toast.error('Stripe API key is required');
      return;
    }

    setTestingStripe(true);
    try {
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'testConnection',
          stripeKey: key,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Stripe');
      }
      
      setStripeConnected(true);
      toast.success('Successfully connected to Stripe');
    } catch (error) {
      console.error('Stripe connection test failed:', error);
      setStripeConnected(false);
      toast.error('Failed to connect to Stripe');
    } finally {
      setTestingStripe(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Supabase Integration */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="i-ph:database-fill w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Supabase Integration</span>
          </div>
          {supabaseConnected && (
            <div className="flex items-center gap-1 text-green-500 text-xs">
              <div className="i-ph:check-circle-fill w-4 h-4" />
              <span>Connected</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-1">Supabase URL</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            />
          </div>
          
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-1">Supabase Anon Key</label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="your-anon-key"
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={saveSupabaseCredentials}
              className="flex-1"
              disabled={!supabaseUrl || !supabaseKey || testingSupabase}
            >
              Save Credentials
            </Button>
            <Button
              variant="outline"
              onClick={() => testSupabaseConnection(supabaseUrl, supabaseKey)}
              disabled={!supabaseUrl || !supabaseKey || testingSupabase}
              className="flex items-center gap-1"
            >
              {testingSupabase ? (
                <>
                  <div className="animate-spin i-ph:spinner w-4 h-4" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <div className="i-ph:connection w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stripe Integration */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="i-ph:credit-card-fill w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">Stripe Integration</span>
          </div>
          {stripeConnected && (
            <div className="flex items-center gap-1 text-green-500 text-xs">
              <div className="i-ph:check-circle-fill w-4 h-4" />
              <span>Connected</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-1">Stripe Secret Key</label>
            <input
              type="password"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              placeholder="sk_test_..."
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={saveStripeCredentials}
              className="flex-1"
              disabled={!stripeKey || testingStripe}
            >
              Save API Key
            </Button>
            <Button
              variant="outline"
              onClick={() => testStripeConnection(stripeKey)}
              disabled={!stripeKey || testingStripe}
              className="flex items-center gap-1"
            >
              {testingStripe ? (
                <>
                  <div className="animate-spin i-ph:spinner w-4 h-4" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <div className="i-ph:connection w-4 h-4" />
                  <span>Test Connection</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Usage Stats */}
      {supabaseConnected && stripeConnected && (
        <UsageStats />
      )}

      {/* Subscription Manager */}
      {supabaseConnected && stripeConnected && (
        <SubscriptionManager />
      )}

      {/* Documentation */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:info-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Integration Guide</span>
        </div>

        <div className="space-y-3 text-sm text-bolt-elements-textSecondary">
          <p>
            To set up Supabase and Stripe integrations, you'll need to:
          </p>
          
          <ol className="list-decimal pl-5 space-y-2">
            <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">supabase.com</a></li>
            <li>Set up the required database tables (profiles, usage_logs)</li>
            <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">stripe.com</a></li>
            <li>Configure Stripe products and pricing plans</li>
            <li>Enter your credentials in the fields above</li>
          </ol>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg mt-3">
            <p className="text-purple-700 dark:text-purple-300 font-medium">Need help?</p>
            <p className="mt-1">
              Check out our <a href="#" className="text-purple-500 hover:underline">detailed documentation</a> for step-by-step instructions.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}