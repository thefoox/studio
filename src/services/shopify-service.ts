
'use server';

import { config } from 'dotenv';
import path from 'path';

// Explicitly load .env file from the project root
config({ path: path.resolve(process.cwd(), '.env') });

import { createAdminApiClient, AdminQueries } from '@shopify/admin-api-client';

interface ShopInfo {
  name: string;
  email: string;
}

// Type for the Shopify client instance
type ShopifyApiClient = ReturnType<typeof createAdminApiClient>;
let shopifyClientInstance: ShopifyApiClient | null = null;

function getShopifyClient(): ShopifyApiClient {
  if (!shopifyClientInstance) {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!storeDomain) {
      const errorMessage = 'Shopify client initialization failed: SHOPIFY_STORE_DOMAIN environment variable is not set or is undefined. Please check your .env file.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    if (!accessToken) {
      const errorMessage = 'Shopify client initialization failed: SHOPIFY_ADMIN_ACCESS_TOKEN environment variable is not set or is undefined. Please check your .env file.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    shopifyClientInstance = createAdminApiClient({
      storeDomain: storeDomain,
      apiVersion: '2024-07', // Use a recent, valid API version
      accessToken: accessToken,
    });
  }
  return shopifyClientInstance;
}

export async function getShopInfo(): Promise<ShopInfo | null> {
  // The client will be initialized here if it hasn't been already.
  // The getShopifyClient function itself now handles the env var checks before creation.
  const client = getShopifyClient();

  const query = `
    query {
      shop {
        name
        email
      }
    }
  `;

  try {
    // The type assertion for AdminQueries['shop'] might need adjustment based on actual AdminQueries structure
    // For now, we'll cast the expected data structure.
    const response = await client.request<{ shop: ShopInfo }>(query); 

    if (response.data?.shop) {
      return response.data.shop;
    }
    if (response.errors) {
      console.error('Shopify API errors:', JSON.stringify(response.errors, null, 2));
      // Attempt to provide a more user-friendly error message from Shopify's response
      const primaryErrorMessage = response.errors.message || (Array.isArray(response.errors.graphQLErrors) && response.errors.graphQLErrors[0]?.message);
      throw new Error(`Shopify API error: ${primaryErrorMessage || JSON.stringify(response.errors)}`);
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch shop info in getShopInfo function:', error);
    let errorMessage = 'Failed to fetch shop info.';
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
        // Specific hints for common issues, if not already part of the error message from getShopifyClient
        if (!error.message.toLowerCase().includes('initialization failed')) {
            if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
                errorMessage += ` (This could be due to an incorrect SHOPIFY_STORE_DOMAIN: '${process.env.SHOPIFY_STORE_DOMAIN}' or network issues.)`;
            } else if (error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('forbidden')) {
                errorMessage += ` (This could be due to an invalid SHOPIFY_ADMIN_ACCESS_TOKEN or insufficient permissions.)`;
            }
        }
    }
    // Do not re-throw the original error if it's from client initialization,
    // as getShopifyClient() already threw a more specific one.
    // If error is NOT from getShopifyClient's initial checks, then throw the augmented message.
    if (!(error instanceof Error && error.message.includes('Shopify client initialization failed'))) {
       console.error(errorMessage); // Log the augmented one
       throw new Error(errorMessage); // Throw augmented one
    } else {
        throw error; // Re-throw the specific initialization error
    }
  }
}
