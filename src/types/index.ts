// Card Sorting Application Types
export * from './results';

export interface Card {
  id: string;
  label: string;
  description?: string | null;
}

export interface Category {
  id: string;
  name: string;
  cardIds: string[];
  isUserCreated?: boolean;
}

export type SortingMode = 'open' | 'closed';

export interface SortAction {
  id: string;
  cardId: string;
  cardLabel: string;
  fromContainerId: string;
  fromContainerName: string;
  toContainerId: string;
  toContainerName: string;
  timestamp: number;
}

export interface CardSortState {
  // Data
  cards: Card[];
  categories: Category[];
  unsortedCardIds: string[];
  mode: SortingMode;
  
  // History for undo
  actionHistory: SortAction[];
  
  // UI State
  activeCardId: string | null;
  focusedCardId: string | null;
  
  // Accessibility
  lastAnnouncement: string;
  
  // Actions
  initializeCards: (cards: Card[]) => void;
  initializeCategories: (categories: Category[]) => void;
  setMode: (mode: SortingMode) => void;
  
  moveCard: (cardId: string, fromContainerId: string, toContainerId: string, toIndex?: number) => void;
  addCategory: (name: string) => void;
  removeCategory: (categoryId: string) => void;
  renameCategory: (categoryId: string, newName: string) => void;
  
  undo: () => void;
  reset: () => void;
  
  setActiveCard: (cardId: string | null) => void;
  setFocusedCard: (cardId: string | null) => void;
  announce: (message: string) => void;
  
  // Computed helpers
  getCard: (cardId: string) => Card | undefined;
  getCategory: (categoryId: string) => Category | undefined;
  getContainerName: (containerId: string) => string;
  getCardsByContainer: (containerId: string) => Card[];
  getSortedCount: () => number;
  getUnsortedCount: () => number;
}

// Container IDs
export const UNSORTED_CONTAINER_ID = 'unsorted-tray';

// Sample data for testing
export const SAMPLE_CARDS: Card[] = [
  { id: 'card-1', label: 'Budget Planning', description: 'Create and manage budgets' },
  { id: 'card-2', label: 'Invoice Generation', description: 'Generate and send invoices' },
  { id: 'card-3', label: 'Team Chat', description: 'Real-time messaging with team' },
  { id: 'card-4', label: 'Video Calls', description: 'Host and join video meetings' },
  { id: 'card-5', label: 'Task Assignment', description: 'Assign tasks to team members' },
  { id: 'card-6', label: 'Progress Tracking', description: 'Monitor project progress' },
  { id: 'card-7', label: 'File Storage', description: 'Store and organize files' },
  { id: 'card-8', label: 'Calendar', description: 'Schedule and manage events' },
  { id: 'card-9', label: 'Expense Reports', description: 'Track and submit expenses' },
  { id: 'card-10', label: 'Client Portal', description: 'Client-facing dashboard' },
  { id: 'card-11', label: 'Analytics Dashboard', description: 'View business metrics' },
  { id: 'card-12', label: 'Email Integration', description: 'Connect email accounts' },
];

export const SAMPLE_CLOSED_CATEGORIES: Omit<Category, 'cardIds'>[] = [
  { id: 'cat-finance', name: 'Finance' },
  { id: 'cat-communication', name: 'Communication' },
  { id: 'cat-project-management', name: 'Project Management' },
  { id: 'cat-storage', name: 'Storage & Files' },
];
