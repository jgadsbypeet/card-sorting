'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParticipantCardSort } from '@/components/card-sort/participant-card-sort';

interface StudyData {
  id: string;
  name: string;
  description: string | null;
  mode: 'OPEN' | 'CLOSED';
  instructions: string | null;
  thankYouMessage: string | null;
  settings: {
    allowUndo: boolean;
    showProgress: boolean;
    requireAllCardsSorted: boolean;
    randomizeCards: boolean;
    timeLimitMinutes: number | null;
  };
  cards: {
    id: string;
    label: string;
    description: string | null;
  }[];
  categories: {
    id: string;
    name: string;
  }[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SortPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [study, setStudy] = useState<StudyData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch study data
  useEffect(() => {
    const fetchStudy = async () => {
      try {
        const res = await fetch(`/api/studies/by-slug/${slug}`);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Study not found');
        }
        
        const data = await res.json();
        setStudy(data);
        
        // Create session
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studyId: data.id,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            screenWidth: typeof window !== 'undefined' ? window.innerWidth : null,
            screenHeight: typeof window !== 'undefined' ? window.innerHeight : null,
          }),
        });
        
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          setSessionId(session.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load study');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudy();
  }, [slug]);

  // Save placement to API
  const savePlacement = useCallback(async (
    cardId: string,
    categoryId: string | null,
    categoryName: string,
    position: number
  ) => {
    if (!sessionId) return;
    
    try {
      await fetch(`/api/sessions/${sessionId}/placements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          categoryId,
          categoryName,
          position,
        }),
      });
    } catch (err) {
      console.error('Failed to save placement:', err);
    }
  }, [sessionId]);

  // Create category via API
  const createCategory = useCallback(async (name: string): Promise<string | null> => {
    if (!sessionId) return null;
    
    try {
      const res = await fetch(`/api/sessions/${sessionId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (res.ok) {
        const category = await res.json();
        return category.id;
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
    return null;
  }, [sessionId]);

  // Complete session
  const completeSession = useCallback(async (totalMoves: number, undoCount: number) => {
    if (!sessionId) return;
    
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          totalMoves,
          undoCount,
        }),
      });
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  }, [sessionId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-foreground">Loading study...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !study) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Unable to Load Study</h1>
          <p className="text-muted-foreground mb-6">{error || 'Study not found'}</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            {study.thankYouMessage || 'Your response has been recorded. Thank you for participating in this study.'}
          </p>
          <Button onClick={() => window.close()}>Close Window</Button>
        </div>
      </div>
    );
  }

  // Main sorting interface
  return (
    <ParticipantCardSort
      study={study}
      sessionId={sessionId}
      onSavePlacement={savePlacement}
      onCreateCategory={createCategory}
      onComplete={completeSession}
    />
  );
}
