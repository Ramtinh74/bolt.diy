import React, { useState } from 'react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string;
  isLoading?: boolean;
  onToggleMode: () => void;
}

export function AuthForm({ mode, onSubmit, error, isLoading, onToggleMode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!email) {
      setFormError('Email is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    if (mode === 'signup' && password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await onSubmit(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>
        
        {(error || formError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error || formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="your@email.com"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 font-medium"
            disabled={isLoading}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}