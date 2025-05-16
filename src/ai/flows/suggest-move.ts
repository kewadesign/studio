
'use server';

/**
 * @fileOverview An AI agent to suggest a move for the player in Savannah Chase.
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
    .describe('The current state of the 7x7 game board as a string. Rows 0-indexed (top, AI White side), cols 0-indexed (left). Cells by spaces, rows by newlines. Format: PlayerInitialAnimalChar (e.g., HZ for Human Gazelle, AL for AI Lion, AG for AI Giraffe). Empty: "..". Terrain: K=Kluft (pushes piece in a specific, game-defined direction if landed on, not always North), S=Sumpf (no effect), H=Hügel (Giraffe cannot enter).'),
  playerTurn: z
    .string()
    .describe('The name of the player whose turn it is (e.g., Human Player (Black, Bottom), AI Opponent (White, Top)).'),
});
export type SuggestMoveInput = z.infer<typeof SuggestMoveInputSchema>;

const SuggestMoveOutputSchema = z.object({
  suggestedMove: z.string().describe('A textual description of the suggested move, like "Move Gazelle from (1,1) to (2,1)" or "Move Lion from (0,3) to (3,3) to capture Giraffe".'),
});
export type SuggestMoveOutput = z.infer<typeof SuggestMoveOutputSchema>;

export async function suggestMove(input: SuggestMoveInput): Promise<SuggestMoveOutput> {
  return suggestMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMovePrompt_v0_4_randomRifts', 
  input: {schema: SuggestMoveInputSchema},
  output: {schema: SuggestMoveOutputSchema},
  prompt: `You are a strategic game AI for "Savannah Chase" (Version 0.4 GDD with randomized rifts).
The board is a 7x7 grid. AI player (A, White) pieces start at row 0/1 and Human player (H, Black) pieces start at row 6/5.
Pieces:
- Lion (L): Moves 1-3 squares (orthogonally/diagonally). Cannot jump. Must pause for 1 turn after moving. Can be captured ONLY by an enemy Lion or Giraffe.
- Giraffe (G): Moves max 2 squares (orthogonally). Cannot jump. Cannot enter Hügel (H) squares. Other pieces can enter Hügel.
- Gazelle (Z): AI (White, Top) Gazelles move 1 square "forward" (increasing row index). Human (Black, Bottom) Gazelles move 1 square "forward" (decreasing row index). Captures 1 square diagonally forward. Cannot capture a Lion.

Players: Human (H, Black, Bottom), AI (A, White, Top). Piece notation: PlayerInitialAnimalChar (e.g., HZ, AL, AG).
'..' denotes an empty square.
Terrain:
'K' (Kluft/Rift): If a piece lands here, it's pushed in a specific direction (determined by the game, could be North, South, East, or West) until it hits an obstacle. Does not capture.
'S' (Sumpf/Swamp): No special game effect currently.
'H' (Hügel/Hill): Giraffes cannot enter. Other pieces can.

Win Conditions:
1. Capture the opponent's Lion.
2. Capture all 5 of the opponent's Gazelles.

Current Board State (0-indexed rows from AI White top, 0-indexed columns from left, cells in a row separated by spaces):
{{{boardState}}}

It is {{{playerTurn}}}'s turn.
If a Lion belonging to {{{playerTurn}}} moved in their last turn, it cannot move again this turn.

Analyze the board and suggest the best possible move for {{{playerTurn}}}.
The suggested move should be described in a clear, actionable format, specifying the piece, its start and end coordinates. E.g., "Move Gazelle from (1,1) to (2,1)" or "Move Lion from (0,3) to (3,3) to capture Giraffe".
If no valid moves are possible for {{{playerTurn}}}, state that clearly.

Prioritize moves in this order:
1. A move that wins the game (captures enemy Lion or last enemy Gazelle).
2. A move that captures a high-value piece (Lion > Giraffe > Gazelle) safely.
3. A move that blocks an opponent's immediate winning move.
4. A move that sets up a strong offensive or defensive position, considering terrain. Landing on a Kluft (K) can be risky or advantageous due to the push.
5. A move that develops a piece towards a useful area or captures a less valuable piece.
6. Any other valid move. Avoid moving into obvious danger if better options exist.
If a Lion must pause, do not suggest moving it.

Provide only the suggested move text.
`,
});

const suggestMoveFlow = ai.defineFlow(
  {
    name: 'suggestMoveFlow_v0_4_randomRifts',
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
