'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Import the card sort interface
import { CardSortInterface } from '@/components/card-sort';
import { useCardSortStore } from '@/store/card-sort-store';
import { Card, Category } from '@/types';

interface StudyData {
  id: string;
  name: string;
  description?: string;
  mode: 'OPEN' | 'CLOSED';
  instructions?: string;
  thankYouMessage?: string;
  settings: {
    allowUndo: boolean;
    showProgress: boolean;
    requireAllCardsSorted: boolean;
    randomizeCards: boolean;
    timeLimitMinutes?: number;
  };
  cards: Card[];
  categories: { id: string; name: string }[];
}

interface SessionData {
  sessionId: string;
  displayId: string;
}

type PageStatus = 'loading' | 'intro' | 'sorting' | 'completed' | 'error';

export default function ParticipantPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [study, setStudy] = useState<StudyData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch study data
  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const response = await fetch(`/api/participate/${resolvedParams.slug}`);
        
        if (!response.ok) {
          const error = await response.json();
          if (response.status === 404) {
            setErrorMessage('Study not found. Please check the link and try again.');
          } else if (response.status === 403) {
            setErrorMessage('This study is not currently accepting responses.');
          } else {
            setErrorMessage(error.error || 'Failed to load study');
          }
          setStatus('error');
          return;
        }

        const data = await response.json();
        setStudy(data);
        setStatus('intro');
      } catch (error) {
        console.error('Error fetching study:', error);
        setErrorMessage('Failed to load study. Please try again later.');
        setStatus('error');
      }
    };

    fetchStudy();
  }, [resolvedParams.slug]);

  // Start session
  const startSession = async () => {
    if (!study) return;

    try {
      const response = await fetch(`/api/participate/${resolvedParams.slug}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const sessionData = await response.json();
      setSession(sessionData);
      setStatus('sorting');
    } catch (error) {
      console.error('Error starting session:', error);
      setErrorMessage('Failed to start session. Please try again.');
      setStatus('error');
    }
  };

  // Handle sorting completion
  const handleComplete = useCallback(async (placements: Array<{
    cardId: string;
    categoryId: string;
    categoryName: string;
    position: number;
  }>, createdCategories?: Array<{ id: string; name: string }>) => {
    if (!session) return;

    try {
      // Save final placements
      await fetch(`/api/sessions/${session.sessionId}/placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placements,
          createdCategories,
        }),
      });

      // Mark session as complete
      await fetch(`/api/sessions/${session.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      setStatus('completed');
    } catch (error) {
      console.error('Error completing session:', error);
      // Don't show error - data may have been saved
      setStatus('completed');
    }
  }, [session]);

  // Render loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-foreground">Loading study...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render intro/welcome screen
  if (status === 'intro' && study) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">{study.name}</h1>
          
          {study.description && (
            <p className="text-lg text-muted-foreground mb-6">{study.description}</p>
          )}

          <div className="rounded-xl border border-border bg-card p-6 mb-6 text-left">
            <h2 className="font-semibold text-foreground mb-3">How it works</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <span>You&apos;ll see {study.cards.length} cards to organize</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <span>
                  {study.mode === 'OPEN' 
                    ? 'Create categories that make sense to you and sort cards into them'
                    : `Sort cards into the ${study.categories.length} provided categories`}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <span>There are no right or wrong answers - organize however feels natural</span>
              </li>
            </ul>
          </div>

          {study.instructions && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4 mb-6 text-left">
              <p className="text-sm text-foreground">{study.instructions}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button size="lg" onClick={startSession} className="w-full sm:w-auto">
              Start Sorting
            </Button>
            <p className="text-xs text-muted-foreground">
              Your responses are anonymous. Takes about 5-10 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render sorting interface
  if (status === 'sorting' && study && session) {
    return (
      <ParticipantSortingInterface 
        study={study}
        session={session}
        onComplete={handleComplete}
      />
    );
  }

  // Render completion screen
  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Thank you!</h1>
          <p className="text-muted-foreground mb-6">
            {study?.thankYouMessage || 'Your responses have been recorded. You can close this window.'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// Participant sorting interface wrapper
function ParticipantSortingInterface({
  study,
  session,
  onComplete,
}: {
  study: StudyData;
  session: SessionData;
  onComplete: (placements: Array<{
    cardId: string;
    categoryId: string;
    categoryName: string;
    position: number;
  }>, createdCategories?: Array<{ id: string; name: string }>) => void;
}) {
  // Convert study data to format expected by CardSortInterface
  const initialCards = study.cards;
  const initialCategories = study.mode === 'CLOSED' 
    ? study.categories.map(c => ({ id: c.id, name: c.name }))
    : undefined;

  const handleComplete = () => {
    // Get current state from store
    const state = useCardSortStore.getState();
    
    // Build placements array from all categories
    const placements: Array<{
      cardId: string;
      categoryId: string;
      categoryName: string;
      position: number;
    }> = [];
    
    state.categories.forEach((category: { id: string; name: string; cardIds: string[] }) => {
      category.cardIds.forEach((cardId: string, position: number) => {
        placements.push({
          cardId,
          categoryId: category.id,
          categoryName: category.name,
          position,
        });
      });
    });

    // Get created categories for open sorting
    const createdCategories = study.mode === 'OPEN'
      ? state.categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      : undefined;

    onComplete(placements, createdCategories);
  };

  return (
    <div className="min-h-screen bg-background">
      <CardSortInterface
        initialCards={initialCards}
        initialMode={study.mode === 'OPEN' ? 'open' : 'closed'}
        initialCategories={initialCategories}
      />
      
      {/* Floating complete button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleComplete}
          className="shadow-lg"
        >
          Complete Sorting
        </Button>
      </div>
    </div>
  );
}
