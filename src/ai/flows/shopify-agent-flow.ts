
'use server';
/**
 * @fileOverview AI agent for interacting with Shopify store data.
 *
 * - shopifyAgentFlow - A flow that uses tools to answer user queries about Shopify.
 * - ShopifyAgentInput - Input type for the flow.
 * - ShopifyAgentOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { listShopifyProductsTool, getShopifyProductByIdTool } from '@/ai/tools/shopify-tools';

const ShopifyAgentInputSchema = z.object({
  query: z.string().describe("The user's natural language query about their Shopify store (e.g., 'list my latest products', 'show details for product 12345')."),
});
export type ShopifyAgentInput = z.infer<typeof ShopifyAgentInputSchema>;

const ShopifyAgentOutputSchema = z.object({
  response: z.string().describe("The AI's natural language response to the user's query, potentially including data fetched from Shopify."),
  isError: z.boolean().optional().describe("Indicates if an error occurred during processing."),
  errorMessage: z.string().optional().describe("The error message if isError is true."),
});
export type ShopifyAgentOutput = z.infer<typeof ShopifyAgentOutputSchema>;


export async function queryShopifyAgent(input: ShopifyAgentInput): Promise<ShopifyAgentOutput> {
  try {
    const result = await shopifyAgentFlow(input);
    return result;
  } catch (e: any) {
    console.error("Error in queryShopifyAgent:", e);
    return {
        response: `I encountered an issue trying to process your Shopify query: ${e.message || 'Unknown error'}. Please ensure your Shopify connection is configured correctly and try again.`,
        isError: true,
        errorMessage: e.message || 'Unknown error'
    };
  }
}


const prompt = ai.definePrompt(
  {
    name: 'shopifyAgentPrompt',
    input: { schema: ShopifyAgentInputSchema },
    output: { schema: ShopifyAgentOutputSchema.pick({response: true}) }, // Only expect 'response' from LLM directly
    tools: [listShopifyProductsTool, getShopifyProductByIdTool],
    system: `You are an AI assistant helping manage a Shopify e-commerce store.
Use the available tools to answer the user's questions about products.
When presenting product information:
- For lists of products, provide a concise summary (name, status, inventory). If an image URL is available, mention it.
- For single product details, include name, description (summarize HTML if long), price, status, inventory, vendor, and image URL if available.
- If a tool call results in an error or no data, inform the user clearly and politely.
- Do not make up information. Only rely on the tool outputs.
- If the query is ambiguous or a tool requires an ID that isn't provided, ask the user for clarification.
User's query: {{{query}}}
`,
  },
);

const shopifyAgentFlow = ai.defineFlow(
  {
    name: 'shopifyAgentFlow',
    inputSchema: ShopifyAgentInputSchema,
    outputSchema: ShopifyAgentOutputSchema,
  },
  async (input: ShopifyAgentInput) => {
    try {
      const llmResponse = await prompt(input);
      const output = llmResponse.output();

      if (!output) {
        // This case might happen if the LLM doesn't generate any text but uses a tool,
        // or if there's an issue with the LLM call itself.
        // We might need to inspect llmResponse.choices if this happens often.
         console.warn("Shopify agent LLM response was empty. Checking choices:", llmResponse.choices);
         // If there were tool calls, the text might be in history. For now, provide generic message.
         const toolCalls = llmResponse.choices.flatMap(c => c.toolCalls || []);
         if (toolCalls.length > 0) {
            // This implies tools were called but no summarization text was returned directly by the prompt.
            // This indicates a potential issue with the prompt or model behavior.
            // For now, we'll let it fall through, but ideally, the prompt should always generate a response string.
            // A more robust solution might involve processing tool results and generating a summary here if LLM doesn't.
         }
         // For now, if direct output is null, we'll signal an issue or rely on tool call processing.
         // The prompt is defined to return a `response` string, so `output` shouldn't be null if the LLM call succeeded.
         // If output is null, it might mean the model failed to produce structured output adhering to `ShopifyAgentOutputSchema.pick({response: true})`.
         // This check ensures we return a valid ShopifyAgentOutput.
         if (!output?.response) {
            return {
              response: "I'm sorry, I wasn't able to generate a response for your Shopify query. Please try rephrasing.",
              isError: true,
              errorMessage: "LLM did not produce a response string."
            };
         }

      }
       return {
        response: output.response,
        isError: false
      };

    } catch (error: any) {
      console.error('Error in shopifyAgentFlow:', error);
      return {
        response: `Sorry, I encountered an error while trying to process your Shopify request: ${error.message || 'Unknown error'}. Please check the logs or try again.`,
        isError: true,
        errorMessage: error.message || 'Unknown error'
      };
    }
  }
);

