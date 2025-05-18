
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
    .describe('Der aktuelle Zustand des 7x7 Spielbretts als Zeichenkette. Reihen 0-indiziert (oben, KI Schwarz), Spalten 0-indiziert (links). Zellen durch Leerzeichen, Reihen durch Zeilenumbrüche. Format: SpielerinitialTierinitial (z.B. WZ für Spieler (Weiß) Gazelle, BL für KI (Schwarz) Löwe, BG für KI (Schwarz) Giraffe). Leer: "..". Terrain: K=Kluft (verschiebt Figur in eine spieldefinierte zufällige Richtung, wenn darauf gelandet), S=Sumpf (Löwen/Gazellen pausieren nächste Runde, Giraffen können nicht betreten), H=Hügel (NUR Giraffen können betreten).'),
  playerOneName: z.string().describe('Der Name von Spieler Eins (KI, Schwarz, Oben).'),
  playerTwoName: z.string().describe('Der Name von Spieler Zwei (Menschlicher Spieler, Weiß, Unten).'),
});
export type AnalyzeGameStateInput = z.infer<typeof AnalyzeGameStateInputSchema>;

const AnalyzeGameStateOutputSchema = z.object({
  playerOneSummary: z // AI Player (Black, Top)
    .string()
    .describe('Eine kurze Zusammenfassung der Vor-/Nachteile für Spieler Eins (KI, Schwarz, Oben). Fokus auf Brettkontrolle, Figurensicherheit, Bedrohungen und Fortschritt zu den Siegbedingungen.'),
  playerTwoSummary: z // Human Player (White, Bottom)
    .string()
    .describe('Eine kurze Zusammenfassung der Vor-/Nachteile für Spieler Zwei (Menschlicher Spieler, Weiß, Unten). Fokus auf Brettkontrolle, Figurensicherheit, Bedrohungen und Fortschritt zu den Siegbedingungen.'),
  overallAssessment: z
    .string()
    .describe("Eine kurze Gesamtbewertung des Spielzustands, z.B. 'KI (Schwarz) hat einen leichten Vorteil durch bessere Löwenpositionierung.'"),
});
export type AnalyzeGameStateOutput = z.infer<typeof AnalyzeGameStateOutputSchema>;

export async function analyzeGameState(
  input: AnalyzeGameStateInput
): Promise<AnalyzeGameStateOutput> {
  return analyzeGameStateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeGameStatePrompt_v0_4_randomRiftsAndSwampRules_DE',
  input: {schema: AnalyzeGameStateInputSchema},
  output: {schema: AnalyzeGameStateOutputSchema},
  prompt: `Du bist ein Experte für Spielanalysen für "Savannah Chase" (Version 0.4 GDD, mit zufälligen Klüften und neuen Sumpf-/Hügel-Regeln).
Das Brett ist 7x7 groß. KI (B, Schwarz) startet in den Reihen 0/1. Mensch (W, Weiß) startet in den Reihen 6/5.
Figuren:
- Löwe (L): Zieht 1-2 Felder (jede Richtung). Pausiert 1 Zug nach Bewegung. Nur von Löwe/Giraffe schlagbar. Wenn er auf Sumpf (S) landet, pausiert er nächste Runde. Kann Hügel (H) nicht betreten.
- Giraffe (G): Zieht max. 2 Felder (H/V). Kann Sumpf (S) nicht betreten. KANN Hügel (H) betreten. Kann eine Kluft (K) bei einem 2-Felder-Zug nicht überspringen, wenn das Zwischenfeld eine Kluft ist.
- Gazelle (Z): KI (Schwarz, Oben) Gazellen ziehen 1 Feld "vorwärts" (Reihenindex steigt). Mensch (Weiß, Unten) Gazellen ziehen 1 Feld "vorwärts" (Reihenindex sinkt). Schlägt 1 Feld diag. vorwärts. Kann Löwen nicht schlagen. Wenn sie auf Sumpf (S) landet, pausiert sie nächste Runde. Kann Hügel (H) nicht betreten.
Terrain:
'K' (Kluft): Landet eine Figur hier, wird sie in eine spezifische, zufällig bestimmte Richtung (N, S, E oder W) geschoben, bis sie auf ein Hindernis trifft. Schlägt nicht.
'S' (Sumpf): Landen Löwe oder Gazelle hier, müssen sie nächste Runde pausieren. Giraffen können Sumpf nicht betreten.
'H' (Hügel): NUR Giraffen können dieses Terrain betreten. Löwen und Gazellen nicht.
Sieg: Gegnerischen Löwen ODER alle 5 gegn. Gazellen schlagen.

Spielbrett (0-indizierte Reihen von KI Schwarz oben, 0-indizierte Spalten von links):
{{{boardState}}}

Spieler Eins: {{{playerOneName}}} (KI, Schwarz, Oben)
Spieler Zwei: {{{playerTwoName}}} (Menschlicher Spieler, Weiß, Unten)

Analysiere den Spielzustand. Liefere:
1. Eine Zusammenfassung für {{{playerOneName}}} (Vor-/Nachteile, Figurensicherheit, Bedrohungen, Fortschritt zum Sieg).
2. Eine Zusammenfassung für {{{playerTwoName}}} (wie oben).
3. Eine kurze Gesamtbewertung, wer in einer besseren Position sein könnte.

Berücksichtige Materialvorteil, Positionsstärke, Sicherheit des Königs (Löwe) und Bedrohungen.
Beziehe die Sumpf-Regeln ein (Pause für Löwe/Gazelle, kein Betreten für Giraffe).
Beziehe die Hügel-Regeln ein (NUR Giraffen können betreten).
Beziehe die Kluft-Regeln ein (Schiebeeffekt, variable Richtung, Giraffe kann nicht überspringen).
Sei prägnant und strategisch. Antworte auf Deutsch.
`,
});

const analyzeGameStateFlow = ai.defineFlow(
  {
    name: 'analyzeGameStateFlow_v0_4_randomRiftsAndSwampRules_DE',
    inputSchema: AnalyzeGameStateInputSchema,
    outputSchema: AnalyzeGameStateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.playerOneSummary || !output.playerTwoSummary || !output.overallAssessment) {
        console.error('KI-Analyse konnte keine vollständige Ausgabe erzeugen. Eingabe:', input, 'Rohe Ausgabe:', output);
        return {
            playerOneSummary: "Analysedaten unvollständig.",
            playerTwoSummary: "Analysedaten unvollständig.",
            overallAssessment: "Spielbewertung konnte aufgrund unvollständiger KI-Ausgabe nicht ermittelt werden."
        };
    }
    return output;
  }
);
