'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCardSortStore } from '@/store/card-sort-store';
import { Button } from '@/components/ui/button';

/**
 * ScreenReaderInstructions
 * 
 * A comprehensive instruction block for screen reader users explaining
 * how to interact with the card sorting interface. This is placed at
 * the top of the interface and is always available.
 */
export const ScreenReaderInstructions: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mode, categories, getSortedCount, getUnsortedCount, cards } = useCardSortStore();

  return (
    <section 
      className="mb-6 rounded-xl border-2 border-blue-500/30 bg-blue-500/5"
      aria-labelledby="instructions-heading"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'rounded-xl transition-colors',
          'hover:bg-blue-500/10'
        )}
        aria-expanded={isExpanded}
        aria-controls="instructions-content"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 rounded-lg bg-blue-500/20 p-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h2 id="instructions-heading" className="font-semibold text-foreground">
              How to Use This Card Sorting Activity
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isExpanded ? 'Click to collapse instructions' : 'Click to expand keyboard and screen reader instructions'}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 text-muted-foreground" aria-hidden="true">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {/* Expandable content */}
      <div
        id="instructions-content"
        className={cn(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
        hidden={!isExpanded}
      >
        <div className="border-t border-blue-500/20 px-4 py-4 space-y-4">
          {/* Current Status */}
          <div className="rounded-lg bg-muted/50 p-3">
            <h3 className="font-medium text-sm text-foreground mb-2">Current Status</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Mode: {mode === 'open' ? 'Open Sorting (create your own categories)' : 'Closed Sorting (pre-defined categories)'}</li>
              <li>• Total cards: {cards.length}</li>
              <li>• Sorted: {getSortedCount()}</li>
              <li>• Remaining: {getUnsortedCount()}</li>
              <li>• Categories available: {categories.length}</li>
            </ul>
          </div>

          {/* Keyboard Instructions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-medium text-sm text-foreground">Keyboard Navigation</h3>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <kbd className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground min-w-[60px]">
                  Tab
                </kbd>
                <span className="text-muted-foreground">Move between cards and interactive elements</span>
              </div>
              
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <kbd className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground min-w-[60px]">
                  Space
                </kbd>
                <span className="text-muted-foreground">Pick up or drop a card (start/end drag)</span>
              </div>
              
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <kbd className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground min-w-[60px]">
                  Enter
                </kbd>
                <span className="text-muted-foreground">Alternative to Space for picking up/dropping</span>
              </div>
              
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <kbd className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground min-w-[60px]">
                  ↑ ↓ ← →
                </kbd>
                <span className="text-muted-foreground">Move a picked-up card between positions and containers</span>
              </div>
              
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                <kbd className="inline-flex items-center justify-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground min-w-[60px]">
                  Escape
                </kbd>
                <span className="text-muted-foreground">Cancel the current drag operation</span>
              </div>
              
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 bg-blue-500/10 border border-blue-500/20">
                <kbd className="inline-flex items-center justify-center rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 min-w-[60px]">
                  M
                </kbd>
                <span className="text-muted-foreground">
                  <strong>Alternative method:</strong> Opens a menu to move the card directly to a category without dragging
                </span>
              </div>
            </div>
          </div>

          {/* Screen Reader Tips */}
          <div>
            <h3 className="font-medium text-sm text-foreground mb-2">Screen Reader Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Each card will announce its name and current location when focused</li>
              <li>• After moving a card, you&apos;ll hear an announcement of its new position</li>
              <li>• Press <kbd className="px-1 bg-muted rounded">M</kbd> on any card to open a move menu - this is often easier than drag and drop</li>
              <li>• The Undo button at the top can reverse your last move</li>
              <li>• Categories show how many cards they contain in their heading</li>
            </ul>
          </div>

          {/* Task Description */}
          <div className="rounded-lg border border-border p-3">
            <h3 className="font-medium text-sm text-foreground mb-2">Your Task</h3>
            <p className="text-sm text-muted-foreground">
              {mode === 'open' ? (
                <>
                  Sort the cards into groups that make sense to you. You can create new categories 
                  by using the &quot;Create Category&quot; button, rename them, or delete them as needed. 
                  There are no right or wrong answers - organize the cards in whatever way feels natural.
                </>
              ) : (
                <>
                  Sort the cards into the pre-defined categories shown. Move each card from the 
                  &quot;Unsorted Cards&quot; tray into the category where you think it best belongs.
                  There are no right or wrong answers.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quick summary always visible for screen readers */}
      <div className="sr-only" aria-live="polite">
        Card sorting activity. {cards.length} cards total, {getUnsortedCount()} unsorted, {getSortedCount()} sorted. 
        {categories.length} categories available. 
        Press Tab to navigate to cards, Space or Enter to pick up, arrow keys to move, M for move menu.
      </div>
    </section>
  );
};
