import Stripe from 'stripe';

export const createStripeClient = (apiKey: string) => {
  return new Stripe(apiKey, {
    apiVersion: '2023-10-16', // Use the latest API version
    typescript: true,
  });
};

interface CheckoutSessionParams {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export const createCheckoutSession = async (
  stripe: Stripe,
  { priceId, customerId, successUrl, cancelUrl, metadata = {} }: CheckoutSessionParams
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      metadata,
    });
    
    return { session, error: null };
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Unknown error creating checkout session'),
    };
  }
};

interface BillingPortalParams {
  customerId: string;
  returnUrl: string;
}

export const createBillingPortalSession = async (
  stripe: Stripe,
  { customerId, returnUrl }: BillingPortalParams
) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    return { session, error: null };
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Unknown error creating billing portal session'),
    };
  }
};

interface RecordUsageParams {
  subscriptionItemId: string;
  quantity: number;
  action: 'increment' | 'set';
}

export const recordUsage = async (
  stripe: Stripe,
  { subscriptionItemId, quantity, action = 'increment' }: RecordUsageParams
) => {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        action,
        timestamp: 'now',
      }
    );
    
    return { usageRecord, error: null };
  } catch (error) {
    return {
      usageRecord: null,
      error: error instanceof Error ? error : new Error('Unknown error recording usage'),
    };
  }
};