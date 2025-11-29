import Stripe from 'stripe';

// Re-export commonly used Stripe types for convenience
export type { Stripe };

// Webhook event types
export type StripeWebhookEvent = Stripe.Event;

// Customer types
export type StripeCustomer = Stripe.Customer;
export type StripeCustomerCreateParams = Stripe.CustomerCreateParams;

// Checkout session types
export type StripeCheckoutSession = Stripe.Checkout.Session;

// Subscription types
export type StripeSubscription = Stripe.Subscription;

// Product types
export type StripeProduct = Stripe.Product;
export type StripePrice = Stripe.Price;

// Payment Intent types
export type StripePaymentIntent = Stripe.PaymentIntent;

// Webhook signature verification result
export interface WebhookVerificationResult {
    event: StripeWebhookEvent | null;
    error?: string;
}

// Configuration for Stripe service
export interface StripeServiceConfig {
    secretKey: string;
    apiVersion?: Stripe.LatestApiVersion;
}

// Wrapper for standard pagination parameters
export interface PaginationParams {
    limit?: number;
    starting_after?: string;
    ending_before?: string;
}