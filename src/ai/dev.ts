
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-next-steps.ts';
import '@/ai/flows/generate-product-description.ts';
import '@/ai/flows/analyze-product-image-flow.ts';
import '@/ai/tools/shopify-tools.ts'; // Register Shopify tools
import '@/ai/flows/shopify-agent-flow.ts'; // Register Shopify agent flow
