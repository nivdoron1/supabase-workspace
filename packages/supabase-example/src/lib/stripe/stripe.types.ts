// Re-export types from the core package or define custom ones here
export type { Stripe } from 'stripe';

export interface StripeServiceConfig {
  secretKey: string;
}
