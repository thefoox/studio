
/**
 * @fileOverview Shopify Admin API tools for Genkit.
 *
 * This file defines Genkit tools that interact with the Shopify Admin API
 * to fetch store data like products and orders.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { listShopifyProducts, getShopifyProductById, ShopifyProduct } from '@/services/shopify-service';

// Schemas for tool outputs, should match parts of ShopifyProduct from shopify-service
const BasicProductInfoSchema = z.object({
  id: z.string().describe('The Shopify GID of the product.'),
  name: z.string().describe('The title or name of the product.'),
  status: z.string().describe('The current status of the product (e.g., ACTIVE, DRAFT, ARCHIVED).'),
  inventory: z.number().nullable().describe('The total inventory quantity for the product across all locations.'),
  vendor: z.string().nullable().describe('The vendor of the product.'),
  onlineStoreUrl: z.string().nullable().describe('The URL of the product on the online store.'),
  imageUrl: z.string().nullable().describe('URL of the product\'s featured image.'),
});

const DetailedProductInfoSchema = BasicProductInfoSchema.extend({
  descriptionHtml: z.string().optional().describe('The product description in HTML format.'),
  priceRange: z.object({
    minVariantPrice: z.object({ amount: z.string(), currencyCode: z.string() }),
    maxVariantPrice: z.object({ amount: z.string(), currencyCode: z.string() }),
  }).optional().describe('The range of prices for the product variants.'),
});

export const listShopifyProductsTool = ai.defineTool(
  {
    name: 'listShopifyProducts',
    description: 'Fetches a list of products from the Shopify store. Allows specifying how many products to retrieve (defaults to 5, max 20).',
    inputSchema: z.object({
      count: z.number().optional().default(5).describe('Number of products to list (e.g., 5, 10). Maximum 20.'),
    }),
    outputSchema: z.array(BasicProductInfoSchema),
  },
  async (input) => {
    try {
      const safeCount = Math.min(Math.max(1, input.count || 5), 20); // Ensure count is between 1 and 20
      const products = await listShopifyProducts(safeCount);
      return products.map(p => ({
        id: p.id,
        name: p.title,
        status: p.status,
        inventory: p.totalInventory,
        vendor: p.vendor,
        onlineStoreUrl: p.onlineStoreUrl,
        imageUrl: p.imageUrl || null,
      }));
    } catch (error: any) {
      console.error("Error in listShopifyProductsTool:", error.message);
      // It's often better to let the LLM inform the user of an error rather than crashing.
      // So, we return an empty array or a specific error structure if preferred.
      // For now, re-throwing so the flow can catch it.
      throw new Error(`Failed to list Shopify products: ${error.message}`);
    }
  }
);

export const getShopifyProductByIdTool = ai.defineTool(
  {
    name: 'getShopifyProductById',
    description: 'Fetches detailed information about a specific product from the Shopify store using its ID (numeric part or full GID). Example ID: "1234567890" or "gid://shopify/Product/1234567890".',
    inputSchema: z.object({
      productId: z.string().describe('The ID of the product to fetch. This can be the numeric ID or the full GID.'),
    }),
    outputSchema: DetailedProductInfoSchema.nullable(),
  },
  async (input) => {
    try {
      const product = await getShopifyProductById(input.productId);
      if (!product) return null;
      return {
        id: product.id,
        name: product.title,
        descriptionHtml: product.descriptionHtml,
        status: product.status,
        inventory: product.totalInventory,
        vendor: product.vendor,
        onlineStoreUrl: product.onlineStoreUrl,
        priceRange: product.priceRange ? {
            minVariantPrice: product.priceRange.minVariantPrice,
            maxVariantPrice: product.priceRange.maxVariantPrice,
        } : undefined,
        imageUrl: product.imageUrl || null,
      };
    } catch (error: any) {
      console.error(`Error in getShopifyProductByIdTool for ID ${input.productId}:`, error.message);
      throw new Error(`Failed to get Shopify product details for ID ${input.productId}: ${error.message}`);
    }
  }
);
