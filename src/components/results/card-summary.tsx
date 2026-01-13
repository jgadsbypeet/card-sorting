'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardPlacementSummary } from '@/types/results';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CardSummaryProps {
  data: CardPlacementSummary[];
}

type SortBy = 'card' | 'agreement' | 'category';
type SortOrder = 'asc' | 'desc';

/**
 * Card Placement Summary
 * 
 * Shows where each card was placed and how much agreement there was.
 * Accessible table view with sorting capabilities.
 */
export const CardSummaryView: React.FC<CardSummaryProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<SortBy>('agreement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filter, setFilter] = useState<'all' | 'ambiguous' | 'consensus'>('all');

  const sortedData = useMemo(() => {
    let filtered = [...data];
    
    // Apply filter
    if (filter === 'ambiguous') {
      filtered = filtered.filter(c => c.agreementScore < 0.5);
    } else if (filter === 'consensus') {
      filtered = filtered.filter(c => c.agreementScore >= 0.8);
    }
    
    // Apply sort
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'card':
          comparison = a.cardLabel.localeCompare(b.cardLabel);
          break;
        case 'agreement':
          comparison = a.agreementScore - b.agreementScore;
          break;
        case 'category':
          comparison = a.primaryCategory.localeCompare(b.primaryCategory);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortBy, sortOrder, filter]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'agreement' ? 'asc' : 'desc');
    }
  };

  // Stats
  const ambiguousCount = data.filter(c => c.agreementScore < 0.5).length;
  const consensusCount = data.filter(c => c.agreementScore >= 0.8).length;

  const getAgreementIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (score < 0.5) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getAgreementLabel = (score: number) => {
    if (score >= 0.8) return 'High consensus';
    if (score >= 0.5) return 'Moderate agreement';
    return 'Low agreement (ambiguous)';
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Card Placement Summary</h3>
            <p className="text-sm text-muted-foreground">
              Where each card was placed and participant agreement levels
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex items-center gap-2" role="group" aria-label="Filter cards">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
            >
              All ({data.length})
            </Button>
            <Button
              variant={filter === 'ambiguous' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ambiguous')}
              aria-pressed={filter === 'ambiguous'}
              className="gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Ambiguous ({ambiguousCount})
            </Button>
            <Button
              variant={filter === 'consensus' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('consensus')}
              aria-pressed={filter === 'consensus'}
              className="gap-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              High Consensus ({consensusCount})
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Card placement summary">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort('card')}
                      className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                      aria-label={`Sort by Card, currently ${sortBy === 'card' ? sortOrder : 'not sorted'}`}
                    >
                      Card
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort('category')}
                      className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                      aria-label={`Sort by Primary Category, currently ${sortBy === 'category' ? sortOrder : 'not sorted'}`}
                    >
                      Primary Category
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="p-3 text-left">
                    <button
                      onClick={() => handleSort('agreement')}
                      className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                      aria-label={`Sort by Agreement, currently ${sortBy === 'agreement' ? sortOrder : 'not sorted'}`}
                    >
                      Agreement
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="p-3 text-left font-semibold text-foreground">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((card, i) => (
                  <tr 
                    key={card.cardId}
                    className={cn(
                      'border-t border-border transition-colors',
                      'hover:bg-muted/30',
                      i % 2 === 0 && 'bg-muted/10'
                    )}
                  >
                    <td className="p-3 font-medium text-foreground">
                      {card.cardLabel}
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">
                      {card.primaryCategory}
                    </td>
                    <td className="p-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-2">
                            {getAgreementIcon(card.agreementScore)}
                            <span className="text-sm text-foreground">
                              {Math.round(card.agreementScore * 100)}%
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {getAgreementLabel(card.agreementScore)}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {card.placements.slice(0, 3).map((placement, j) => (
                          <div 
                            key={j}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div 
                              className="h-2 rounded-full bg-primary/60"
                              style={{ width: `${Math.max(placement.percentage, 5)}%`, maxWidth: '100px' }}
                              aria-hidden="true"
                            />
                            <span className="text-muted-foreground capitalize whitespace-nowrap">
                              {placement.categoryName} ({Math.round(placement.percentage)}%)
                            </span>
                          </div>
                        ))}
                        {card.placements.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{card.placements.length - 3} more categories
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary for screen readers */}
        <div className="sr-only" aria-live="polite">
          Showing {sortedData.length} cards, sorted by {sortBy} in {sortOrder}ending order.
          {filter !== 'all' && ` Filtered to show ${filter} cards only.`}
        </div>
      </div>
    </TooltipProvider>
  );
};
