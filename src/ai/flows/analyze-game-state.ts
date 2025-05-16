
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
    .describe('The current state of the 7x7 game board as a string. Rows 0-indexed (top, AI White side), cols 0-indexed (left). Cells by spaces, rows by newlines. Format: PlayerInitialAnimalChar (e.g., HZ for Human Gazelle, AL for AI Lion, AG for AI Giraffe). Empty: "..". Terrain: K=Kluft (pushes piece in a specific, game-defined direction if landed on, not always North), S=Sumpf, H=Hügel (Giraffe cannot enter).'),
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
  name: 'analyzeGameStatePrompt_v0_4_randomRifts', 
  input: {schema: AnalyzeGameStateInputSchema},
  output: {schema: AnalyzeGameStateOutputSchema},
  prompt: `You are an expert game analyst for "Savannah Chase" (Version 0.4 GDD, with randomized rifts).
The board is 7x7. AI (A, White) starts rows 0/1. Human (H, Black) starts rows 6/5.
Pieces:
- Lion (L): Moves 1-3 (any dir). Pauses 1 turn after moving. Capturable only by Lion/Giraffe.
- Giraffe (G): Moves max 2 (H/V). Cannot enter Hügel (H).
- Gazelle (Z): AI (White, Top) Gazelles move 1 square "forward" (increasing row index). Human (Black, Bottom) Gazelles move 1 square "forward" (decreasing row index). Captures 1 diag forward. Cannot capture Lion.
Terrain:
'K' (Kluft/Rift): If a piece lands here, it's pushed in a specific direction (determined by the game, not always North) until it hits an obstacle. Does not capture.
'S' (Sumpf/Swamp): No special game effect currently.
'H' (Hügel/Hill): Giraffe cannot enter. Other pieces can.
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
Be concise and strategic.
`,
});

const analyzeGameStateFlow = ai.defineFlow(
  {
    name: 'analyzeGameStateFlow_v0_4_randomRifts',
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
