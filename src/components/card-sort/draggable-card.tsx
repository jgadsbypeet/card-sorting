'use client';

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreVertical, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/types';
import { useCardSortStore } from '@/store/card-sort-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DraggableCardProps {
  card: Card;
  containerId: string;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export const DraggableCard = forwardRef<HTMLDivElement, DraggableCardProps>(
  ({ card, containerId, isDragging: externalIsDragging, isOverlay }, ref) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    
    const { categories, moveCard, getContainerName, announce } = useCardSortStore();
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: sortableIsDragging,
    } = useSortable({
      id: card.id,
      data: {
        type: 'card',
        card,
        containerId,
      },
    });

    const isDragging = externalIsDragging || sortableIsDragging;

    // Combine refs
    const combinedRef = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (cardRef) {
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Respect reduced motion preference
    const prefersReducedMotion = 
      typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
        : false;

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition: prefersReducedMotion ? 'none' : transition,
    };

    // Handle keyboard navigation for move menu
    const handleMoveToCategory = (categoryId: string) => {
      const categoryName = getContainerName(categoryId);
      moveCard(card.id, containerId, categoryId);
      setIsMenuOpen(false);
      
      // Return focus to the card after move
      setTimeout(() => {
        cardRef.current?.focus();
      }, 100);
    };

    const handleMoveToUnsorted = () => {
      moveCard(card.id, containerId, 'unsorted-tray');
      setIsMenuOpen(false);
      
      setTimeout(() => {
        cardRef.current?.focus();
      }, 100);
    };

    // Get available move destinations (exclude current container)
    const availableCategories = categories.filter((cat) => cat.id !== containerId);
    const canMoveToUnsorted = containerId !== 'unsorted-tray';

    return (
      <TooltipProvider>
        <div
          ref={combinedRef}
          style={style}
          className={cn(
            // Base styles
            'group relative flex items-center gap-3 rounded-lg border-2 bg-card p-4 shadow-sm',
            // Interactive states
            'cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            // Hover state
            'hover:border-primary/50 hover:shadow-md',
            // Active/dragging state - thick border + pattern for accessibility
            isDragging && [
              'cursor-grabbing border-primary border-dashed bg-primary/5 shadow-lg',
              // Add a distinctive pattern using gradient for low-vision users
              'bg-[linear-gradient(45deg,transparent_25%,var(--primary)_25%,var(--primary)_50%,transparent_50%,transparent_75%,var(--primary)_75%)] bg-[length:4px_4px] bg-opacity-10',
            ],
            // Overlay state
            isOverlay && 'shadow-2xl rotate-3 scale-105',
            // High contrast mode support
            'forced-colors:border-[CanvasText]',
            isDragging && 'forced-colors:border-[Highlight] forced-colors:border-4'
          )}
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-roledescription="draggable card"
          aria-label={`${card.label}. ${card.description || ''}. Press Space or Enter to pick up, arrow keys to move, or press M to open move menu.`}
          aria-describedby={`card-instructions-${card.id}`}
          onKeyDown={(e) => {
            // 'M' key opens the move menu as an accessible fallback
            if (e.key === 'm' || e.key === 'M') {
              e.preventDefault();
              setIsMenuOpen(true);
              announce(`Move menu opened for card "${card.label}". Use arrow keys to navigate options.`);
            }
          }}
        >
          {/* Drag Handle */}
          <div 
            className={cn(
              'flex-shrink-0 text-muted-foreground transition-colors',
              'group-hover:text-primary group-focus:text-primary',
              isDragging && 'text-primary'
            )}
            aria-hidden="true"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Card Content */}
          <div className="flex-grow min-w-0">
            <p className="font-medium text-foreground truncate">{card.label}</p>
            {card.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {card.description}
              </p>
            )}
          </div>

          {/* Status Indicator */}
          {containerId !== 'unsorted-tray' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex-shrink-0 rounded-full bg-emerald-500/20 p-1.5"
                  aria-label="Sorted"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sorted into: {getContainerName(containerId)}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Click-to-Move Menu (Accessible Fallback) */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
                  'transition-opacity',
                  isMenuOpen && 'opacity-100'
                )}
                aria-label={`Move "${card.label}" to a category`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Move to...
              </div>
              <DropdownMenuSeparator />
              
              {canMoveToUnsorted && (
                <>
                  <DropdownMenuItem
                    onSelect={handleMoveToUnsorted}
                    className="cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                      Unsorted Tray
                    </span>
                  </DropdownMenuItem>
                  {availableCategories.length > 0 && <DropdownMenuSeparator />}
                </>
              )}

              {availableCategories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onSelect={() => handleMoveToCategory(category.id)}
                  className="cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    {category.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({category.cardIds.length})
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}

              {availableCategories.length === 0 && !canMoveToUnsorted && (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No categories available
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden instructions for screen readers */}
          <span id={`card-instructions-${card.id}`} className="sr-only">
            Use Space or Enter to pick up this card, then use arrow keys to move it. 
            Press Space or Enter again to drop. 
            Press Escape to cancel. 
            Alternatively, press M to open a menu with move options.
          </span>
        </div>
      </TooltipProvider>
    );
  }
);

DraggableCard.displayName = 'DraggableCard';

// Overlay version for drag preview
export const DraggableCardOverlay: React.FC<{ card: Card }> = ({ card }) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 border-primary bg-card p-4 shadow-2xl',
        'rotate-3 scale-105',
        // High contrast mode
        'forced-colors:border-[Highlight] forced-colors:border-4'
      )}
      role="presentation"
      aria-hidden="true"
    >
      <GripVertical className="h-5 w-5 text-primary" />
      <div className="flex-grow min-w-0">
        <p className="font-medium text-foreground truncate">{card.label}</p>
        {card.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {card.description}
          </p>
        )}
      </div>
    </div>
  );
};
