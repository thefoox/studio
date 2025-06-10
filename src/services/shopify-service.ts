
'use server';

// Note: Removed explicit dotenv.config() and path.resolve.
// Next.js automatically loads .env files. Ensure your .env is in the project root.

import { createAdminApiClient } from '@shopify/admin-api-client';

interface ShopInfo {
  name: string;
  email: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  status: string;
  totalInventory: number | null;
  vendor: string | null;
  onlineStoreUrl: string | null;
  imageUrl?: string | null;
  descriptionHtml?: string;
  priceRange?: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage?: {
    url: string;
  } | null;
  images?: {
    edges: Array<{ node: { url: string } }>;
  } | null;
}

type ShopifyApiClient = ReturnType<typeof createAdminApiClient>;
let shopifyClientInstance: ShopifyApiClient | null = null;

function getShopifyClient(): ShopifyApiClient {
  if (shopifyClientInstance) {
    return shopifyClientInstance;
  }

  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!shopDomain) {
    const errorMessage = `Shopify client initialization failed: SHOPIFY_SHOP_DOMAIN environment variable is not set or is undefined. 
    Current value found for SHOPIFY_SHOP_DOMAIN: '${shopDomain}'. 
    Please check your .env file in the project root and ensure it contains a valid SHOPIFY_SHOP_DOMAIN entry (e.g., SHOPIFY_SHOP_DOMAIN=your-shop-name.myshopify.com) and that you've restarted your development server.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!accessToken) {
    const errorMessage = `Shopify client initialization failed: SHOPIFY_ADMIN_ACCESS_TOKEN environment variable is not set or is undefined. 
    Current value found for SHOPIFY_ADMIN_ACCESS_TOKEN: '********' (token value hidden for security). 
    Please check your .env file in the project root and ensure it contains a valid SHOPIFY_ADMIN_ACCESS_TOKEN entry (e.g., SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_api_access_token) and that you've restarted your development server.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    shopifyClientInstance = createAdminApiClient({
      storeDomain: shopDomain,
      apiVersion: '2024-07',
      accessToken: accessToken,
    });
  } catch (error: any) {
      const initErrorMessage = `Shopify client initialization failed during createAdminApiClient (for domain: '${shopDomain}'). Error: ${error.message || 'Unknown error during client creation.'}`;
      console.error(initErrorMessage);
      throw new Error(initErrorMessage);
  }
  return shopifyClientInstance;
}

export async function getShopInfo(): Promise<ShopInfo | null> {
  try {
    const client = getShopifyClient();
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
    let errorMessage = 'Failed to fetch shop info from Shopify.';
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
        if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
            errorMessage += ` (This could be due to an incorrect SHOPIFY_SHOP_DOMAIN: '${process.env.SHOPIFY_SHOP_DOMAIN}' or network issues.)`;
        } else if (error.message.toLowerCase().includes('unauthorized') || error.message.toLowerCase().includes('forbidden') || (error.message.includes('401') || error.message.includes('403'))) {
            errorMessage += ` (This could be due to an invalid SHOPIFY_ADMIN_ACCESS_TOKEN or insufficient permissions.)`;
        }
    } else {
      errorMessage += ` An unknown error occurred.`;
    }
    console.error("Error in getShopInfo:", errorMessage);
    throw new Error(errorMessage);
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
    console.error(`Failed to fetch products from Shopify:`, error);
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
    const response = await client.request<{ product: ShopifyProduct }>(query, { variables: { id: formattedProductId } });
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
    console.error(`Failed to fetch product ${formattedProductId} from Shopify:`, error);
    throw error;
  }
}
    
