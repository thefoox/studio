
'use server';

/**
 * @fileOverview This flow suggests relevant next steps for the administrator based on the store's current status and recent activity.
 *
 * - suggestNextSteps - A function that suggests the next steps.
 * - SuggestNextStepsInput - The input type for the suggestNextSteps function.
 * - SuggestNextStepsOutput - The return type for the suggestNextSteps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextStepsInputSchema = z.object({
  storeStatus: z.string().describe('The current status of the store, including metrics like sales, inventory levels, and customer engagement.'),
  recentActivity: z.string().describe('A summary of recent admin activity and notable events in the store.'),
});
export type SuggestNextStepsInput = z.infer<typeof SuggestNextStepsInputSchema>;

const SuggestNextStepsOutputSchema = z.object({
  suggestedSteps: z.array(
    z.object({
      step: z.string().describe('A suggested action for the administrator.'),
      reason: z.string().describe('The reason why this step is suggested.'),
    })
  ).describe('A list of suggested next steps for the administrator.'),
});
export type SuggestNextStepsOutput = z.infer<typeof SuggestNextStepsOutputSchema>;

export async function suggestNextSteps(input: SuggestNextStepsInput): Promise<SuggestNextStepsOutput> {
  return suggestNextStepsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextStepsPrompt',
  input: {schema: SuggestNextStepsInputSchema},
  output: {schema: SuggestNextStepsOutputSchema},
  prompt: `You are an AI assistant helping ecommerce store administrators manage their stores effectively.

  Based on the current store status and recent activity, suggest relevant next steps for the administrator.
  Provide a list of suggested steps with clear reasons for each suggestion.

  Store Status: {{{storeStatus}}}
  Recent Activity: {{{recentActivity}}}

  Consider suggesting actions related to:
  - Addressing low inventory
  - Processing pending orders
  - Improving customer engagement
  - Optimizing product pricing
  - Reviewing marketing campaign performance
  - Checking low inventory alerts
  - Reviewing customer feedback
  - Improving product discoverability
`,
});

const suggestNextStepsFlow = ai.defineFlow(
  {
    name: 'suggestNextStepsFlow',
    inputSchema: SuggestNextStepsInputSchema,
    outputSchema: SuggestNextStepsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
