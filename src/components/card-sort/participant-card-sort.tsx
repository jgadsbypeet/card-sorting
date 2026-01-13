'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Announcements,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Undo2, Plus, RotateCcw, Check, Inbox, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DraggableCard, DraggableCardOverlay } from './draggable-card';
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
} from '@/components/ui/dialog';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

interface Card {
  id: string;
  label: string;
  description?: string | null;
}

interface Category {
  id: string;
  name: string;
  cardIds: string[];
}

interface StudyData {
  id: string;
  name: string;
  description: string | null;
  mode: 'OPEN' | 'CLOSED';
  instructions: string | null;
  settings: {
    allowUndo: boolean;
    showProgress: boolean;
    requireAllCardsSorted: boolean;
    randomizeCards: boolean;
  };
  cards: Card[];
  categories: { id: string; name: string }[];
}

interface ParticipantCardSortProps {
  study: StudyData;
  sessionId: string | null;
  onSavePlacement: (cardId: string, categoryId: string | null, categoryName: string, position: number) => Promise<void>;
  onCreateCategory: (name: string) => Promise<string | null>;
  onComplete: (totalMoves: number, undoCount: number) => Promise<void>;
}

const UNSORTED_ID = 'unsorted-tray';

export const ParticipantCardSort: React.FC<ParticipantCardSortProps> = ({
  study,
  sessionId,
  onSavePlacement,
  onCreateCategory,
  onComplete,
}) => {
  // State
  const [cards] = useState<Card[]>(() => {
    const cardList = [...study.cards];
    if (study.settings.randomizeCards) {
      cardList.sort(() => Math.random() - 0.5);
    }
    return cardList;
  });
  
  const [unsortedCardIds, setUnsortedCardIds] = useState<string[]>(cards.map(c => c.id));
  const [categories, setCategories] = useState<Category[]>(
    study.categories.map(c => ({ ...c, cardIds: [] }))
  );
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [lastAnnouncement, setLastAnnouncement] = useState('');
  const [moveHistory, setMoveHistory] = useState<Array<{
    cardId: string;
    fromId: string;
    toId: string;
  }>>([]);
  const [totalMoves, setTotalMoves] = useState(0);
  const [undoCount, setUndoCount] = useState(0);

  const announce = (message: string) => setLastAnnouncement(message);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Get container name
  const getContainerName = (containerId: string): string => {
    if (containerId === UNSORTED_ID) return 'Unsorted Tray';
    return categories.find(c => c.id === containerId)?.name || 'Unknown';
  };

  // Announcements
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const card = cards.find(c => c.id === active.id);
      return card ? `Picked up "${card.label}". Use arrow keys to move.` : '';
    },
    onDragOver: ({ over }) => {
      if (!over) return '';
      return `Over ${getContainerName(over.id as string)}.`;
    },
    onDragEnd: () => '',
    onDragCancel: ({ active }) => {
      const card = cards.find(c => c.id === active.id);
      return card ? `Cancelled dragging "${card.label}".` : '';
    },
  };

  // Move card between containers
  const moveCard = useCallback(async (
    cardId: string,
    fromContainerId: string,
    toContainerId: string
  ) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Update local state
    setUnsortedCardIds(prev => {
      if (fromContainerId === UNSORTED_ID) {
        return prev.filter(id => id !== cardId);
      }
      if (toContainerId === UNSORTED_ID) {
        return [...prev, cardId];
      }
      return prev;
    });

    setCategories(prev => prev.map(cat => {
      if (cat.id === fromContainerId) {
        return { ...cat, cardIds: cat.cardIds.filter(id => id !== cardId) };
      }
      if (cat.id === toContainerId) {
        return { ...cat, cardIds: [...cat.cardIds, cardId] };
      }
      return cat;
    }));

    // Track history for undo
    setMoveHistory(prev => [...prev, { cardId, fromId: fromContainerId, toId: toContainerId }]);
    setTotalMoves(prev => prev + 1);

    // Save to API
    if (toContainerId !== UNSORTED_ID) {
      const category = categories.find(c => c.id === toContainerId);
      if (category) {
        await onSavePlacement(cardId, toContainerId, category.name, category.cardIds.length);
      }
    }

    // Announce
    announce(`"${card.label}" moved to ${getContainerName(toContainerId)}.`);
  }, [cards, categories, onSavePlacement]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const sourceId = (active.data.current as { containerId?: string })?.containerId || UNSORTED_ID;
    
    let targetId: string;
    if (over.data.current?.type === 'category') {
      targetId = over.id as string;
    } else if (over.data.current?.type === 'tray') {
      targetId = UNSORTED_ID;
    } else {
      targetId = (over.data.current as { containerId?: string })?.containerId || sourceId;
    }

    if (sourceId !== targetId) {
      moveCard(cardId, sourceId, targetId);
    }
  }, [moveCard]);

  // Undo
  const handleUndo = useCallback(() => {
    const lastMove = moveHistory[moveHistory.length - 1];
    if (!lastMove) return;

    const { cardId, fromId, toId } = lastMove;
    
    // Reverse the move
    setUnsortedCardIds(prev => {
      if (toId === UNSORTED_ID) {
        return prev.filter(id => id !== cardId);
      }
      if (fromId === UNSORTED_ID) {
        return [...prev, cardId];
      }
      return prev;
    });

    setCategories(prev => prev.map(cat => {
      if (cat.id === toId) {
        return { ...cat, cardIds: cat.cardIds.filter(id => id !== cardId) };
      }
      if (cat.id === fromId) {
        return { ...cat, cardIds: [...cat.cardIds, cardId] };
      }
      return cat;
    }));

    setMoveHistory(prev => prev.slice(0, -1));
    setUndoCount(prev => prev + 1);

    const card = cards.find(c => c.id === cardId);
    announce(`Undone: "${card?.label}" returned to ${getContainerName(fromId)}.`);
  }, [moveHistory, cards]);

  // Create category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const categoryId = await onCreateCategory(newCategoryName.trim());
    if (categoryId) {
      setCategories(prev => [...prev, {
        id: categoryId,
        name: newCategoryName.trim(),
        cardIds: [],
      }]);
      announce(`Category "${newCategoryName}" created.`);
    }
    setNewCategoryName('');
    setIsCreateDialogOpen(false);
  };

  // Check completion
  const sortedCount = cards.length - unsortedCardIds.length;
  const isComplete = unsortedCardIds.length === 0;

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveCard(cards.find(c => c.id === e.active.id) || null)}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements }}
      >
        <AccessibilityAnnouncer />

        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{study.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {study.mode === 'OPEN' ? 'Create your own categories' : 'Sort into pre-defined categories'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {study.settings.allowUndo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUndo}
                      disabled={moveHistory.length === 0}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      Undo
                    </Button>
                  )}

                  {study.mode === 'OPEN' && (
                    <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Category
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => onComplete(totalMoves, undoCount)}
                    disabled={study.settings.requireAllCardsSorted && !isComplete}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Submit
                  </Button>
                </div>
              </div>

              {/* Progress */}
              {study.settings.showProgress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{sortedCount} of {cards.length} cards sorted</span>
                    <span className="text-muted-foreground">{Math.round((sortedCount / cards.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(sortedCount / cards.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-6">
            {/* Instructions */}
            {study.instructions && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-foreground">{study.instructions}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Unsorted Tray */}
              <aside className="lg:col-span-4 xl:col-span-3">
                <UnsortedTray
                  cards={cards.filter(c => unsortedCardIds.includes(c.id))}
                  totalCards={cards.length}
                />
              </aside>

              {/* Categories */}
              <section className="lg:col-span-8 xl:col-span-9">
                {categories.length === 0 ? (
                  <EmptyCategories 
                    isOpen={study.mode === 'OPEN'}
                    onCreateClick={() => setIsCreateDialogOpen(true)}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {categories.map(category => (
                      <CategoryDropZone
                        key={category.id}
                        category={category}
                        cards={cards.filter(c => category.cardIds.includes(c.id))}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* Create Category Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Enter a name for your new category.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                autoFocus
              />
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

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard && <DraggableCardOverlay card={activeCard} />}
          </DragOverlay>
        </div>
      </DndContext>
    </TooltipProvider>
  );
};

// Unsorted Tray Component
const UnsortedTray: React.FC<{ cards: Card[]; totalCards: number }> = ({ cards, totalCards }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: UNSORTED_ID,
    data: { type: 'tray' },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'sticky top-24 rounded-xl border-2 bg-muted/30 min-h-[300px] transition-all',
        isOver ? 'border-primary border-dashed' : 'border-border'
      )}
    >
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Unsorted Cards</h2>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            cards.length > 0 ? 'bg-amber-500/20 text-amber-700' : 'bg-emerald-500/20 text-emerald-700'
          )}>
            {cards.length}
          </span>
        </div>
      </div>
      <div className="p-3">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {cards.length === 0 ? (
              <div className="text-center py-8 text-emerald-600">
                <Check className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">All cards sorted!</p>
              </div>
            ) : (
              cards.map(card => (
                <DraggableCard key={card.id} card={card} containerId={UNSORTED_ID} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

// Category Drop Zone Component  
const CategoryDropZone: React.FC<{ category: Category; cards: Card[] }> = ({ category, cards }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
    data: { type: 'category', category },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border-2 bg-card/50 min-h-[200px] transition-all',
        isOver ? 'border-primary border-dashed scale-[1.02]' : 'border-border'
      )}
    >
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold truncate">{category.name}</h3>
          <span className="text-xs text-muted-foreground">({cards.length})</span>
        </div>
      </div>
      <div className="p-3">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 min-h-[100px]">
            {cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Plus className="h-6 w-6 mb-1 opacity-50" />
                <p className="text-sm">Drop cards here</p>
              </div>
            ) : (
              cards.map(card => (
                <DraggableCard key={card.id} card={card} containerId={category.id} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

// Empty Categories State
const EmptyCategories: React.FC<{ isOpen: boolean; onCreateClick: () => void }> = ({ isOpen, onCreateClick }) => (
  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
    <Plus className="h-12 w-12 text-muted-foreground/50 mb-4" />
    <h2 className="text-xl font-semibold mb-2">No categories yet</h2>
    <p className="text-muted-foreground mb-4">
      {isOpen ? 'Create your first category to start sorting.' : 'Waiting for categories...'}
    </p>
    {isOpen && (
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="h-4 w-4" />
        Create First Category
      </Button>
    )}
  </div>
);
