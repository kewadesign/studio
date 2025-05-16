'use server';

/**
 * @fileOverview Game state analyzer AI agent.
 *
 * - analyzeGameState - A function that analyzes the game state and provides a summary of advantages/disadvantages for each player.
 * - AnalyzeGameStateInput - The input type for the analyzeGameState function.
 * - AnalyzeGameStateOutput - The return type for the analyzeGameState function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeGameStateInputSchema = z.object({
  boardState: z
    .string()
    .describe('A string representation of the current game board state.'),
  playerOneName: z.string().describe('The name of player one.'),
  playerTwoName: z.string().describe('The name of player two.'),
});
export type AnalyzeGameStateInput = z.infer<typeof AnalyzeGameStateInputSchema>;

const AnalyzeGameStateOutputSchema = z.object({
  playerOneSummary: z
    .string()
    .describe('A short summary of the advantages/disadvantages for player one.'),
  playerTwoSummary: z
    .string()
    .describe('A short summary of the advantages/disadvantages for player two.'),
});
export type AnalyzeGameStateOutput = z.infer<typeof AnalyzeGameStateOutputSchema>;

export async function analyzeGameState(
  input: AnalyzeGameStateInput
): Promise<AnalyzeGameStateOutput> {
  return analyzeGameStateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeGameStatePrompt',
  input: {schema: AnalyzeGameStateInputSchema},
  output: {schema: AnalyzeGameStateOutputSchema},
  prompt: `You are an expert game analyst, skilled at understanding board game states.

You will analyze the current game board state and provide a short summary of the advantages/disadvantages for each player.

Board State: {{{boardState}}}
Player One Name: {{{playerOneName}}}
Player Two Name: {{{playerTwoName}}}

Analyze the board state and provide a summary for each player.
`,
});

const analyzeGameStateFlow = ai.defineFlow(
  {
    name: 'analyzeGameStateFlow',
    inputSchema: AnalyzeGameStateInputSchema,
    outputSchema: AnalyzeGameStateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
