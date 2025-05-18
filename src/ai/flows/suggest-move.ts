
'use server';

/**
 * @fileOverview An AI agent to suggest a move for the player in Savannah Chase.
 *
 * - suggestMove - A function that suggests a move for the player.
 * - SuggestMoveInput - The input type for the suggestMove function.
 * - SuggestMoveOutput - The return type for the suggestMove function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const SuggestMoveInputSchema = z.object({
  boardState: z
    .string()
    .describe('The current state of the 7x7 game board as a string. Rows 0-indexed (top, AI White side), cols 0-indexed (left). Cells by spaces, rows by newlines. Format: PlayerInitialAnimalChar (e.g., BZ for Human Gazelle, WL for AI Lion, WG for AI Giraffe). Empty: "..". Terrain: K=Kluft (pushes piece in a game-defined random direction if landed on), S=Sumpf (Lions/Gazelles pause next turn, Giraffes cannot enter), H=Hügel (ONLY Giraffes can enter).'),
  playerTurn: z
    .string()
    .describe('The name of the player whose turn it is (e.g., Human Player (Black, Bottom), AI Opponent (White, Top)). Include info if their Lion or another piece is paused (e.g., by Sumpf).'),
});
export type SuggestMoveInput = z.infer<typeof SuggestMoveInputSchema>;

const SuggestMoveOutputSchema = z.object({
  suggestedMove: z.string().describe("Eine textuelle Beschreibung des vorgeschlagenen Zuges, z.B. 'Bewege Gazelle von (1,1) nach (2,1)' oder 'Bewege Löwe von (0,3) nach (3,3) um Giraffe zu schlagen'. Wenn eine Figur pausiert, dies angeben."),
});
export type SuggestMoveOutput = z.infer<typeof SuggestMoveOutputSchema>;

export async function suggestMove(input: SuggestMoveInput): Promise<SuggestMoveOutput> {
  return suggestMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMovePrompt_v0_4_randomRiftsAndSwampRules',
  input: {schema: SuggestMoveInputSchema},
  output: {schema: SuggestMoveOutputSchema},
  prompt: `You are a strategic game AI for "Savannah Chase" (Version 0.4 GDD with randomized rifts and new swamp/hill rules).
The board is a 7x7 grid. AI player (W, White) pieces start at row 0/1 and Human player (B, Black) pieces start at row 6/5.
Pieces:
- Lion (L): Moves 1-2 squares (orthogonally/diagonally). Cannot jump. Must pause for 1 turn after moving. Can be captured ONLY by an enemy Lion or Giraffe. If lands on Sumpf (S), must pause its next turn. Cannot enter Hügel (H).
- Giraffe (G): Moves max 2 squares (orthogonally). Cannot jump. Cannot enter Sumpf (S) squares. CAN enter Hügel (H) squares. Cannot jump over a Kluft (K) in a 2-square move if the intermediate square is a Kluft.
- Gazelle (Z): AI (White, Top) Gazelles move 1 square "forward" (increasing row index). Human (Black, Bottom) Gazelles move 1 square "forward" (decreasing row index). Captures 1 square diagonally forward. Cannot capture a Lion. If lands on Sumpf (S), must pause its next turn. Cannot enter Hügel (H).

Players: Human (B, Black, Bottom), AI (W, White, Top). Piece notation: PlayerInitialAnimalChar (e.g., BZ, WL, WG).
'..' denotes an empty square.
Terrain:
'K' (Kluft/Rift): If a piece lands here, it's pushed in a specific, randomly determined direction (N, S, E, or W) until it hits an obstacle. Does not capture.
'S' (Sumpf/Swamp): If a Lion or Gazelle lands here, they must pause their next turn. Giraffes cannot enter Sumpf squares.
'H' (Hügel/Hill): ONLY Giraffes can enter this terrain. Lions and Gazelles cannot.

Win Conditions:
1. Capture the opponent's Lion.
2. Capture all 5 of the opponent's Gazelles.

Current Board State (0-indexed rows from AI White top, 0-indexed columns from left, cells in a row separated by spaces):
{{{boardState}}}

It is {{{playerTurn}}}'s turn.
Consider if any pieces of {{{playerTurn}}} are paused (Lion due to its own move, or Lion/Gazelle due to landing on a Sumpf). A paused piece cannot move.

Analyze the board and suggest the best possible move for {{{playerTurn}}}.
The suggested move should be described in a clear, actionable format, specifying the piece, its start and end coordinates. E.g., "Move Gazelle from (1,1) to (2,1)" or "Move Lion from (0,3) to (3,3) to capture Giraffe".
If a key piece is paused, mention it, e.g., "Lion at (2,2) is paused. Suggest moving Gazelle from (1,1) to (2,1)."
If no valid moves are possible for {{{playerTurn}}}, state that clearly.

Prioritize moves in this order:
1. A move that wins the game (captures enemy Lion or last enemy Gazelle).
2. A move that captures a high-value piece (Lion > Giraffe > Gazelle) safely.
3. A move that blocks an opponent's immediate winning move.
4. A move that sets up a strong offensive or defensive position, considering terrain. Landing on a Kluft (K) can be risky or advantageous. Avoid moving Lions/Gazelles onto Sumpf (S) if other good moves exist, due to the pause. Giraffes can use Hügel (H) squares strategically, as other pieces cannot.
5. A move that develops a piece towards a useful area or captures a less valuable piece.
6. Any other valid move. Avoid moving into obvious danger if better options exist.
If a piece is paused, do not suggest moving it.

Provide only the suggested move text.
`,
});

const suggestMoveFlow = ai.defineFlow(
  {
    name: 'suggestMoveFlow_v0_4_randomRiftsAndSwampRules',
    inputSchema: SuggestMoveInputSchema,
    outputSchema: SuggestMoveOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || typeof output.suggestedMove !== 'string') {
      console.error('AI failed to produce a valid suggestedMove output. Input:', input, 'Raw Output:', output);
      return { suggestedMove: `KI konnte keinen Zug für ${input.playerTurn} ermitteln. Bitte versuche es erneut oder mache einen manuellen Zug.` };
    }
    return output;
  }
);
