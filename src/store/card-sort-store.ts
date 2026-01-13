import { create } from 'zustand';
import {
  Card,
  Category,
  CardSortState,
  SortAction,
  SortingMode,
  UNSORTED_CONTAINER_ID,
} from '@/types';

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const useCardSortStore = create<CardSortState>((set, get) => ({
  // Initial state
  cards: [],
  categories: [],
  unsortedCardIds: [],
  mode: 'open',
  actionHistory: [],
  activeCardId: null,
  focusedCardId: null,
  lastAnnouncement: '',

  // Initialize cards
  initializeCards: (cards: Card[]) => {
    set({
      cards,
      unsortedCardIds: cards.map((c) => c.id),
    });
  },

  // Initialize categories (for closed sorting)
  initializeCategories: (categories: Category[]) => {
    set({
      categories: categories.map((cat) => ({
        ...cat,
        cardIds: cat.cardIds || [],
      })),
    });
  },

  // Set sorting mode
  setMode: (mode: SortingMode) => {
    set({ mode });
  },

  // Move a card between containers
  moveCard: (cardId: string, fromContainerId: string, toContainerId: string, toIndex?: number) => {
    const state = get();
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return;

    // Create action for history
    const action: SortAction = {
      id: generateId(),
      cardId,
      cardLabel: card.label,
      fromContainerId,
      fromContainerName: state.getContainerName(fromContainerId),
      toContainerId,
      toContainerName: state.getContainerName(toContainerId),
      timestamp: Date.now(),
    };

    // Remove from source container
    let newUnsortedCardIds = [...state.unsortedCardIds];
    let newCategories = state.categories.map((cat) => ({ ...cat, cardIds: [...cat.cardIds] }));

    if (fromContainerId === UNSORTED_CONTAINER_ID) {
      newUnsortedCardIds = newUnsortedCardIds.filter((id) => id !== cardId);
    } else {
      const fromCategory = newCategories.find((cat) => cat.id === fromContainerId);
      if (fromCategory) {
        fromCategory.cardIds = fromCategory.cardIds.filter((id) => id !== cardId);
      }
    }

    // Add to target container
    if (toContainerId === UNSORTED_CONTAINER_ID) {
      if (toIndex !== undefined) {
        newUnsortedCardIds.splice(toIndex, 0, cardId);
      } else {
        newUnsortedCardIds.push(cardId);
      }
    } else {
      const toCategory = newCategories.find((cat) => cat.id === toContainerId);
      if (toCategory) {
        if (toIndex !== undefined) {
          toCategory.cardIds.splice(toIndex, 0, cardId);
        } else {
          toCategory.cardIds.push(cardId);
        }
      }
    }

    // Calculate position for announcement
    const targetCards = toContainerId === UNSORTED_CONTAINER_ID 
      ? newUnsortedCardIds 
      : newCategories.find((cat) => cat.id === toContainerId)?.cardIds || [];
    const position = targetCards.indexOf(cardId) + 1;
    const total = targetCards.length;

    // Create announcement
    const targetName = toContainerId === UNSORTED_CONTAINER_ID 
      ? 'Unsorted Tray' 
      : state.getContainerName(toContainerId);
    const announcement = `Card "${card.label}" moved to ${targetName}, position ${position} of ${total}.`;

    set({
      unsortedCardIds: newUnsortedCardIds,
      categories: newCategories,
      actionHistory: [...state.actionHistory, action],
      lastAnnouncement: announcement,
    });
  },

  // Add a new category (open sorting mode)
  addCategory: (name: string) => {
    const state = get();
    const newCategory: Category = {
      id: generateId(),
      name,
      cardIds: [],
      isUserCreated: true,
    };

    set({
      categories: [...state.categories, newCategory],
      lastAnnouncement: `Category "${name}" created.`,
    });
  },

  // Remove a category
  removeCategory: (categoryId: string) => {
    const state = get();
    const category = state.categories.find((cat) => cat.id === categoryId);
    if (!category) return;

    // Move all cards back to unsorted
    const cardsToMove = category.cardIds;

    set({
      categories: state.categories.filter((cat) => cat.id !== categoryId),
      unsortedCardIds: [...state.unsortedCardIds, ...cardsToMove],
      lastAnnouncement: `Category "${category.name}" removed. ${cardsToMove.length} cards returned to unsorted tray.`,
    });
  },

  // Rename a category
  renameCategory: (categoryId: string, newName: string) => {
    const state = get();
    const categories = state.categories.map((cat) =>
      cat.id === categoryId ? { ...cat, name: newName } : cat
    );

    set({
      categories,
      lastAnnouncement: `Category renamed to "${newName}".`,
    });
  },

  // Undo last action
  undo: () => {
    const state = get();
    if (state.actionHistory.length === 0) {
      set({ lastAnnouncement: 'Nothing to undo.' });
      return;
    }

    const lastAction = state.actionHistory[state.actionHistory.length - 1];
    const { cardId, fromContainerId, toContainerId, cardLabel } = lastAction;

    // Reverse the move
    let newUnsortedCardIds = [...state.unsortedCardIds];
    let newCategories = state.categories.map((cat) => ({ ...cat, cardIds: [...cat.cardIds] }));

    // Remove from current container (toContainerId becomes source)
    if (toContainerId === UNSORTED_CONTAINER_ID) {
      newUnsortedCardIds = newUnsortedCardIds.filter((id) => id !== cardId);
    } else {
      const fromCategory = newCategories.find((cat) => cat.id === toContainerId);
      if (fromCategory) {
        fromCategory.cardIds = fromCategory.cardIds.filter((id) => id !== cardId);
      }
    }

    // Add back to original container (fromContainerId becomes target)
    if (fromContainerId === UNSORTED_CONTAINER_ID) {
      newUnsortedCardIds.push(cardId);
    } else {
      const toCategory = newCategories.find((cat) => cat.id === fromContainerId);
      if (toCategory) {
        toCategory.cardIds.push(cardId);
      }
    }

    set({
      unsortedCardIds: newUnsortedCardIds,
      categories: newCategories,
      actionHistory: state.actionHistory.slice(0, -1),
      lastAnnouncement: `Undone: "${cardLabel}" returned to ${state.getContainerName(fromContainerId)}.`,
    });
  },

  // Reset all cards to unsorted
  reset: () => {
    const state = get();
    set({
      unsortedCardIds: state.cards.map((c) => c.id),
      categories: state.categories.map((cat) => ({ ...cat, cardIds: [] })),
      actionHistory: [],
      lastAnnouncement: 'All cards have been reset to the unsorted tray.',
    });
  },

  // UI state setters
  setActiveCard: (cardId: string | null) => {
    set({ activeCardId: cardId });
  },

  setFocusedCard: (cardId: string | null) => {
    set({ focusedCardId: cardId });
  },

  announce: (message: string) => {
    set({ lastAnnouncement: message });
  },

  // Helper functions
  getCard: (cardId: string) => {
    return get().cards.find((c) => c.id === cardId);
  },

  getCategory: (categoryId: string) => {
    return get().categories.find((cat) => cat.id === categoryId);
  },

  getContainerName: (containerId: string) => {
    if (containerId === UNSORTED_CONTAINER_ID) return 'Unsorted Tray';
    const category = get().categories.find((cat) => cat.id === containerId);
    return category?.name || 'Unknown';
  },

  getCardsByContainer: (containerId: string) => {
    const state = get();
    const cardIds =
      containerId === UNSORTED_CONTAINER_ID
        ? state.unsortedCardIds
        : state.categories.find((cat) => cat.id === containerId)?.cardIds || [];
    return cardIds.map((id) => state.cards.find((c) => c.id === id)).filter(Boolean) as Card[];
  },

  getSortedCount: () => {
    const state = get();
    return state.cards.length - state.unsortedCardIds.length;
  },

  getUnsortedCount: () => {
    return get().unsortedCardIds.length;
  },
}));
