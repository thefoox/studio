
'use server';
/**
 * @fileOverview AI agent for analyzing product images.
 *
 * - analyzeProductImage - A function that analyzes a product image and suggests category, tags, and an initial description.
 * - AnalyzeProductImageInput - The input type for the analyzeProductImage function.
 * - AnalyzeProductImageOutput - The return type for the analyzeProductImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeProductImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A product image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeProductImageInput = z.infer<typeof AnalyzeProductImageInputSchema>;

const AnalyzeProductImageOutputSchema = z.object({
  category: z.string().describe('A suggested product category based on the image.'),
  tags: z.array(z.string()).describe('A list of 3-5 relevant tags for the product based on the image.'),
  initialDescription: z.string().describe('A short, compelling initial product description based on the image content.'),
});
export type AnalyzeProductImageOutput = z.infer<typeof AnalyzeProductImageOutputSchema>;

export async function analyzeProductImage(input: AnalyzeProductImageInput): Promise<AnalyzeProductImageOutput> {
  return analyzeProductImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeProductImagePrompt',
  input: {schema: AnalyzeProductImageInputSchema},
  output: {schema: AnalyzeProductImageOutputSchema},
  prompt: `You are an expert e-commerce merchandising assistant.
Analyze the provided product image.
Based SOLELY on the visual information in the image, suggest:
1. A suitable product category (e.g., "Electronics", "Apparel - Mens", "Home Goods - Kitchen").
2. 3 to 5 relevant and specific tags (e.g., "wireless earbuds", "noise cancelling", "bluetooth 5.0" or "summer dress", "floral print", "cotton").
3. A short, engaging, and descriptive initial product description (1-2 sentences) highlighting key visual features.

Product Image:
{{media url=imageDataUri}}

Respond with ONLY the JSON object matching the output schema.
`,
});

const analyzeProductImageFlow = ai.defineFlow(
  {
    name: 'analyzeProductImageFlow',
    inputSchema: AnalyzeProductImageInputSchema,
    outputSchema: AnalyzeProductImageOutputSchema,
  },
  async (input: AnalyzeProductImageInput) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("Failed to get analysis from AI model.");
    }
    return output;
  }
);
