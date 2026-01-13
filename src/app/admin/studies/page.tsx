'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  ExternalLink, 
  BarChart3, 
  Copy,
  Trash2,
  Pause,
  Play,
  Archive 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Study {
  id: string;
  name: string;
  slug: string;
  mode: 'OPEN' | 'CLOSED';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  _count: { cards: number; sessions: number };
  createdAt: string;
}

type StudyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

const statusConfig: Record<StudyStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500' },
  ACTIVE: { label: 'Active', color: 'bg-emerald-500' },
  PAUSED: { label: 'Paused', color: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-500' },
  ARCHIVED: { label: 'Archived', color: 'bg-slate-400' },
};

export default function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch studies from API
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        const response = await fetch('/api/studies');
        if (response.ok) {
          const data = await response.json();
          setStudies(data);
        }
      } catch (error) {
        console.error('Failed to fetch studies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudies();
  }, []);

  const filteredStudies = studies.filter(study =>
    study.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyShareLink = async (slug: string) => {
    const link = `${window.location.origin}/s/${slug}`;
    await navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Studies</h1>
            <p className="text-muted-foreground">
              {studies.length} {studies.length === 1 ? 'study' : 'studies'}
            </p>
          </div>
          <Link href="/admin/studies/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Study
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
              <p className="text-muted-foreground">Loading studies...</p>
            </div>
          </div>
        )}

        {/* Search */}
        {!isLoading && (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search studies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Studies List */}
        {filteredStudies.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No studies found</h2>
                <p className="text-muted-foreground">
                  Try adjusting your search query
                </p>
              </>
            ) : (
              <>
                <Plus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No studies yet</h2>
                <p className="text-muted-foreground mb-4">
                  Create your first card sorting study to get started
                </p>
                <Link href="/admin/studies/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Study
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full" aria-label="Studies">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-4 text-left font-semibold text-foreground">Study</th>
                  <th className="p-4 text-left font-semibold text-foreground hidden md:table-cell">Mode</th>
                  <th className="p-4 text-left font-semibold text-foreground hidden sm:table-cell">Status</th>
                  <th className="p-4 text-center font-semibold text-foreground hidden lg:table-cell">Cards</th>
                  <th className="p-4 text-center font-semibold text-foreground hidden lg:table-cell">Responses</th>
                  <th className="p-4 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudies.map((study, i) => {
                  const status = statusConfig[study.status as StudyStatus];
                  
                  return (
                    <tr 
                      key={study.id}
                      className={cn(
                        'border-b border-border transition-colors hover:bg-muted/30',
                        i % 2 === 0 && 'bg-muted/10'
                      )}
                    >
                      <td className="p-4">
                        <div>
                          <Link 
                            href={`/admin/studies/${study.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {study.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDate(study.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {study.mode === 'OPEN' ? 'Open Sort' : 'Closed Sort'}
                        </span>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 rounded-full', status.color)} />
                          <span className="text-sm">{status.label}</span>
                        </span>
                      </td>
                      <td className="p-4 text-center hidden lg:table-cell text-muted-foreground">
                        {study._count.cards}
                      </td>
                      <td className="p-4 text-center hidden lg:table-cell text-muted-foreground">
                        {study._count.sessions}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {study.status === 'ACTIVE' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyShareLink(study.slug)}
                                  aria-label="Copy share link"
                                >
                                  {copiedSlug === study.slug ? (
                                    <span className="text-xs text-emerald-500">Copied!</span>
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy participant link</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/studies/${study.id}/results`}>
                                <Button variant="ghost" size="icon" aria-label="View results">
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View results</TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More options">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/studies/${study.id}`}>
                                  Edit Study
                                </Link>
                              </DropdownMenuItem>
                              {study.status === 'ACTIVE' && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/s/${study.slug}`} target="_blank">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Preview
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {study.status === 'ACTIVE' && (
                                <DropdownMenuItem>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause Study
                                </DropdownMenuItem>
                              )}
                              {study.status === 'PAUSED' && (
                                <DropdownMenuItem>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume Study
                                </DropdownMenuItem>
                              )}
                              {study.status !== 'ARCHIVED' && (
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
