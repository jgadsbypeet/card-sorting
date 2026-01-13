'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Eye,
  Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CardInput {
  id: string;
  label: string;
  description: string;
}

interface CategoryInput {
  id: string;
  name: string;
}

export default function NewStudyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [instructions, setInstructions] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  
  // Settings
  const [allowUndo, setAllowUndo] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [randomizeCards, setRandomizeCards] = useState(true);
  const [requireAllCardsSorted, setRequireAllCardsSorted] = useState(false);
  
  // Cards
  const [cards, setCards] = useState<CardInput[]>([
    { id: '1', label: '', description: '' },
    { id: '2', label: '', description: '' },
    { id: '3', label: '', description: '' },
  ]);
  
  // Categories (for closed sorting)
  const [categories, setCategories] = useState<CategoryInput[]>([
    { id: '1', name: '' },
    { id: '2', name: '' },
  ]);

  const addCard = () => {
    setCards([...cards, { id: Date.now().toString(), label: '', description: '' }]);
  };

  const removeCard = (id: string) => {
    if (cards.length > 2) {
      setCards(cards.filter(c => c.id !== id));
    }
  };

  const updateCard = (id: string, field: 'label' | 'description', value: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCategory = () => {
    setCategories([...categories, { id: Date.now().toString(), name: '' }]);
  };

  const removeCategory = (id: string) => {
    if (categories.length > 2) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const updateCategory = (id: string, name: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleSubmit = async (status: 'DRAFT' | 'ACTIVE') => {
    // Validate
    if (!name.trim()) {
      alert('Study name is required');
      return;
    }

    const validCards = cards.filter(c => c.label.trim());
    if (validCards.length < 2) {
      alert('At least 2 cards are required');
      return;
    }

    if (mode === 'CLOSED') {
      const validCategories = categories.filter(c => c.name.trim());
      if (validCategories.length < 2) {
        alert('At least 2 categories are required for closed sorting');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          mode,
          cards: validCards.map(c => ({
            label: c.label.trim(),
            description: c.description.trim() || null,
          })),
          categories: mode === 'CLOSED' 
            ? categories.filter(c => c.name.trim()).map(c => ({ name: c.name.trim() }))
            : [],
          settings: {
            allowUndo,
            showProgress,
            randomizeCards,
            requireAllCardsSorted,
            instructions: instructions.trim() || null,
            thankYouMessage: thankYouMessage.trim() || null,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create study');
      }

      const study = await response.json();

      // Update status if launching immediately
      if (status === 'ACTIVE') {
        await fetch(`/api/studies/${study.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      }

      router.push('/admin/studies');
    } catch (error) {
      console.error('Error creating study:', error);
      alert(error instanceof Error ? error.message : 'Failed to create study');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/studies">
            <Button variant="ghost" size="icon" aria-label="Back to studies">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Study</h1>
            <p className="text-muted-foreground">Set up a new card sorting study</p>
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {/* Basic Info */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Study Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Feature Organization"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal description for your reference"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </section>

          {/* Sorting Mode */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sorting Mode</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('OPEN')}
                className={cn(
                  'rounded-lg border-2 p-4 text-left transition-all',
                  mode === 'OPEN'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <p className="font-semibold text-foreground">Open Sorting</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Participants create their own categories
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('CLOSED')}
                className={cn(
                  'rounded-lg border-2 p-4 text-left transition-all',
                  mode === 'CLOSED'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <p className="font-semibold text-foreground">Closed Sorting</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pre-defined categories to sort into
                </p>
              </button>
            </div>
          </section>

          {/* Cards */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cards</h2>
                <p className="text-sm text-muted-foreground">Items for participants to sort</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCard} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Card
              </Button>
            </div>

            <div className="space-y-3">
              {cards.map((card, index) => (
                <div 
                  key={card.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex-shrink-0 pt-2.5 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-grow grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`card-${card.id}-label`} className="text-xs">
                        Label *
                      </Label>
                      <Input
                        id={`card-${card.id}-label`}
                        value={card.label}
                        onChange={(e) => updateCard(card.id, 'label', e.target.value)}
                        placeholder={`Card ${index + 1}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`card-${card.id}-desc`} className="text-xs">
                        Description (optional)
                      </Label>
                      <Input
                        id={`card-${card.id}-desc`}
                        value={card.description}
                        onChange={(e) => updateCard(card.id, 'description', e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCard(card.id)}
                        disabled={cards.length <= 2}
                        className="flex-shrink-0"
                        aria-label="Remove card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove card</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              {cards.filter(c => c.label.trim()).length} cards defined
            </p>
          </section>

          {/* Categories (Closed Mode) */}
          {mode === 'CLOSED' && (
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Categories</h2>
                  <p className="text-sm text-muted-foreground">Pre-defined categories for participants</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCategory} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-3">
                {categories.map((category, index) => (
                  <div 
                    key={category.id}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <Input
                      value={category.name}
                      onChange={(e) => updateCategory(category.id, e.target.value)}
                      placeholder={`Category ${index + 1}`}
                      className="flex-grow"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategory(category.id)}
                      disabled={categories.length <= 2}
                      aria-label="Remove category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Settings */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowUndo}
                  onChange={(e) => setAllowUndo(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm text-foreground">Allow undo (recommended for accessibility)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm text-foreground">Show progress indicator</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomizeCards}
                  onChange={(e) => setRandomizeCards(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm text-foreground">Randomize card order per participant</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireAllCardsSorted}
                  onChange={(e) => setRequireAllCardsSorted(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm text-foreground">Require all cards to be sorted before completion</span>
              </label>
            </div>
          </section>

          {/* Instructions */}
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Participant Messages</h2>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (optional)</Label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Custom instructions shown to participants at the start"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thankYou">Thank You Message (optional)</Label>
              <textarea
                id="thankYou"
                value={thankYouMessage}
                onChange={(e) => setThankYouMessage(e.target.value)}
                placeholder="Message shown after completion"
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
            <Link href="/admin/studies">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit('DRAFT')}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('ACTIVE')}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Save & Launch
            </Button>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
