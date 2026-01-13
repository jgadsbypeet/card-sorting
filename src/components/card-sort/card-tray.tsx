'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Inbox, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNSORTED_CONTAINER_ID } from '@/types';
import { useCardSortStore } from '@/store/card-sort-store';
import { DraggableCard } from './draggable-card';

export const CardTray: React.FC = () => {
  const { getCardsByContainer, getSortedCount, cards } = useCardSortStore();
  
  const { setNodeRef, isOver, active } = useDroppable({
    id: UNSORTED_CONTAINER_ID,
    data: {
      type: 'tray',
    },
  });

  const unsortedCards = getCardsByContainer(UNSORTED_CONTAINER_ID);
  const sortedCount = getSortedCount();
  const totalCount = cards.length;
  const progress = totalCount > 0 ? (sortedCount / totalCount) * 100 : 0;

  const isCardBeingDragged = active?.data?.current?.type === 'card';
  const isFromTray = active?.data?.current?.containerId === UNSORTED_CONTAINER_ID;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Base styles
        'flex flex-col rounded-xl border-2 bg-muted/30 backdrop-blur-sm transition-all duration-200',
        // Height
        'min-h-[300px]',
        // Default border
        'border-border',
        // Drop target styles (only when card is from a category)
        isOver && isCardBeingDragged && !isFromTray && [
          'border-primary border-dashed shadow-lg',
        ],
        // High contrast mode
        'forced-colors:border-[CanvasText]',
        isOver && !isFromTray && 'forced-colors:border-[Highlight] forced-colors:border-4'
      )}
      role="region"
      aria-label={`Unsorted cards tray. Contains ${unsortedCards.length} unsorted cards out of ${totalCount} total.`}
      aria-dropeffect={isCardBeingDragged && !isFromTray ? 'move' : 'none'}
    >
      {/* Tray Header */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-semibold text-foreground">
              Unsorted Cards
            </h2>
            <span 
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                unsortedCards.length > 0 
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' 
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              )}
              aria-label={`${unsortedCards.length} cards remaining`}
            >
              {unsortedCards.length}
            </span>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {sortedCount}/{totalCount} sorted
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2">
          <div 
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={sortedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`Sorting progress: ${sortedCount} of ${totalCount} cards sorted`}
          >
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                progress === 100 ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-grow overflow-y-auto p-3">
        <SortableContext
          items={unsortedCards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            className="flex flex-col gap-2"
            role="list"
            aria-label="Unsorted cards"
          >
            {unsortedCards.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
                role="listitem"
              >
                <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500" aria-hidden="true" />
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  All cards sorted!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Great job organizing everything.
                </p>
              </div>
            ) : (
              unsortedCards.map((card) => (
                <div key={card.id} role="listitem">
                  <DraggableCard card={card} containerId={UNSORTED_CONTAINER_ID} />
                </div>
              ))
            )}
          </div>
        </SortableContext>
      </div>

      {/* Visual indicator for receiving drops */}
      {isOver && isCardBeingDragged && !isFromTray && (
        <div className="px-3 pb-3">
          <div 
            className="h-1 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};
