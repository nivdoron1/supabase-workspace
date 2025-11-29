import Stripe from 'stripe';
import {
    StripeServiceConfig,
    WebhookVerificationResult,
    PaginationParams
} from './types';

// =================================================================
// Utility Functions (Pure Helpers)
// =================================================================

/**
 * Normalizes pagination parameters for Stripe
 */
export function normalizePagination(params?: PaginationParams): Stripe.PaginationParams {
    return {
        limit: params?.limit || 10,
        starting_after: params?.starting_after,
        ending_before: params?.ending_before,
    };
}

// =================================================================
// Core Stripe Functions (Dependency-Injected)
// =================================================================

// --- Customer Operations ---

export async function createCustomer(
    stripe: Stripe,
    params: Stripe.CustomerCreateParams
): Promise<Stripe.Customer> {
    try {
        return await stripe.customers.create(params);
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
}

export async function getCustomer(
    stripe: Stripe,
    customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
}

export async function updateCustomer(
    stripe: Stripe,
    customerId: string,
    params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
    return await stripe.customers.update(customerId, params);
}

/**
 * List Customers (Paginated)
 * Returns a specific page of results.
 */
export async function listCustomers(
    stripe: Stripe,
    params?: Stripe.CustomerListParams
): Promise<Stripe.ApiList<Stripe.Customer>> {
    return await stripe.customers.list(params);
}

/**
 * List ALL Customers (Auto-Pagination)
 * WARNING: heavy operation.
 */
export async function listAllCustomers(
    stripe: Stripe,
    limit: number = 10000
): Promise<Stripe.Customer[]> {
    return await stripe.customers.list({ limit: 100 })
        .autoPagingToArray({ limit });
}

// --- Product & Price Operations ---

export async function createProduct(
    stripe: Stripe,
    params: Stripe.ProductCreateParams
): Promise<Stripe.Product> {
    return await stripe.products.create(params);
}

export async function listProducts(
    stripe: Stripe,
    params?: Stripe.ProductListParams
): Promise<Stripe.ApiList<Stripe.Product>> {
    return await stripe.products.list(params);
}

export async function listAllActiveProducts(
    stripe: Stripe
): Promise<Stripe.Product[]> {
    return await stripe.products.list({ active: true, limit: 100 })
        .autoPagingToArray({ limit: 1000 });
}

export async function createPrice(
    stripe: Stripe,
    params: Stripe.PriceCreateParams
): Promise<Stripe.Price> {
    return await stripe.prices.create(params);
}

// --- Subscription Operations ---

export async function createSubscription(
    stripe: Stripe,
    params: Stripe.SubscriptionCreateParams
): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.create(params);
}

export async function cancelSubscription(
    stripe: Stripe,
    subscriptionId: string
): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
}

export async function listCustomerSubscriptions(
    stripe: Stripe,
    customerId: string,
    params?: PaginationParams
): Promise<Stripe.ApiList<Stripe.Subscription>> {
    const paging = normalizePagination(params);
    return await stripe.subscriptions.list({
        customer: customerId,
        ...paging
    });
}

// --- Checkout & Payments ---

export async function createCheckoutSession(
    stripe: Stripe,
    params: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
    return await stripe.checkout.sessions.create(params);
}

export async function getCheckoutSession(
    stripe: Stripe,
    sessionId: string
): Promise<Stripe.Checkout.Session> {
    return await stripe.checkout.sessions.retrieve(sessionId);
}

export async function createPaymentIntent(
    stripe: Stripe,
    params: Stripe.PaymentIntentCreateParams
): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create(params);
}

// --- Invoice Operations ---

export async function listInvoices(
    stripe: Stripe,
    params?: Stripe.InvoiceListParams
): Promise<Stripe.ApiList<Stripe.Invoice>> {
    return await stripe.invoices.list(params);
}

// --- Webhooks & Utilities ---

export function verifyWebhookSignature(
    stripe: Stripe,
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
): WebhookVerificationResult {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            webhookSecret
        );
        return { event };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { event: null, error: errorMessage };
    }
}

// =================================================================
// Service Factory
// =================================================================

/**
 * Creates a Stripe service object with methods pre-bound to a specific
 * Stripe client instance.
 * * @param config Configuration object or API Key string
 */
export function createStripeService(
    config?: StripeServiceConfig | string
) {
    // 1. Initialize Client
    let secretKey: string;
    let apiVersion: Stripe.LatestApiVersion | undefined;

    if (typeof config === 'string') {
        secretKey = config;
    } else if (config) {
        secretKey = config.secretKey;
        apiVersion = config.apiVersion;
    } else {
        secretKey = process.env.STRIPE_SECRET_KEY || '';
    }

    if (!secretKey) throw new Error('Stripe secret key is required.');

    const stripe = new Stripe(secretKey, {
        apiVersion: apiVersion || '2023-10-16',
        typescript: true,
    });

    // 2. Return Bound Methods
    return {
        // Utils
        getClient: () => stripe,

        // Customer
        createCustomer: (params: Stripe.CustomerCreateParams) =>
            createCustomer(stripe, params),
        getCustomer: (id: string) =>
            getCustomer(stripe, id),
        updateCustomer: (id: string, params: Stripe.CustomerUpdateParams) =>
            updateCustomer(stripe, id, params),
        listCustomers: (params?: Stripe.CustomerListParams) =>
            listCustomers(stripe, params),
        listAllCustomers: (limit?: number) =>
            listAllCustomers(stripe, limit),

        // Product & Price
        createProduct: (params: Stripe.ProductCreateParams) =>
            createProduct(stripe, params),
        listProducts: (params?: Stripe.ProductListParams) =>
            listProducts(stripe, params),
        listAllActiveProducts: () =>
            listAllActiveProducts(stripe),
        createPrice: (params: Stripe.PriceCreateParams) =>
            createPrice(stripe, params),

        // Subscription
        createSubscription: (params: Stripe.SubscriptionCreateParams) =>
            createSubscription(stripe, params),
        cancelSubscription: (id: string) =>
            cancelSubscription(stripe, id),
        listCustomerSubscriptions: (customerId: string, params?: PaginationParams) =>
            listCustomerSubscriptions(stripe, customerId, params),

        // Checkout
        createCheckoutSession: (params: Stripe.Checkout.SessionCreateParams) =>
            createCheckoutSession(stripe, params),
        getCheckoutSession: (id: string) =>
            getCheckoutSession(stripe, id),
        createPaymentIntent: (params: Stripe.PaymentIntentCreateParams) =>
            createPaymentIntent(stripe, params),

        // Invoice
        listInvoices: (params?: Stripe.InvoiceListParams) =>
            listInvoices(stripe, params),

        // Webhook
        verifyWebhookSignature: (payload: string | Buffer, sig: string, secret: string) =>
            verifyWebhookSignature(stripe, payload, sig, secret),
    };
}