
'use server';

/**
 * @fileOverview Game state analyzer AI agent for Savannah Chase.
 *
 * - analyzeGameState - A function that analyzes the game state and provides a summary.
 * - AnalyzeGameStateInput - The input type for the analyzeGameState function.
 * - AnalyzeGameStateOutput - The return type for the analyzeGameState function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeGameStateInputSchema = z.object({
  boardState: z
    .string()
    .describe('The current state of the 7x7 game board as a string. Rows 0-indexed (top, Human side), cols 0-indexed (left). Cells by spaces, rows by newlines. Format: PlayerInitialAnimalChar (e.g., HZ for Human Gazelle, AL for AI Lion, HG for Human Giraffe). Empty: "..". Terrain: K=Kluft (pushed North), S=Sumpf, H=Hügel (Giraffe cannot enter).'),
  playerOneName: z.string().describe('The name of player one (Human).'),
  playerTwoName: z.string().describe('The name of player two (AI).'),
  // Optional: Add lionMovedLastTurn, currentPlayerTurn, captured pieces for more detailed analysis context
});
export type AnalyzeGameStateInput = z.infer<typeof AnalyzeGameStateInputSchema>;

const AnalyzeGameStateOutputSchema = z.object({
  playerOneSummary: z // Human Player
    .string()
    .describe('A short summary of the advantages/disadvantages for player one (Human). Focus on board control, piece safety, threats, and progress towards win conditions.'),
  playerTwoSummary: z // AI Opponent
    .string()
    .describe('A short summary of the advantages/disadvantages for player two (AI). Focus on board control, piece safety, threats, and progress towards win conditions.'),
  overallAssessment: z
    .string()
    .describe('A brief overall assessment of the game state, e.g., "Human has a slight advantage due to better Lion positioning."'),
});
export type AnalyzeGameStateOutput = z.infer<typeof AnalyzeGameStateOutputSchema>;

export async function analyzeGameState(
  input: AnalyzeGameStateInput
): Promise<AnalyzeGameStateOutput> {
  return analyzeGameStateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeGameStatePrompt_v0_4', // Versioned prompt name
  input: {schema: AnalyzeGameStateInputSchema},
  output: {schema: AnalyzeGameStateOutputSchema},
  prompt: `You are an expert game analyst for "Savannah Chase" (Version 0.4 GDD).
The board is 7x7. Human (H) starts rows 0/1. AI (A) starts rows 6/5.
Pieces:
- Lion (L): Moves 1-3 (any dir). Pauses 1 turn after moving. Capturable only by Lion/Giraffe.
- Giraffe (G): Moves max 2 (H/V). Cannot enter Hügel (H).
- Gazelle (Z): Moves 1 forward. Captures 1 diag forward. Cannot capture Lion.
Terrain:
'K' (Kluft): Pushes piece North.
'S' (Sumpf): No effect.
'H' (Hügel): Giraffe cannot enter.
Win: Capture enemy Lion OR all 5 enemy Gazelles.

Board State (0-indexed rows from Human top, 0-indexed columns from left):
{{{boardState}}}

Player One: {{{playerOneName}}} (Human)
Player Two: {{{playerTwoName}}} (AI)

Analyze the board state. Provide:
1. A summary for {{{playerOneName}}} (advantages/disadvantages, piece safety, threats, progress to win).
2. A summary for {{{playerTwoName}}} (same as above).
3. A brief overall assessment of who might be in a better position.

Consider material advantage, positional strength, king (Lion) safety, and threats.
Be concise and strategic.
`,
});

const analyzeGameStateFlow = ai.defineFlow(
  {
    name: 'analyzeGameStateFlow_v0_4',
    inputSchema: AnalyzeGameStateInputSchema,
    outputSchema: AnalyzeGameStateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.playerOneSummary || !output.playerTwoSummary || !output.overallAssessment) {
        console.error('AI analysis failed to produce complete output. Input:', input, 'Raw Output:', output);
        return { 
            playerOneSummary: "Analysis failed.", 
            playerTwoSummary: "Analysis failed.",
            overallAssessment: "Could not determine game assessment."
        };
    }
    return output;
  }
);
