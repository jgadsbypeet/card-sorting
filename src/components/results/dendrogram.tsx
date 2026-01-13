'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GitBranch, Table, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClusterAnalysis, DendrogramNode } from '@/types/results';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DendrogramProps {
  data: ClusterAnalysis;
}

type ViewMode = 'tree' | 'table' | 'clusters';

/**
 * Dendrogram / Hierarchical Clustering Visualization
 * 
 * Shows how cards group together based on sorting patterns.
 * Provides tree view, cluster view, and accessible table alternatives.
 */
export const DendrogramView: React.FC<DendrogramProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [selectedThreshold, setSelectedThreshold] = useState(0.5);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Get clusters at selected threshold
  const currentClusters = useMemo(() => {
    return data.suggestedClusters.find(c => c.threshold === selectedThreshold)?.clusters || [];
  }, [data.suggestedClusters, selectedThreshold]);

  // Flatten tree for table view
  const flattenedNodes = useMemo(() => {
    const nodes: { node: DendrogramNode; depth: number; path: string[] }[] = [];
    
    function traverse(node: DendrogramNode, depth: number, path: string[]) {
      const currentPath = [...path, node.name];
      nodes.push({ node, depth, path: currentPath });
      
      if (node.children) {
        for (const child of node.children) {
          traverse(child, depth + 1, currentPath);
        }
      }
    }
    
    traverse(data.root, 0, []);
    return nodes;
  }, [data.root]);

  // Get all leaf nodes (cards)
  const leafNodes = useMemo(() => {
    return flattenedNodes.filter(n => n.node.cardId);
  }, [flattenedNodes]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Color palette for clusters
  const clusterColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-indigo-500',
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Cluster Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Hierarchical grouping of cards based on sorting patterns
            </p>
          </div>

          <div className="flex items-center gap-2" role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
              aria-pressed={viewMode === 'tree'}
              className="gap-2"
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Tree
            </Button>
            <Button
              variant={viewMode === 'clusters' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('clusters')}
              aria-pressed={viewMode === 'clusters'}
              className="gap-2"
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              Clusters
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

        {/* Threshold selector for cluster view */}
        {viewMode === 'clusters' && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Similarity threshold:</span>
            <div className="flex items-center gap-2" role="group" aria-label="Similarity threshold">
              {data.suggestedClusters.map(({ threshold }) => (
                <Button
                  key={threshold}
                  variant={selectedThreshold === threshold ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedThreshold(threshold)}
                  aria-pressed={selectedThreshold === threshold}
                >
                  {Math.round(threshold * 100)}%
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tree View */}
        {viewMode === 'tree' && (
          <div 
            ref={containerRef}
            className="rounded-lg border border-border p-4 bg-card overflow-x-auto"
            role="tree"
            aria-label="Card clustering dendrogram"
          >
            <TreeNode 
              node={data.root} 
              depth={0} 
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              clusterColors={clusterColors}
            />
          </div>
        )}

        {/* Clusters View */}
        {viewMode === 'clusters' && (
          <div 
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label={`Clusters at ${Math.round(selectedThreshold * 100)}% similarity threshold`}
          >
            {currentClusters.map((cluster, i) => (
              <div
                key={cluster.id}
                className="rounded-lg border border-border p-4 bg-card"
                role="listitem"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className={cn(
                      'h-3 w-3 rounded-full',
                      clusterColors[i % clusterColors.length]
                    )}
                    aria-hidden="true"
                  />
                  <h4 className="font-semibold text-foreground">
                    {cluster.name}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    ({cluster.cardIds.length} cards)
                  </span>
                </div>
                <ul className="space-y-1">
                  {cluster.cardLabels.map((label, j) => (
                    <li 
                      key={j}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Table View (Accessible) */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {/* Cluster membership table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full" aria-label="Card cluster membership at different thresholds">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left font-semibold text-foreground">Card</th>
                    {data.suggestedClusters.map(({ threshold }) => (
                      <th 
                        key={threshold}
                        className="p-3 text-left font-semibold text-foreground"
                      >
                        {Math.round(threshold * 100)}% Threshold
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leafNodes.map(({ node }, i) => (
                    <tr 
                      key={node.id}
                      className={cn(
                        'border-t border-border transition-colors',
                        'hover:bg-muted/30',
                        i % 2 === 0 && 'bg-muted/10'
                      )}
                    >
                      <td className="p-3 font-medium text-foreground">
                        {node.name}
                      </td>
                      {data.suggestedClusters.map(({ threshold, clusters }) => {
                        const cluster = clusters.find(c => 
                          c.cardIds.includes(node.cardId || '')
                        );
                        const clusterIdx = clusters.indexOf(cluster!);
                        return (
                          <td key={threshold} className="p-3">
                            {cluster && (
                              <span className="flex items-center gap-2">
                                <span 
                                  className={cn(
                                    'h-2.5 w-2.5 rounded-full',
                                    clusterColors[clusterIdx % clusterColors.length]
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="text-muted-foreground">
                                  {cluster.name}
                                </span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cluster summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <h4 className="font-semibold text-foreground mb-2">Summary</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Total cards analyzed: {leafNodes.length}</li>
                {data.suggestedClusters.map(({ threshold, clusters }) => (
                  <li key={threshold}>
                    • At {Math.round(threshold * 100)}% similarity: {clusters.length} clusters
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Recursive tree node component
interface TreeNodeProps {
  node: DendrogramNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  clusterColors: string[];
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  expandedNodes,
  onToggle,
  clusterColors,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id) || depth < 2; // Auto-expand first 2 levels
  const isLeaf = !hasChildren;

  return (
    <div 
      className="select-none"
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-label={isLeaf ? `Card: ${node.name}` : `Cluster with ${node.children?.length || 0} sub-groups`}
    >
      <div 
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors',
          hasChildren && 'cursor-pointer hover:bg-muted/50',
          isLeaf && 'cursor-default'
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => hasChildren && onToggle(node.id)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && hasChildren) {
            e.preventDefault();
            onToggle(node.id);
          }
        }}
        tabIndex={hasChildren ? 0 : -1}
      >
        {/* Expand/collapse icon */}
        {hasChildren ? (
          <span className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        ) : (
          <span 
            className={cn(
              'flex-shrink-0 h-2.5 w-2.5 rounded-full',
              clusterColors[depth % clusterColors.length]
            )}
            aria-hidden="true"
          />
        )}

        {/* Node label */}
        <span className={cn(
          'text-sm',
          isLeaf ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}>
          {isLeaf ? node.name : `Cluster (${countLeaves(node)} cards)`}
        </span>

        {/* Distance indicator for non-leaf nodes */}
        {!isLeaf && node.value !== undefined && (
          <span className="text-xs text-muted-foreground/70 ml-auto">
            dist: {node.value.toFixed(2)}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children!.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              clusterColors={clusterColors}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to count leaf nodes
function countLeaves(node: DendrogramNode): number {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}
