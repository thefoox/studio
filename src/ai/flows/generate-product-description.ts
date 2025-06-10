
'use server';

/**
 * @fileOverview AI agent for generating engaging product descriptions.
 *
 * - generateProductDescription - A function that generates a product description based on the provided input.
 * - GenerateProductDescriptionInput - The input type for the generateProductDescription function.
 * - GenerateProductDescriptionOutput - The return type for the generateProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  keyFeatures: z.string().describe('Key features of the product, separated by commas or a short paragraph.'),
  tone: z.string().describe('Desired tone of the product description (e.g., professional, funny, exciting).'),
  targetKeywords: z.array(z.string()).optional().describe('A list of target keywords to include for SEO purposes. Integrate them naturally.'),
  existingDescription: z.string().optional().describe('An existing brief description (e.g., from image analysis) to expand upon.'),
});

export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated product description.'),
});

export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(
  input: GenerateProductDescriptionInput
): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  prompt: `You are an expert copywriter specializing in writing engaging and SEO-friendly product descriptions.

  Generate a compelling product description for the following product.
  Use the provided key features and desired tone.
  {{#if existingDescription}}
  Expand upon this existing information: {{{existingDescription}}}
  {{/if}}
  {{#if targetKeywords}}
  Naturally incorporate the following keywords for SEO: {{#each targetKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
  {{/if}}

  Product Name: {{{productName}}}
  Key Features: {{{keyFeatures}}}
  Tone: {{{tone}}}

  Description:`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("Failed to generate product description from AI model.");
    }
    return output;
  }
);
