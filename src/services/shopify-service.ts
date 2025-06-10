
'use server';

import { createAdminApiClient, AdminQueries } from '@shopify/admin-api-client';

interface ShopInfo {
  name: string;
  email: string;
}

const shopifyClient = createAdminApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  apiVersion: '2024-07', // Use a recent, valid API version
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
});

export async function getShopInfo(): Promise<ShopInfo | null> {
  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.error('Shopify environment variables are not set.');
    throw new Error('Shopify environment variables are not set.');
  }

  const query = `
    query {
      shop {
        name
        email
      }
    }
  `;

  try {
    const response = await shopifyClient.request<AdminQueries['shop']>(query);
    if (response.data?.shop) {
      return response.data.shop as ShopInfo;
    }
    if (response.errors) {
      console.error('Shopify API errors:', JSON.stringify(response.errors, null, 2));
      throw new Error(`Shopify API error: ${response.errors.message || JSON.stringify(response.errors)}`);
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch shop info:', error);
    throw error; // Re-throw the error to be caught by the caller
  }
}
