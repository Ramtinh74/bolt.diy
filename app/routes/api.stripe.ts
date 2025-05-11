import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createStripeClient } from '~/lib/stripe/client';
import { createSupabaseClient } from '~/lib/supabase/client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.stripe');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { action, stripeKey, supabaseUrl, supabaseKey, ...data } = await request.json();

    if (!stripeKey) {
      return json({ error: 'Missing Stripe API key' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Missing Supabase credentials' }, { status: 400 });
    }

    const stripe = createStripeClient(stripeKey);
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'createCustomer': {
        const { userId, email, name } = data;

        if (!userId || !email) {
          return json({ error: 'User ID and email are required' }, { status: 400 });
        }

        // Check if customer already exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        if (profile?.stripe_customer_id) {
          // Customer already exists, return the ID
          return json({ customerId: profile.stripe_customer_id });
        }

        // Create a new customer
        const customer = await stripe.customers.create({
          email,
          name: name || undefined,
          metadata: {
            userId,
          },
        });

        // Update the user profile with the Stripe customer ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', userId);

        if (updateError) {
          logger.error('Error updating profile with customer ID:', updateError);
          return json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return json({ customerId: customer.id });
      }

      case 'createSubscription': {
        const { customerId, priceId, userId } = data;

        if (!customerId || !priceId || !userId) {
          return json({ error: 'Customer ID, price ID, and user ID are required' }, { status: 400 });
        }

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          expand: ['latest_invoice.payment_intent'],
          metadata: {
            userId,
          },
        });

        // Store subscription in Supabase
        const { error: subscriptionError } = await supabase.from('subscriptions').insert({
          user_id: userId,
          status: subscription.status,
          price_id: priceId,
          quantity: 1,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          stripe_subscription_id: subscription.id,
        });

        if (subscriptionError) {
          logger.error('Error storing subscription:', subscriptionError);
          return json({ error: 'Failed to store subscription' }, { status: 500 });
        }

        // Update user profile with subscription status and tier
        const { data: price } = await supabase
          .from('prices')
          .select('products(name)')
          .eq('stripe_price_id', priceId)
          .single();

        let tier = 'basic';
        if (price?.products?.name) {
          const productName = price.products.name.toLowerCase();
          if (productName.includes('premium')) {
            tier = 'premium';
          } else if (productName.includes('enterprise')) {
            tier = 'enterprise';
          }
        }

        // Set usage limits based on tier
        let usageLimit = 500; // basic tier
        if (tier === 'premium') {
          usageLimit = 2000;
        } else if (tier === 'enterprise') {
          usageLimit = 10000;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_tier: tier,
            usage_limit: usageLimit,
          })
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile with subscription:', profileError);
          return json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return json({ subscription });
      }

      case 'getSubscription': {
        const { userId } = data;

        if (!userId) {
          return json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get subscription from Supabase
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*, prices(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          // PGRST116 is the error code for no rows returned
          logger.error('Error fetching subscription:', subscriptionError);
          return json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }

        if (!subscription) {
          return json({ subscription: null });
        }

        return json({ subscription });
      }

      case 'cancelSubscription': {
        const { subscriptionId, userId } = data;

        if (!subscriptionId || !userId) {
          return json({ error: 'Subscription ID and user ID are required' }, { status: 400 });
        }

        // Cancel the subscription in Stripe
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update the subscription in Supabase
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: true,
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)
          .eq('user_id', userId);

        if (subscriptionError) {
          logger.error('Error updating subscription:', subscriptionError);
          return json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        return json({ subscription });
      }

      case 'createCheckoutSession': {
        const { priceId, customerId, userId, successUrl, cancelUrl } = data;

        if (!priceId || !customerId || !userId || !successUrl || !cancelUrl) {
          return json(
            { error: 'Price ID, customer ID, user ID, success URL, and cancel URL are required' },
            { status: 400 },
          );
        }

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            userId,
          },
        });

        return json({ sessionId: session.id, url: session.url });
      }

      case 'createPortalSession': {
        const { customerId, returnUrl } = data;

        if (!customerId || !returnUrl) {
          return json({ error: 'Customer ID and return URL are required' }, { status: 400 });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });

        return json({ url: session.url });
      }

      case 'recordUsage': {
        const { userId, actionType, creditsUsed, metadata } = data;

        if (!userId || !actionType || typeof creditsUsed !== 'number') {
          return json({ error: 'User ID, action type, and credits used are required' }, { status: 400 });
        }

        // Get user profile to check credits
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('usage_credits, usage_limit, subscription_status')
          .eq('id', userId)
          .single();

        if (profileError) {
          logger.error('Error fetching profile:', profileError);
          return json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        // Check if user has enough credits
        if (profile.usage_credits < creditsUsed) {
          return json({ error: 'Insufficient credits', creditsRemaining: profile.usage_credits }, { status: 403 });
        }

        // Record usage in the logs
        const { error: usageError } = await supabase.from('usage_logs').insert({
          user_id: userId,
          action_type: actionType,
          credits_used: creditsUsed,
          metadata: metadata || null,
        });

        if (usageError) {
          logger.error('Error recording usage:', usageError);
          return json({ error: 'Failed to record usage' }, { status: 500 });
        }

        // Update user's remaining credits
        const newCredits = profile.usage_credits - creditsUsed;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ usage_credits: newCredits })
          .eq('id', userId);

        if (updateError) {
          logger.error('Error updating credits:', updateError);
          return json({ error: 'Failed to update credits' }, { status: 500 });
        }

        return json({
          success: true,
          creditsUsed,
          creditsRemaining: newCredits,
          usageLimit: profile.usage_limit,
        });
      }

      case 'getUserUsage': {
        const { userId } = data;

        if (!userId) {
          return json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get user profile with credit information
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('usage_credits, usage_limit, subscription_tier, subscription_status')
          .eq('id', userId)
          .single();

        if (profileError) {
          logger.error('Error fetching profile:', profileError);
          return json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        // Get usage history
        const { data: usageLogs, error: usageError } = await supabase
          .from('usage_logs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (usageError) {
          logger.error('Error fetching usage logs:', usageError);
          return json({ error: 'Failed to fetch usage logs' }, { status: 500 });
        }

        // Calculate usage statistics
        const totalUsed = usageLogs.reduce((sum, log) => sum + log.credits_used, 0);
        const usageByType = usageLogs.reduce((acc, log) => {
          acc[log.action_type] = (acc[log.action_type] || 0) + log.credits_used;
          return acc;
        }, {} as Record<string, number>);

        return json({
          profile,
          usageLogs,
          statistics: {
            totalUsed,
            usageByType,
            percentUsed: profile.usage_limit > 0 ? ((profile.usage_limit - profile.usage_credits) / profile.usage_limit) * 100 : 0,
          },
        });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Stripe API error:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Stripe operation failed',
      },
      { status: 500 },
    );
  }
}