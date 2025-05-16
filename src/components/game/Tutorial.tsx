
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles, Shield, TrendingUp, Mountain, Waves, Wind } from 'lucide-react';

interface TutorialProps {
  onStartGame: () => void;
}

const tutorialSteps = [
  {
    icon: <Sparkles className="inline-block mr-2 text-yellow-500" />,
    title: 'Willkommen bei Savannah Chase!',
    content: 'Dein Ziel: Fange den gegnerischen Löwen ODER alle 5 gegnerischen Gazellen. Du spielst mit den schwarzen Figuren unten.',
  },
  {
    icon: <Shield className="inline-block mr-2 text-red-500" />,
    title: 'Der Löwe (L)',
    content: 'Der Löwe ist dein König! Er zieht 1, 2 oder 3 Felder in jede Richtung (gerade oder diagonal). Nach einem Zug muss er eine Runde aussetzen.',
  },
  {
    icon: <TrendingUp className="inline-block mr-2 text-blue-500" />,
    title: 'Die Giraffe (G)',
    content: 'Die Giraffe zieht bis zu 2 Felder, aber nur geradeaus (nicht diagonal). Sie darf keine Hügel (H) betreten.',
  },
  {
    icon: <Sparkles className="inline-block mr-2 text-green-500" />, // Using Sparkles again for Gazelle
    title: 'Die Gazelle (Z)',
    content: 'Die Gazelle zieht 1 Feld gerade vorwärts. Zum Schlagen springt sie 1 Feld diagonal vorwärts. Gazellen können keine Löwen fangen!',
  },
  {
    icon: <Mountain className="inline-block mr-2 text-yellow-700" />,
    title: 'Spezialfeld: Hügel (H)',
    content: 'Hügel (H) sind für Giraffen tabu! Andere Tiere können sie normal betreten.',
  },
  {
    icon: <Waves className="inline-block mr-2 text-emerald-600" />,
    title: 'Spezialfeld: Sumpf (S)',
    content: 'Sümpfe (S) sind im Moment ganz normale Felder ohne besondere Regeln.',
  },
  {
    icon: <Wind className="inline-block mr-2 text-destructive" />,
    title: 'Spezialfeld: Kluft (K)',
    content: 'Klüfte (K) sind knifflig! Landest du auf einer, wirst du in Pfeilrichtung weitergeschoben, bis du auf ein Hindernis triffst.',
  },
  {
    icon: <Sparkles className="inline-block mr-2" />,
    title: 'Los geht\'s!',
    content: 'Das waren die Regeln. Klicke auf "Spiel starten", um loszulegen. Viel Glück!',
  },
];

const Tutorial: React.FC<TutorialProps> = ({ onStartGame }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl text-primary flex items-center">
            {step.icon}
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-base sm:text-lg text-card-foreground">
          <p>{step.content}</p>
        </CardContent>
        <CardFooter className="flex justify-between pt-4">
          <Button onClick={handlePrev} disabled={currentStep === 0} variant="outline">
            <ChevronLeft className="mr-1 h-5 w-5" /> Zurück
          </Button>
          {currentStep < tutorialSteps.length - 1 ? (
            <Button onClick={handleNext}>
              Weiter <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={onStartGame} className="bg-green-600 hover:bg-green-700 text-white">
              Spiel starten!
            </Button>
          )}
        </CardFooter>
      </Card>
       <div className="mt-4 text-sm text-muted-foreground">
        Schritt {currentStep + 1} von {tutorialSteps.length}
      </div>
    </div>
  );
};

export default Tutorial;

    