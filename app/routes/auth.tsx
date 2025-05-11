import React, { useState } from 'react';
import { AuthForm } from '~/components/auth/AuthForm';
import { useNavigate } from '@remix-run/react';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(undefined);
  };
  
  const handleSubmit = async (email: string, password: string) => {
    setError(undefined);
    setIsLoading(true);
    
    try {
      // Get Supabase credentials from localStorage (in a real app, you might get these from environment variables)
      const supabaseUrl = localStorage.getItem('supabaseUrl');
      const supabaseKey = localStorage.getItem('supabaseKey');
      const stripeKey = localStorage.getItem('stripeKey');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Please configure them in settings.');
      }
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          supabaseUrl,
          supabaseKey,
          stripeKey,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.session) {
        localStorage.setItem('session', JSON.stringify(data.session));
      }
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Bolt.DIY
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {mode === 'signin' 
              ? 'Sign in to your account to continue' 
              : 'Create a new account to get started'}
          </p>
        </div>
        
        <AuthForm
          mode={mode}
          onSubmit={handleSubmit}
          error={error}
          isLoading={isLoading}
          onToggleMode={toggleMode}
        />
      </div>
    </div>
  );
}