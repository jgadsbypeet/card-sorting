'use client';

import React, { useState, useMemo } from 'react';
import { Table, Grid3X3, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimilarityMatrix as SimilarityMatrixType, SimilarityCell } from '@/types/results';
import { getSimilarityCells } from '@/lib/analysis';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SimilarityMatrixProps {
  data: SimilarityMatrixType;
}

type ViewMode = 'matrix' | 'table';
type SortBy = 'similarity' | 'cardA' | 'cardB';
type SortOrder = 'asc' | 'desc';

/**
 * Similarity Matrix Visualization
 * 
 * Displays how often pairs of cards were sorted into the same category.
 * Provides both a visual heatmap and an accessible table view.
 */
export const SimilarityMatrixView: React.FC<SimilarityMatrixProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [sortBy, setSortBy] = useState<SortBy>('similarity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const cells = useMemo(() => getSimilarityCells(data), [data]);

  const sortedCells = useMemo(() => {
    const sorted = [...cells].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'similarity':
          comparison = a.similarity - b.similarity;
          break;
        case 'cardA':
          comparison = a.cardA.label.localeCompare(b.cardA.label);
          break;
        case 'cardB':
          comparison = a.cardB.label.localeCompare(b.cardB.label);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [cells, sortBy, sortOrder]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Color scale for similarity values
  const getColorClass = (value: number): string => {
    if (value >= 0.8) return 'bg-emerald-500 dark:bg-emerald-600';
    if (value >= 0.6) return 'bg-emerald-400 dark:bg-emerald-500';
    if (value >= 0.4) return 'bg-amber-400 dark:bg-amber-500';
    if (value >= 0.2) return 'bg-orange-300 dark:bg-orange-400';
    return 'bg-slate-200 dark:bg-slate-700';
  };

  const getTextColorClass = (value: number): string => {
    if (value >= 0.6) return 'text-white';
    return 'text-foreground';
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Similarity Matrix</h3>
            <p className="text-sm text-muted-foreground">
              Shows how often card pairs were sorted together ({data.participantCount} participants)
            </p>
          </div>

          <div className="flex items-center gap-2" role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'matrix' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('matrix')}
              aria-pressed={viewMode === 'matrix'}
              className="gap-2"
            >
              <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              Matrix
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className="gap-2"
            >
              <Table className="h-4 w-4" aria-hidden="true" />
              Table
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div 
          className="flex items-center gap-4 text-sm"
          role="img"
          aria-label="Color legend: darker green indicates higher similarity"
        >
          <span className="text-muted-foreground">Similarity:</span>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-orange-300 dark:bg-orange-400" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-amber-400 dark:bg-amber-500" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">40%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-emerald-400 dark:bg-emerald-500" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-emerald-500 dark:bg-emerald-600" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">80%+</span>
          </div>
        </div>

        {/* Matrix View */}
        {viewMode === 'matrix' && (
          <div 
            className="overflow-x-auto rounded-lg border border-border"
            role="img"
            aria-label={`Similarity matrix showing ${data.cardLabels.length} cards. Use table view for screen reader accessible data.`}
          >
            <div className="min-w-max p-4">
              {/* Column headers */}
              <div className="flex">
                <div className="w-32 flex-shrink-0" /> {/* Empty corner */}
                {data.cardLabels.map((label, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-10 h-32 flex items-end justify-center pb-2"
                        aria-hidden="true"
                      >
                        <span 
                          className="text-xs text-muted-foreground whitespace-nowrap origin-bottom-left -rotate-45 translate-x-4"
                          style={{ maxWidth: '120px' }}
                        >
                          {label.length > 12 ? `${label.slice(0, 12)}...` : label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Matrix rows */}
              {data.cardLabels.map((rowLabel, i) => (
                <div key={i} className="flex">
                  {/* Row header */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-32 flex-shrink-0 flex items-center pr-2 text-right"
                        aria-hidden="true"
                      >
                        <span className="text-xs text-muted-foreground truncate w-full">
                          {rowLabel}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">{rowLabel}</TooltipContent>
                  </Tooltip>

                  {/* Cells */}
                  {data.matrix[i].map((value, j) => (
                    <Tooltip key={j}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-10 h-10 flex items-center justify-center text-xs font-medium rounded-sm m-0.5 transition-transform hover:scale-110',
                            getColorClass(value),
                            getTextColorClass(value),
                            i === j && 'opacity-50'
                          )}
                          aria-hidden="true"
                        >
                          {i !== j && Math.round(value * 100)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <div className="font-medium">{rowLabel}</div>
                          <div className="text-muted-foreground">×</div>
                          <div className="font-medium">{data.cardLabels[j]}</div>
                          <div className="mt-1 text-lg font-bold">
                            {Math.round(value * 100)}% similar
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ({Math.round(value * data.participantCount)} of {data.participantCount} sorted together)
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table View (Accessible) */}
        {viewMode === 'table' && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" aria-label="Card similarity pairs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('cardA')}
                        className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                        aria-label={`Sort by Card A, currently ${sortBy === 'cardA' ? sortOrder : 'not sorted'}`}
                      >
                        Card A
                        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('cardB')}
                        className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                        aria-label={`Sort by Card B, currently ${sortBy === 'cardB' ? sortOrder : 'not sorted'}`}
                      >
                        Card B
                        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button
                        onClick={() => handleSort('similarity')}
                        className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors ml-auto"
                        aria-label={`Sort by Similarity, currently ${sortBy === 'similarity' ? sortOrder : 'not sorted'}`}
                      >
                        Similarity
                        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="p-3 text-right font-semibold text-foreground">
                      Co-occurrences
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCells.map((cell, i) => (
                    <tr 
                      key={`${cell.cardA.id}-${cell.cardB.id}`}
                      className={cn(
                        'border-t border-border transition-colors',
                        'hover:bg-muted/30',
                        i % 2 === 0 && 'bg-muted/10'
                      )}
                    >
                      <td className="p-3 text-foreground">
                        {cell.cardA.label}
                      </td>
                      <td className="p-3 text-foreground">
                        {cell.cardB.label}
                      </td>
                      <td className="p-3 text-right">
                        <span 
                          className={cn(
                            'inline-flex items-center justify-center px-2 py-1 rounded-full text-sm font-medium',
                            getColorClass(cell.similarity),
                            getTextColorClass(cell.similarity)
                          )}
                          aria-label={`${Math.round(cell.similarity * 100)} percent similarity`}
                        >
                          {Math.round(cell.similarity * 100)}%
                        </span>
                      </td>
                      <td 
                        className="p-3 text-right text-muted-foreground"
                        aria-label={`${cell.coOccurrences} out of ${cell.totalPairings} participants`}
                      >
                        {cell.coOccurrences} / {cell.totalPairings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Table summary for screen readers */}
            <div className="sr-only" aria-live="polite">
              Showing {sortedCells.length} card pairs, sorted by {sortBy} in {sortOrder}ending order.
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
