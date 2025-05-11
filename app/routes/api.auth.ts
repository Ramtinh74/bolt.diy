import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createSupabaseClient } from '~/lib/supabase/client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.auth');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { action, email, password, supabaseUrl, supabaseKey } = await request.json();

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Missing Supabase credentials' }, { status: 400 });
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'signUp': {
        if (!email || !password) {
          return json({ error: 'Email and password are required' }, { status: 400 });
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          logger.error('Sign up error:', error);
          return json({ error: error.message }, { status: 400 });
        }

        // Create a profile record for the new user
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || '',
              subscription_tier: 'free',
              usage_credits: 100, // Starting credits for free tier
              usage_limit: 100,
            });

          if (profileError) {
            logger.error('Profile creation error:', profileError);
            // We don't want to fail the sign-up if profile creation fails
            // The profile can be created later
          }
        }

        return json({ user: data.user, session: data.session });
      }

      case 'signIn': {
        if (!email || !password) {
          return json({ error: 'Email and password are required' }, { status: 400 });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          logger.error('Sign in error:', error);
          return json({ error: error.message }, { status: 400 });
        }

        return json({ user: data.user, session: data.session });
      }

      case 'signOut': {
        const { error } = await supabase.auth.signOut();

        if (error) {
          logger.error('Sign out error:', error);
          return json({ error: error.message }, { status: 400 });
        }

        return json({ success: true });
      }

      case 'getUser': {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          logger.error('Get user error:', error);
          return json({ error: error.message }, { status: 400 });
        }

        // Get user profile with subscription info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          logger.error('Get profile error:', profileError);
          return json({ user: data.user, profile: null });
        }

        return json({ user: data.user, profile });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Auth error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 500 },
    );
  }
}