'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category } from '@/types';
import { useCardSortStore } from '@/store/card-sort-store';
import { DraggableCard } from './draggable-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DroppableCategoryProps {
  category: Category;
  isEditable?: boolean;
}

export const DroppableCategory: React.FC<DroppableCategoryProps> = ({
  category,
  isEditable = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  
  const { 
    getCardsByContainer, 
    renameCategory, 
    removeCategory, 
    announce,
    mode 
  } = useCardSortStore();

  const { setNodeRef, isOver, active } = useDroppable({
    id: category.id,
    data: {
      type: 'category',
      category,
    },
  });

  const cards = getCardsByContainer(category.id);
  const canEdit = isEditable || (mode === 'open' && category.isUserCreated);

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== category.name) {
      renameCategory(category.id, editName.trim());
    } else {
      setEditName(category.name);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(category.name);
    setIsEditing(false);
  };

  const handleDelete = () => {
    removeCategory(category.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Check if the dragged item is a card
  const isCardBeingDragged = active?.data?.current?.type === 'card';

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        className={cn(
          // Base styles
          'flex flex-col rounded-xl border-2 bg-card/50 backdrop-blur-sm transition-all duration-200',
          // Minimum height
          'min-h-[200px]',
          // Default border
          'border-border',
          // Drop target styles
          isOver && isCardBeingDragged && [
            'border-primary border-dashed bg-primary/5 shadow-lg',
            // Scale slightly to indicate drop zone
            'scale-[1.02]',
          ],
          // High contrast mode
          'forced-colors:border-[CanvasText]',
          isOver && 'forced-colors:border-[Highlight] forced-colors:border-4'
        )}
        role="region"
        aria-label={`Category: ${category.name}. Contains ${cards.length} cards.`}
        aria-dropeffect={isCardBeingDragged ? 'move' : 'none'}
      >
        {/* Category Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
          {isEditing ? (
            <div className="flex flex-grow items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm font-semibold"
                autoFocus
                aria-label="Category name"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveEdit}
                className="h-8 w-8 p-0"
                aria-label="Save category name"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="h-8 w-8 p-0"
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                <h3 className="font-semibold text-foreground truncate">
                  {category.name}
                </h3>
                <span 
                  className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground flex-shrink-0"
                  aria-label={`${cards.length} cards`}
                >
                  {cards.length}
                </span>
              </div>
              
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                        className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                        aria-label={`Rename category "${category.name}"`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rename</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDelete}
                        className="h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
                        aria-label={`Delete category "${category.name}". Cards will be returned to unsorted tray.`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete (cards return to unsorted)</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cards Container */}
        <div className="flex-grow p-3">
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div 
              className="flex flex-col gap-2"
              role="list"
              aria-label={`Cards in ${category.name}`}
            >
              {cards.length === 0 ? (
                <div 
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center',
                    'border-muted-foreground/25 text-muted-foreground',
                    isOver && isCardBeingDragged && 'border-primary text-primary bg-primary/5'
                  )}
                  role="listitem"
                >
                  <Plus className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm font-medium">Drop cards here</p>
                  <p className="text-xs mt-1 opacity-75">
                    or use the card menu to move
                  </p>
                </div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} role="listitem">
                    <DraggableCard card={card} containerId={category.id} />
                  </div>
                ))
              )}
            </div>
          </SortableContext>
        </div>

        {/* Drop indicator at bottom when dragging over */}
        {isOver && isCardBeingDragged && cards.length > 0 && (
          <div 
            className="mx-3 mb-3 h-1 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </TooltipProvider>
  );
};
