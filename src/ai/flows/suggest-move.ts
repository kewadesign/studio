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
    .describe('The current state of the game board as a string.'),
  playerTurn: z
    .string()
    .describe('The current player turn, either 