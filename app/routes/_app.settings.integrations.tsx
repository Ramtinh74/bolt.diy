import React, { useState, useEffect } from 'react';

export default function IntegrationsTab() {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [stripeKey, setStripeKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  useEffect(() => {
    // Load saved values from localStorage
    const savedSupabaseUrl = localStorage.getItem('supabaseUrl');
    const savedSupabaseKey = localStorage.getItem('supabaseKey');
    const savedStripeKey = localStorage.getItem('stripeKey');
    const savedStripeWebhookSecret = localStorage.getItem('stripeWebhookSecret');
    
    if (savedSupabaseUrl) setSupabaseUrl(savedSupabaseUrl);
    if (savedSupabaseKey) setSupabaseKey(savedSupabaseKey);
    if (savedStripeKey) setStripeKey(savedStripeKey);
    if (savedStripeWebhookSecret) setStripeWebhookSecret(savedStripeWebhookSecret);
  }, []);
  
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Save to localStorage
      localStorage.setItem('supabaseUrl', supabaseUrl);
      localStorage.setItem('supabaseKey', supabaseKey);
      localStorage.setItem('stripeKey', stripeKey);
      localStorage.setItem('stripeWebhookSecret', stripeWebhookSecret);
      
      // Validate Supabase connection if URL and key are provided
      if (supabaseUrl && supabaseKey) {
        try {
          const response = await fetch('/api/supabase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: supabaseKey,
            }),
          });
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
        } catch (error) {
          throw new Error(`Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setSaveMessage({
        type: 'success',
        text: 'Settings saved successfully!',
      });
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while saving settings',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-4">Integration Settings</h2>
      
      {saveMessage && (
        <div className={`p-3 mb-4 rounded ${saveMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {saveMessage.text}
        </div>
      )}
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Supabase Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supabase URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://your-project.supabase.co"
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Supabase project URL
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supabase API Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your-supabase-api-key"
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Supabase service role API key (not the anon key)
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Stripe Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stripe Secret Key
              </label>
              <input
                type="password"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="sk_test_..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Stripe secret key (starts with sk_test_ or sk_live_)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stripe Webhook Secret
              </label>
              <input
                type="password"
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="whsec_..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Stripe webhook signing secret (starts with whsec_)
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Setup Instructions</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Supabase Setup:</h4>
            <ol className="list-decimal list-inside ml-4 space-y-2 text-sm">
              <li>Create a new Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a></li>
              <li>Go to Project Settings &gt; API and copy the URL and service_role key</li>
              <li>Run the SQL schema in the SQL editor to create the required tables</li>
              <li>Enable Row Level Security (RLS) for all tables</li>
              <li>Configure authentication providers as needed</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium">Stripe Setup:</h4>
            <ol className="list-decimal list-inside ml-4 space-y-2 text-sm">
              <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">stripe.com</a></li>
              <li>Go to Developers &gt; API keys and copy your secret key</li>
              <li>Create products and pricing plans in the Stripe dashboard</li>
              <li>Set up a webhook endpoint pointing to your application's /api/stripe/webhook URL</li>
              <li>Copy the webhook signing secret from the webhook settings</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}