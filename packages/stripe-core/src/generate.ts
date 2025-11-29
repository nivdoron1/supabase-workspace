#!/usr/bin/env node
/* eslint-disable */
// @ts-nocheck
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get target directory from command line argument or environment variable
const targetArg = process.argv[2];
const TARGET_SUPABASE_PROJECT = targetArg
  ? path.resolve(targetArg)
  : process.env.STRIPE_TARGET_DIR
    ? path.resolve(process.env.STRIPE_TARGET_DIR)
    : path.resolve(__dirname, '../../../supabase-example');

console.log(`Target directory: ${TARGET_SUPABASE_PROJECT}`);

const FUNCTIONS = [
  { name: 'stripe-webhook-handler', description: 'Handles all Stripe webhook events' },
  { name: 'create-checkout-session', description: 'Creates Stripe checkout sessions' },
  { name: 'sync-stripe-customer', description: 'Syncs Stripe customer with Supabase Auth user' },
  { name: 'get-customer-portal', description: 'Creates Stripe customer portal session' },
];

async function generate() {
  console.log('🚀 Starting Comprehensive Stripe + Supabase Generator...\n');
  try {
    ensureTargetDirectory();
    initializeSupabaseProject();

    // 1. Generate Edge Functions
    for (const func of FUNCTIONS) {
      createFunction(func.name);
      generateFunctionContent(func.name);
    }
    createSharedUtils();

    // 2. Generate Client Service
    createClientStripeService();

    printCompletionMessage();
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    process.exit(1);
  }
}

function ensureTargetDirectory() {
  console.log(`📂 Checking target directory: ${TARGET_SUPABASE_PROJECT}`);
  if (!fs.existsSync(TARGET_SUPABASE_PROJECT)) {
    fs.mkdirSync(TARGET_SUPABASE_PROJECT, { recursive: true });
  }
  console.log('   ✓ Target directory ready\n');
}

function initializeSupabaseProject() {
  console.log('🔧 Initializing Supabase project...');
  const supabaseConfigPath = path.join(TARGET_SUPABASE_PROJECT, 'supabase');
  if (fs.existsSync(supabaseConfigPath)) {
    console.log('   ⏩ Supabase already initialized\n');
    return;
  }
  try {
    execSync('npx supabase init', { cwd: TARGET_SUPABASE_PROJECT, stdio: 'inherit' });
    console.log('   ✓ Supabase project initialized\n');
  } catch (error) {
    throw new Error(`Failed to initialize: ${error.message}`);
  }
}

function createFunction(functionName) {
  console.log(`🔨 Creating function: ${functionName}...`);
  const functionPath = path.join(TARGET_SUPABASE_PROJECT, 'supabase', 'functions', functionName);
  if (fs.existsSync(functionPath)) {
    console.log('   ⏩ Function exists, will overwrite...\n');
    return;
  }
  try {
    execSync(`npx supabase functions new ${functionName}`, { cwd: TARGET_SUPABASE_PROJECT, stdio: 'inherit' });
    console.log('   ✓ Function created\n');
  } catch (error) {
    throw new Error(`Failed to create ${functionName}: ${error.message}`);
  }
}

