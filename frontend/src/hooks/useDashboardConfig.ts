import { create } from "zustand";

interface DashboardConfigStore {
  config: any;
  setConfig: (config: any) => void;
  originalConfig: any;
  setOriginalConfig: (config: any) => void;
  pendingPatch: any[] | null;
  setPendingPatch: (patch: any[] | null) => void;
}

export const useDashboardConfig = create<DashboardConfigStore>((set) => ({
  config: {},
  setConfig: (config) => set({ config }),
  originalConfig: {},
  setOriginalConfig: (originalConfig) => set({ originalConfig }),
  pendingPatch: null,
  setPendingPatch: (pendingPatch) => set({ pendingPatch }),
}));
