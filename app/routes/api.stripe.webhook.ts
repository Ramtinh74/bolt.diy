import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createStripeClient } from '~/lib/stripe/client';
import { createSupabaseClient } from '~/lib/supabase/client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.stripe.webhook');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Stripe signature missing', { status: 400 });
  }

  try {
    const body = await request.text();
    const { stripeWebhookSecret, stripeKey, supabaseUrl, supabaseKey } = await getSecrets(request);

    if (!stripeWebhookSecret || !stripeKey || !supabaseUrl || !supabaseKey) {
      return new Response('Missing required secrets', { status: 400 });
    }

    const stripe = createStripeClient(stripeKey);
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return new Response(`Webhook signature verification failed`, { status: 400 });
    }

    logger.debug(`Received Stripe webhook: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          logger.error('No userId found in subscription metadata');
          return new Response('No userId found in subscription metadata', { status: 400 });
        }

        // Update subscription in Supabase
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              stripe_subscription_id: subscription.id,
              user_id: userId,
              status: subscription.status,
              price_id: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity,
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
              cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
              ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
              trial_start: subscription.trial_start
                ? new Date(subscription.trial_start * 1000).toISOString()
                : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            },
            { onConflict: 'stripe_subscription_id' },
          );

        if (subscriptionError) {
          logger.error('Error updating subscription:', subscriptionError);
          return new Response('Error updating subscription', { status: 500 });
        }

        // Update user profile with subscription status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: subscription.status,
          })
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile:', profileError);
          return new Response('Error updating profile', { status: 500 });
        }

        // If subscription is active and it's a new subscription or reactivation, reset usage credits
        if (
          subscription.status === 'active' &&
          (event.type === 'customer.subscription.created' ||
            (event.type === 'customer.subscription.updated' &&
              event.data.previous_attributes?.status &&
              event.data.previous_attributes.status !== 'active'))
        ) {
          // Get the price to determine the tier and usage limit
          const { data: price } = await supabase
            .from('prices')
            .select('products(name)')
            .eq('stripe_price_id', subscription.items.data[0].price.id)
            .single();

          let tier = 'basic';
          let usageLimit = 500; // basic tier default

          if (price?.products?.name) {
            const productName = price.products.name.toLowerCase();
            if (productName.includes('premium')) {
              tier = 'premium';
              usageLimit = 2000;
            } else if (productName.includes('enterprise')) {
              tier = 'enterprise';
              usageLimit = 10000;
            }
          }

          // Update profile with new tier and reset credits
          const { error: resetError } = await supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              usage_credits: usageLimit,
              usage_limit: usageLimit,
            })
            .eq('id', userId);

          if (resetError) {
            logger.error('Error resetting usage credits:', resetError);
            return new Response('Error resetting usage credits', { status: 500 });
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          logger.error('No userId found in subscription metadata');
          return new Response('No userId found in subscription metadata', { status: 400 });
        }

        // Update subscription in Supabase
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            ended_at: new Date(subscription.ended_at * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subscriptionError) {
          logger.error('Error updating subscription:', subscriptionError);
          return new Response('Error updating subscription', { status: 500 });
        }

        // Update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            subscription_tier: 'free',
            usage_limit: 100, // Reset to free tier limit
          })
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile:', profileError);
          return new Response('Error updating profile', { status: 500 });
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        if (!subscriptionId || !customerId) {
          logger.error('Missing subscription or customer ID in invoice');
          return new Response('Missing subscription or customer ID in invoice', { status: 400 });
        }

        // Get the subscription to find the user ID
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subscriptionError) {
          logger.error('Error fetching subscription:', subscriptionError);
          return new Response('Error fetching subscription', { status: 500 });
        }

        const userId = subscriptionData.user_id;

        // Get the subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

        // Get the price to determine the tier and usage limit
        const { data: price } = await supabase
          .from('prices')
          .select('products(name)')
          .eq('stripe_price_id', subscription.items.data[0].price.id)
          .single();

        let tier = 'basic';
        let usageLimit = 500; // basic tier default

        if (price?.products?.name) {
          const productName = price.products.name.toLowerCase();
          if (productName.includes('premium')) {
            tier = 'premium';
            usageLimit = 2000;
          } else if (productName.includes('enterprise')) {
            tier = 'enterprise';
            usageLimit = 10000;
          }
        }

        // Reset usage credits for the new billing period
        const { error: resetError } = await supabase
          .from('profiles')
          .update({
            usage_credits: usageLimit,
            usage_limit: usageLimit,
          })
          .eq('id', userId);

        if (resetError) {
          logger.error('Error resetting usage credits:', resetError);
          return new Response('Error resetting usage credits', { status: 500 });
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) {
          logger.error('Missing subscription ID in invoice');
          return new Response('Missing subscription ID in invoice', { status: 400 });
        }

        // Get the subscription to find the user ID
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subscriptionError) {
          logger.error('Error fetching subscription:', subscriptionError);
          return new Response('Error fetching subscription', { status: 500 });
        }

        const userId = subscriptionData.user_id;

        // Update user profile to reflect past_due status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile:', profileError);
          return new Response('Error updating profile', { status: 500 });
        }

        break;
      }

      default:
        // Unexpected event type
        logger.debug(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Webhook error:', error);
    return new Response(`Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
    });
  }
}

async function getSecrets(request: Request) {
  // In a real application, you would get these from environment variables or request headers
  try {
    const data = await request.clone().formData();
    return {
      stripeWebhookSecret: data.get('stripeWebhookSecret')?.toString() || '',
      stripeKey: data.get('stripeKey')?.toString() || '',
      supabaseUrl: data.get('supabaseUrl')?.toString() || '',
      supabaseKey: data.get('supabaseKey')?.toString() || '',
    };
  } catch {
    // If it's not form data, try JSON
    try {
      const json = await request.clone().json();
      return {
        stripeWebhookSecret: json.stripeWebhookSecret || '',
        stripeKey: json.stripeKey || '',
        supabaseUrl: json.supabaseUrl || '',
        supabaseKey: json.supabaseKey || '',
      };
    } catch {
      // If it's not JSON either, check headers
      return {
        stripeWebhookSecret: request.headers.get('x-stripe-webhook-secret') || '',
        stripeKey: request.headers.get('x-stripe-key') || '',
        supabaseUrl: request.headers.get('x-supabase-url') || '',
        supabaseKey: request.headers.get('x-supabase-key') || '',
      };
    }
  }
}