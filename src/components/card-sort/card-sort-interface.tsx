'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  Announcements,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Undo2, Plus, RotateCcw, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Card, 
  SortingMode, 
  UNSORTED_CONTAINER_ID, 
  SAMPLE_CARDS, 
  SAMPLE_CLOSED_CATEGORIES 
} from '@/types';
import { useCardSortStore } from '@/store/card-sort-store';
import { CardTray } from './card-tray';
import { DroppableCategory } from './droppable-category';
import { DraggableCardOverlay } from './draggable-card';
import { AccessibilityAnnouncer } from './accessibility-announcer';
import { ScreenReaderInstructions } from './screen-reader-instructions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CardSortInterfaceProps {
  initialCards?: Card[];
  initialMode?: SortingMode;
  initialCategories?: { id: string; name: string }[];
}

export const CardSortInterface: React.FC<CardSortInterfaceProps> = ({
  initialCards = SAMPLE_CARDS,
  initialMode = 'open',
  initialCategories,
}) => {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    cards,
    categories,
    mode,
    initializeCards,
    initializeCategories,
    setMode,
    moveCard,
    addCategory,
    undo,
    reset,
    actionHistory,
    announce,
    getCard,
    getContainerName,
  } = useCardSortStore();

  // Initialize data on mount
  useEffect(() => {
    initializeCards(initialCards);
    setMode(initialMode);
    
    if (initialMode === 'closed' && initialCategories) {
      initializeCategories(
        initialCategories.map((cat) => ({ ...cat, cardIds: [] }))
      );
    } else if (initialMode === 'closed') {
      initializeCategories(
        SAMPLE_CLOSED_CATEGORIES.map((cat) => ({ ...cat, cardIds: [] }))
      );
    }
    
    // Announce ready state
    setTimeout(() => {
      announce(`Card sorting activity loaded. ${initialCards.length} cards to sort. ${initialMode === 'open' ? 'You can create your own categories.' : 'Categories have been pre-defined.'} Press Tab to navigate.`);
    }, 500);
  }, []);

  // Dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Configure sensors with keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Accessibility announcements for dnd-kit
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const card = getCard(active.id as string);
      if (card) {
        return `Picked up card "${card.label}". Use arrow keys to move, Space or Enter to drop, Escape to cancel.`;
      }
      return '';
    },
    onDragOver: ({ active, over }) => {
      if (!over) return '';
      const card = getCard(active.id as string);
      const containerName = getContainerName(over.id as string);
      if (card) {
        return `Card "${card.label}" is over ${containerName}.`;
      }
      return '';
    },
    onDragEnd: ({ active, over }) => {
      if (!over) {
        const card = getCard(active.id as string);
        return card ? `Dropped card "${card.label}". No changes made.` : '';
      }
      // The actual move announcement is handled in the store
      return '';
    },
    onDragCancel: ({ active }) => {
      const card = getCard(active.id as string);
      return card ? `Cancelled dragging "${card.label}". Returned to original position.` : '';
    },
  };

  // Handle drag events
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = getCard(active.id as string);
    setActiveCard(card || null);
    
    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, [getCard]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveCard(null);

    if (!over) {
      // Restore focus after cancelled drag
      setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get source container
    const sourceContainer = active.data.current?.containerId as string;
    
    // Determine target container
    let targetContainer: string;
    if (over.data.current?.type === 'category') {
      targetContainer = overId;
    } else if (over.data.current?.type === 'tray') {
      targetContainer = UNSORTED_CONTAINER_ID;
    } else if (over.data.current?.type === 'card') {
      targetContainer = over.data.current.containerId as string;
    } else {
      targetContainer = sourceContainer;
    }

    // Only move if source and target are different
    if (sourceContainer !== targetContainer) {
      moveCard(activeId, sourceContainer, targetContainer);
    }

    // Restore focus to the moved card
    setTimeout(() => {
      const movedCard = document.querySelector(`[data-card-id="${activeId}"]`) as HTMLElement;
      if (movedCard) {
        movedCard.focus();
      } else {
        previousFocusRef.current?.focus();
      }
    }, 100);
  }, [moveCard]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Could add visual feedback here if needed
  }, []);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleUndo = () => {
    undo();
    // Focus the undo button to confirm action
  };

  const handleReset = () => {
    reset();
  };

  // Check if reduced motion is preferred
  const prefersReducedMotion = 
    typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: 'To pick up a draggable card, press Space or Enter. While dragging, use the arrow keys to move the card. Press Space or Enter again to drop the card, or Escape to cancel.',
          },
        }}
      >
        {/* Accessibility live regions */}
        <AccessibilityAnnouncer />

        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Card Sorting</h1>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'open' ? 'Open Sort: Create your own categories' : 'Closed Sort: Pre-defined categories'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Dark mode toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                      >
                        {isDarkMode ? (
                          <Sun className="h-4 w-4" />
                        ) : (
                          <Moon className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDarkMode ? 'Light mode' : 'Dark mode'}
                    </TooltipContent>
                  </Tooltip>

                  {/* Undo button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUndo}
                        disabled={actionHistory.length === 0}
                        className="gap-2"
                        aria-label={`Undo last action. ${actionHistory.length} actions to undo.`}
                      >
                        <Undo2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Undo</span>
                        {actionHistory.length > 0 && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                            {actionHistory.length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo last move (Ctrl+Z)</TooltipContent>
                  </Tooltip>

                  {/* Reset button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="gap-2"
                        aria-label="Reset all cards to unsorted"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Reset</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset all cards to unsorted</TooltipContent>
                  </Tooltip>

                  {/* Create category (open mode only) */}
                  {mode === 'open' && (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">New Category</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Category</DialogTitle>
                          <DialogDescription>
                            Enter a name for your new category. You can rename or delete it later.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Category name..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateCategory();
                              }
                            }}
                            autoFocus
                            aria-label="Category name"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                            Create
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-6">
            {/* Screen Reader Instructions */}
            <ScreenReaderInstructions />

            {/* Sorting Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Card Tray */}
              <aside className="lg:col-span-4 xl:col-span-3">
                <div className="sticky top-24">
                  <CardTray />
                </div>
              </aside>

              {/* Categories */}
              <section 
                className="lg:col-span-8 xl:col-span-9"
                aria-label="Categories"
              >
                {categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                    <Plus className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">No categories yet</h2>
                    <p className="text-muted-foreground mb-4">
                      {mode === 'open' 
                        ? 'Create your first category to start sorting cards.'
                        : 'Waiting for categories to be loaded...'}
                    </p>
                    {mode === 'open' && (
                      <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Category
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <DroppableCategory
                        key={category.id}
                        category={category}
                        isEditable={mode === 'open'}
                      />
                    ))}

                    {/* Add category placeholder (open mode) */}
                    {mode === 'open' && (
                      <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed',
                          'border-muted-foreground/25 p-8 text-center',
                          'transition-colors hover:border-primary hover:bg-primary/5',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          'min-h-[200px]'
                        )}
                        aria-label="Create new category"
                      >
                        <Plus className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Add Category
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* Drag Overlay */}
          <DragOverlay
            dropAnimation={prefersReducedMotion ? null : undefined}
          >
            {activeCard && <DraggableCardOverlay card={activeCard} />}
          </DragOverlay>
        </div>
      </DndContext>
    </TooltipProvider>
  );
};