function generateFunctionContent(functionName) {
  console.log(`✍️  Generating ${functionName} content...`);
  const functionFilePath = path.join(TARGET_SUPABASE_PROJECT, 'supabase', 'functions', functionName, 'index.ts');
  let content = '';
  switch (functionName) {
    case 'stripe-webhook-handler':
      content = getWebhookHandlerTemplate();
      break;
    case 'create-checkout-session':
      content = getCreateCheckoutTemplate();
      break;
    case 'sync-stripe-customer':
      content = getSyncCustomerTemplate();
      break;
    case 'get-customer-portal':
      content = getCustomerPortalTemplate();
      break;
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
  fs.writeFileSync(functionFilePath, content, 'utf8');
  console.log('   ✓ Content written\n');
}

function createSharedUtils() {
  console.log('📦 Creating shared utilities...');
  const utilsPath = path.join(TARGET_SUPABASE_PROJECT, 'supabase', 'functions', '_shared');
  if (!fs.existsSync(utilsPath)) {
    fs.mkdirSync(utilsPath, { recursive: true });
  }
  const corsContent = getCorsUtilTemplate();
  fs.writeFileSync(path.join(utilsPath, 'cors.ts'), corsContent, 'utf8');
  console.log('   ✓ Shared utilities created\n');
}

function createClientStripeService() {
  console.log('🛍️  Creating Client/Server Stripe Service...');
  const servicePath = path.join(TARGET_SUPABASE_PROJECT, 'src', 'lib', 'stripe');

  if (!fs.existsSync(servicePath)) {
    fs.mkdirSync(servicePath, { recursive: true });
  }

  // 1. stripe.service.ts
  const serviceContent = getStripeServiceTemplate();
  fs.writeFileSync(path.join(servicePath, 'stripe.service.ts'), serviceContent, 'utf8');

  // 2. stripe.types.ts
  const typesContent = getStripeTypesTemplate();
  fs.writeFileSync(path.join(servicePath, 'stripe.types.ts'), typesContent, 'utf8');

  // 3. index.ts
  const indexContent = getStripeIndexTemplate();
  fs.writeFileSync(path.join(servicePath, 'index.ts'), indexContent, 'utf8');

  console.log('   ✓ src/lib/stripe service created\n');
}

function printCompletionMessage() {
  console.log('\n✅ Generation complete!\n');
  console.log('📁 Generated functions:');
  FUNCTIONS.forEach(f => console.log(`   - ${f.name}: ${f.description}`));
  console.log('📁 Generated Service:');
  console.log('   - src/lib/stripe/stripe.service.ts');
  console.log('\n📝 Required Environment Variables:');
  console.log('   - STRIPE_SECRET_KEY');
  console.log('   - STRIPE_WEBHOOK_SECRET');
  console.log('   - SUPABASE_URL (auto-provided)');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY (auto-provided)');
  console.log('   - FRONTEND_URL');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Deploy: supabase functions deploy');
  console.log('   2. Set secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... FRONTEND_URL=https://...');
  console.log('   3. Configure webhook: https://your-project.supabase.co/functions/v1/stripe-webhook-handler\n');
}

// --- Templates ---

function getCorsUtilTemplate() {
  return `// CORS utility
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
`;
}

function getStripeServiceTemplate() {
  return `import { createStripeService } from '@supabase-workspace/stripe-core';
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
`;
}

function getStripeTypesTemplate() {
  return `// Re-export types from the core package or define custom ones here
export type { Stripe } from 'stripe';

export interface StripeServiceConfig {
  secretKey: string;
}
`;
}

function getStripeIndexTemplate() {
  return `export * from './stripe.service';
export * from './stripe.types';
`;
}

function getWebhookHandlerTemplate() {
  return `// Stripe Webhook Handler
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Webhook verified:', event.type);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout completed:', session.id);
        
        // Update user metadata with Stripe customer ID
        if (session.client_reference_id && session.customer) {
          await supabase.auth.admin.updateUserById(session.client_reference_id, {
            user_metadata: {
              stripe_customer_id: session.customer,
            },
          });
          
          // Create subscription record
          await supabase.from('subscriptions').upsert({
            user_id: session.client_reference_id,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription event:', subscription.id);
        
        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price.id,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, {
          onConflict: 'stripe_subscription_id',
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription.id);
        
        await supabase.from('subscriptions').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Payment succeeded:', invoice.id);
        
        if (invoice.subscription) {
          await supabase.from('subscriptions').update({
            status: 'active',
            last_payment_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed:', invoice.id);
        
        if (invoice.subscription) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
          }).eq('stripe_subscription_id', invoice.subscription);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
`;
}

function getCreateCheckoutTemplate() {
  return `// Create Checkout Session
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'priceId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

    // Check if user already has a Stripe customer ID
    let customerId = user.user_metadata?.stripe_customer_id;
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      
      // Update user metadata
      const supabaseAdmin = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { stripe_customer_id: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: \`\${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${frontendUrl}/pricing\`,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;
}

function getSyncCustomerTemplate() {
  return `// Sync Stripe Customer
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = user.user_metadata?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update user metadata
      const supabaseAdmin = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { stripe_customer_id: customerId },
      });
    }

    // Fetch subscription status
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    return new Response(JSON.stringify({
      customerId,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;
}

function getCustomerPortalTemplate() {
  return `// Customer Portal
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = user.user_metadata?.stripe_customer_id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: \`\${frontendUrl}/account\`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;
}

generate();