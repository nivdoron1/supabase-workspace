import { createStripeService } from '@supabase-workspace/stripe-core';
import { Stripe } from 'stripe';

/**
 * A pre-configured service object for interacting
 * with the 'stripe' service.
 *
 * This object contains all generic CRUD methods.
 */
export const stripeService = {
  ...createStripeService({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  }),

  // --- Add custom methods below ---
  //
  // Example custom method:
  // async getSubscriptionStatus(subscriptionId: string) {
  //   const subscription = await this.client.subscriptions.retrieve(subscriptionId);
  //   return subscription.status;
  // }
  //
  // --- End custom methods ---
};
