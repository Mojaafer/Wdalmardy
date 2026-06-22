'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BranchOption = {
  id: number;
  name_ar: string;
  is_main: boolean;
  status: string;
};

type BranchContextState = {
  /** The branch currently in scope for branch-sensitive admin pages. */
  currentBranchId: number | null;
  /** All branches the admin can see (populated from listBranches). */
  branches: BranchOption[];
  /** Hydrated flag so consumers can tell "not loaded yet" from "null". */
  loaded: boolean;
  setBranches: (branches: BranchOption[]) => void;
  setCurrent: (id: number) => void;
  /** The active branch object, or null when none selected. */
  current: () => BranchOption | null;
};

export const useBranchContext = create<BranchContextState>()(
  persist(
    (set, get) => ({
      currentBranchId: null,
      branches: [],
      loaded: false,
      setBranches: (branches) =>
        set((state) => {
          // Keep the persisted selection if it still exists; otherwise fall
          // back to the main branch, then the first available branch.
          const stillValid =
            state.currentBranchId != null &&
            branches.some((b) => b.id === state.currentBranchId);
          const fallback =
            branches.find((b) => b.is_main)?.id ?? branches[0]?.id ?? null;
          return {
            branches,
            currentBranchId: stillValid ? state.currentBranchId : fallback,
            loaded: true,
          };
        }),
      setCurrent: (id) => set({ currentBranchId: id }),
      current: () => {
        const { branches, currentBranchId } = get();
        return branches.find((b) => b.id === currentBranchId) ?? null;
      },
    }),
    {
      name: 'wadalmardi-admin-branch',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
