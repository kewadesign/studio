// src/ai/flows/suggest-move.ts
'use server';

/**
 * @fileOverview An AI agent to suggest a move for the player in the Savannah Chase game.
 *
 * - suggestMove - A function that suggests a move for the player.
 * - SuggestMoveInput - The input type for the suggestMove function.
 * - SuggestMoveOutput - The return type for the suggestMove function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMoveInputSchema = z.object({
  boardState: z
    .string()
    .describe('The current state of the game board as a string, with pieces indicated by PlayerInitialAnimalInitial (e.g., HT for Human Goat, AL for AI Lion). Rows are 0-indexed from top, columns 0-indexed from left. Each row string is joined by spaces for cells, and rows by newlines.'),
  playerTurn: z
    .string()
    .describe('The name of the player whose turn it is (e.g., Human Player, AI Opponent).'),
});
export type SuggestMoveInput = z.infer<typeof SuggestMoveInputSchema>;

const SuggestMoveOutputSchema = z.object({
  suggestedMove: z.string().describe('A textual description of the suggested move, like "Move Goat from (7,1) to (6,1)".'),
});
export type SuggestMoveOutput = z.infer<typeof SuggestMoveOutputSchema>;

export async function suggestMove(input: SuggestMoveInput): Promise<SuggestMoveOutput> {
  return suggestMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMovePrompt',
  input: {schema: SuggestMoveInputSchema},
  output: {schema: SuggestMoveOutputSchema},
  prompt: `You are a strategic game AI for "Savannah Chase".
The board is an 8x8 grid. The Human player (H) pieces start at the bottom (row 7 for a 0-indexed board) and aim to reach the top (row 0). The AI player (A) pieces start at the top (row 0) and aim to reach the bottom (row 7).
Human pieces: 5 Goats (T), 1 Lion (L), 2 Giraffes (F).
AI pieces: 5 Goats (T), 1 Lion (L), 2 Giraffes (F).
Piece notation on the board is PlayerInitialAnimalChar, e.g., HT for Human Goat, AL for AI Lion, HF for Human Giraffe.
'..' denotes an empty square. 'RF' denotes a rift square. Landing on a rift square means the player who moved there loses their next turn.
The goal for the Human player is to get one of their pieces to row 0. The goal for the AI player is to get one of their pieces to row 7.
Pieces can move one square orthogonally (up, down, left, or right) to an adjacent empty square. Pieces cannot capture or jump over other pieces.

Current Board State (0-indexed rows from top, 0-indexed columns from left, cells in a row separated by spaces):
{{{boardState}}}

It is {{{playerTurn}}}'s turn.

Analyze the board and suggest the best possible move for {{{playerTurn}}}.
The suggested move should be described in a clear, actionable format, specifying the piece (e.g., Goat, Lion, Giraffe) and its start and end coordinates. For example: "Move Giraffe from (row 0, col 3) to (row 1, col 3)".
If multiple good moves exist, pick one. If no valid moves are possible for {{{playerTurn}}}, state that clearly (e.g., "No valid moves available for {{{playerTurn}}}.").

Prioritize moves in this order:
1. A move that wins the game.
2. A move that blocks an opponent's winning move on their next turn.
3. A move that significantly advances a piece towards the goal.
4. A move that sets up a future advantageous position.

Provide only the suggested move text.
`,
});

const suggestMoveFlow = ai.defineFlow(
  {
    name: 'suggestMoveFlow',
    inputSchema: SuggestMoveInputSchema,
    outputSchema: SuggestMoveOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || typeof output.suggestedMove !== 'string') {
      console.error('AI failed to produce a valid suggestedMove output. Input:', input, 'Raw Output:', output);
      return { suggestedMove: `AI could not determine a move for ${input.playerTurn}. Please try again or make a manual move.` };
    }
    return output;
  }
);
