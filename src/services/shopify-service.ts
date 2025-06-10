
'use server';

import { config } from 'dotenv';
import path from 'path';

// Explicitly load .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
// Enable debug mode for dotenv in development to see if it's finding/parsing the file
const dotenvResult = config({ path: envPath, debug: process.env.NODE_ENV !== 'production' });

if (dotenvResult.error) {
  // This will log to your server console, not the browser
  console.warn(`AI-Commerce Assistant (dotenv): Error loading .env file from ${envPath}:`, dotenvResult.error.message);
} else if (Object.keys(dotenvResult.parsed || {}).length === 0) {
  console.warn(`AI-Commerce Assistant (dotenv): Loaded .env file from ${envPath}, but it was empty or only contained comments. Please ensure your Shopify credentials are set.`);
} else {
  // console.log(`AI-Commerce Assistant (dotenv): Successfully loaded variables from ${envPath}.`);
}

import { createAdminApiClient } from '@shopify/admin-api-client';

interface ShopInfo {
  name: string;
  email: string;
}

// Basic Product structure from Shopify API
export interface ShopifyProduct {
  id: string;
  title: string;
  status: string;
  totalInventory: number | null;
  vendor: string | null;
  onlineStoreUrl: string | null;
  imageUrl?: string | null; // Add imageUrl
  descriptionHtml?: string; // For getProductById
  priceRange?: { // For getProductById
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
}


// Type for the Shopify client instance
type ShopifyApiClient = ReturnType<typeof createAdminApiClient>;
let shopifyClientInstance: ShopifyApiClient | null = null;

function getShopifyClient(): ShopifyApiClient {
  if (shopifyClientInstance) {
    return shopifyClientInstance;
  }

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain) {
    const errorMessage = `Shopify client initialization failed: SHOPIFY_STORE_DOMAIN environment variable is not set or is undefined. 
    Attempted to load .env from: '${envPath}'. 
    Current value found for SHOPIFY_STORE_DOMAIN: '${storeDomain}'. 
    Please check your .env file in the project root and ensure it contains a valid SHOPIFY_STORE_DOMAIN entry (e.g., SHOPIFY_STORE_DOMAIN=your-store.myshopify.com) and that you've restarted your development server.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!accessToken) {
    const errorMessage = `Shopify client initialization failed: SHOPIFY_ADMIN_ACCESS_TOKEN environment variable is not set or is undefined. 
    Attempted to load .env from: '${envPath}'. 
    Please check your .env file in the project root and ensure it contains a valid SHOPIFY_ADMIN_ACCESS_TOKEN entry and that you've restarted your development server.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    shopifyClientInstance = createAdminApiClient({
      storeDomain: storeDomain,
      apiVersion: '2024-07', // Use a recent, valid API version
      accessToken: accessToken,
    });
  } catch (error: any) {
      const initErrorMessage = `Shopify client initialization failed during createAdminApiClient (for domain: '${storeDomain}'). Error: ${error.message || 'Unknown error during client creation.'}. 
      Attempted to load .env from '${envPath}'.`;
      console.error(initErrorMessage);
      throw new Error(initErrorMessage);
  }
  return shopifyClientInstance;
}

export async function getShopInfo(): Promise<ShopInfo | null> {
  try {
    const client = getShopifyClient(); // This will throw if env vars are missing or client can't init

    const query = `
      query {
        shop {
          name
          email
        }
      }
    `;

    const response = await client.request<{ shop: ShopInfo }>(query); 

    if (response.data?.shop) {
      return response.data.shop;
    }
    if (response.errors) {
      console.error('Shopify API errors (getShopInfo):', JSON.stringify(response.errors, null, 2));
      const primaryErrorMessage = response.errors.message || (Array.isArray(response.errors.graphQLErrors) && response.errors.graphQLErrors[0]?.message);
      throw new Error(`Shopify API error: ${primaryErrorMessage || JSON.stringify(response.errors)}`);
    }
    return null;
  } catch (error) {
    let errorMessage = 'Failed to fetch shop info.';
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
        // Add envPath context if not already included from getShopifyClient's error
        if (!error.message.includes("Attempted to load .env from")) {
            errorMessage += ` (Attempted to load .env from '${envPath}')`;
        }

        // Add more specific hints based on error type, if not an initialization error
        if (!error.message.toLowerCase().includes('initialization failed')) {
            if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
                errorMessage += ` (This could be due to an incorrect SHOPIFY_STORE_DOMAIN: '${process.env.SHOPIFY_STORE_DOMAIN}' or network issues.)`;
            } else if (error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('forbidden') || (error.message.includes('401') || error.message.includes('403'))) {
                errorMessage += ` (This could be due to an invalid SHOPIFY_ADMIN_ACCESS_TOKEN or insufficient permissions.)`;
            }
        }
    } else {
      errorMessage += ` An unknown error occurred. (Attempted to load .env from '${envPath}')`;
    }
    
    // Avoid re-throwing generic error if a specific initialization error was already thrown
    if (error instanceof Error && error.message.includes('Shopify client initialization failed')) {
        // The error from getShopifyClient is specific enough
        console.error("Re-throwing specific initialization error from getShopInfo:", error.message);
        throw error;
    } else {
       console.error("Error in getShopInfo:", errorMessage); 
       throw new Error(errorMessage); 
    }
  }
}

export async function listShopifyProducts(count: number = 5): Promise<ShopifyProduct[]> {
  const client = getShopifyClient();
  const query = `
    query listProducts($first: Int!) {
      products(first: $first, sortKey: TITLE, reverse: false) {
        edges {
          node {
            id
            title
            status
            totalInventory
            vendor
            onlineStoreUrl
            featuredImage {
              url
            }
          }
        }
      }
    }
  `;
  try {
    const response = await client.request<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(query, { variables: { first: count } });
    if (response.data?.products?.edges) {
      return response.data.products.edges.map(edge => ({
        ...edge.node,
        imageUrl: edge.node.featuredImage?.url || null 
      }));
    }
    if (response.errors) {
      console.error('Shopify API errors (listShopifyProducts):', JSON.stringify(response.errors, null, 2));
      throw new Error(`Shopify API error while listing products: ${JSON.stringify(response.errors)}`);
    }
    return [];
  } catch (error) {
    console.error(`Failed to fetch products from Shopify (attempted .env from '${envPath}'):`, error);
    throw error; 
  }
}

export async function getShopifyProductById(productId: string): Promise<ShopifyProduct | null> {
  const client = getShopifyClient();
  const formattedProductId = productId.startsWith("gid://shopify/Product/") ? productId : `gid://shopify/Product/${productId}`;

  const query = `
    query getProductById($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
        status
        totalInventory
        vendor
        onlineStoreUrl
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
            }
          }
        }
      }
    }
  `;
  try {
    const response = await client.request<{ product: ShopifyProduct & { images?: { edges: Array<{ node: { url: string } }> }} }>(query, { variables: { id: formattedProductId } });
    if (response.data?.product) {
      const productData = response.data.product;
      return {
        ...productData,
        imageUrl: productData.images?.edges?.[0]?.node?.url || null,
      };
    }
    if (response.errors) {
      console.error('Shopify API errors (getShopifyProductById):', JSON.stringify(response.errors, null, 2));
      throw new Error(`Shopify API error fetching product by ID ${formattedProductId}: ${JSON.stringify(response.errors)}`);
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch product ${formattedProductId} from Shopify (attempted .env from '${envPath}'):`, error);
    throw error; 
  }
}

