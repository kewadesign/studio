
'use server';

/**
 * @fileOverview Game state analyzer AI agent for Savannah Chase.
 *
 * - analyzeGameState - A function that analyzes the game state and provides a summary.
 * - AnalyzeGameStateInput - The input type for the analyzeGameState function.
 * - AnalyzeGameStateOutput - The return type for the analyzeGameState function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const AnalyzeGameStateInputSchema = z.object({
  boardState: z
    .string()
    .describe('The current state of the 7x7 game board as a string. Rows 0-indexed (top, AI White side), cols 0-indexed (left). Cells by spaces, rows by newlines. Format: PlayerInitialAnimalChar (e.g., BZ for Human Gazelle, WL for AI Lion, WG for AI Giraffe). Empty: "..". Terrain: K=Kluft (pushes piece in a game-defined random direction if landed on), S=Sumpf (Lions/Gazelles pause next turn, Giraffes cannot enter), H=Hügel (Giraffes can enter).'),
  playerOneName: z.string().describe('The name of player one (AI, White, Top).'),
  playerTwoName: z.string().describe('The name of player two (Human, Black, Bottom).'),
});
export type AnalyzeGameStateInput = z.infer<typeof AnalyzeGameStateInputSchema>;

const AnalyzeGameStateOutputSchema = z.object({
  playerOneSummary: z // AI Player (White, Top)
    .string()
    .describe('A short summary of the advantages/disadvantages for player one (AI, White, Top). Focus on board control, piece safety, threats, and progress towards win conditions.'),
  playerTwoSummary: z // Human Player (Black, Bottom)
    .string()
    .describe('A short summary of the advantages/disadvantages for player two (Human, Black, Bottom). Focus on board control, piece safety, threats, and progress towards win conditions.'),
  overallAssessment: z
    .string()
    .describe('A brief overall assessment of the game state, e.g., "AI (White) has a slight advantage due to better Lion positioning."'),
});
export type AnalyzeGameStateOutput = z.infer<typeof AnalyzeGameStateOutputSchema>;

export async function analyzeGameState(
  input: AnalyzeGameStateInput
): Promise<AnalyzeGameStateOutput> {
  return analyzeGameStateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeGameStatePrompt_v0_4_randomRiftsAndSwampRules',
  input: {schema: AnalyzeGameStateInputSchema},
  output: {schema: AnalyzeGameStateOutputSchema},
  prompt: `You are an expert game analyst for "Savannah Chase" (Version 0.4 GDD, with randomized rifts and new swamp/hill rules).
The board is 7x7. AI (W, White) starts rows 0/1. Human (B, Black) starts rows 6/5.
Pieces:
- Lion (L): Moves 1-2 squares (any dir). Pauses 1 turn after moving. Capturable only by Lion/Giraffe. If lands on Sumpf (S), pauses next turn.
- Giraffe (G): Moves max 2 squares (H/V). Cannot enter Sumpf (S) squares. Can enter Hügel (H) squares.
- Gazelle (Z): AI (White, Top) Gazelles move 1 square "forward" (increasing row index). Human (Black, Bottom) Gazelles move 1 square "forward" (decreasing row index). Captures 1 diag forward. Cannot capture Lion. If lands on Sumpf (S), pauses next turn.
Terrain:
'K' (Kluft/Rift): If a piece lands here, it's pushed in a specific, randomly determined direction (N, S, E, or W) until it hits an obstacle. Does not capture.
'S' (Sumpf/Swamp): If a Lion or Gazelle lands here, they must pause their next turn. Giraffes cannot enter Sumpf squares.
'H' (Hügel/Hill): All pieces, including Giraffes, can enter.
Win: Capture enemy Lion OR all 5 enemy Gazelles.

Board State (0-indexed rows from AI White top, 0-indexed columns from left):
{{{boardState}}}

Player One: {{{playerOneName}}} (AI, White, Top)
Player Two: {{{playerTwoName}}} (Human, Black, Bottom)

Analyze the board state. Provide:
1. A summary for {{{playerOneName}}} (advantages/disadvantages, piece safety, threats, progress to win).
2. A summary for {{{playerTwoName}}} (same as above).
3. A brief overall assessment of who might be in a better position.

Consider material advantage, positional strength, king (Lion) safety, and threats.
Factor in the new Sumpf rules for Lions and Gazelles (pause) and Giraffes (no entry).
Factor in that Giraffes CAN enter Hügel (H) squares.
Be concise and strategic.
`,
});

const analyzeGameStateFlow = ai.defineFlow(
  {
    name: 'analyzeGameStateFlow_v0_4_randomRiftsAndSwampRules',
    inputSchema: AnalyzeGameStateInputSchema,
    outputSchema: AnalyzeGameStateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.playerOneSummary || !output.playerTwoSummary || !output.overallAssessment) {
        console.error('AI analysis failed to produce complete output. Input:', input, 'Raw Output:', output);
        return {
            playerOneSummary: "Analysis data incomplete.",
            playerTwoSummary: "Analysis data incomplete.",
            overallAssessment: "Could not determine game assessment due to incomplete AI output."
        };
    }
    return output;
  }
);
