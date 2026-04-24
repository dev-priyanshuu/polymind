/**
 * Zustand store for PolyMind global state.
 * Updated to support dynamic model selection per provider.
 */
import { create } from "zustand";
import { ProviderId, ModelDetail } from "./models";

export interface ModelResponse {
  modelId: string;
  displayName: string;
  provider: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  error?: string;
  success: boolean;
  streaming: boolean;
}

export interface ChefResult {
  synthesis: string;
  confidenceScore: number;
  verifiedClaims: string[];
  disputedClaims: string[];
  unverifiedClaims: string[];
  chefModel: string;
}

interface PolyMindStore {
  // Session
  prompt: string;
  setPrompt: (p: string) => void;

  // Model selection
  activeProviders: ProviderId[];
  toggleProvider: (id: ProviderId) => void;
  
  providerToModel: Record<ProviderId, string>;
  setProviderModel: (pid: ProviderId, mid: string) => void;

  // Chef
  chefModel: string; // e.g., "claude-3-5-sonnet-latest"
  setChefModel: (id: string) => void;

  // Responses
  responses: Record<string, ModelResponse>; // keyed by provider_id
  setResponse: (pid: string, r: Partial<ModelResponse>) => void;
  appendChunk: (pid: string, chunk: string) => void;
  clearResponses: () => void;

  // Chef result
  chefResult: ChefResult | null;
  setChefResult: (r: ChefResult | null) => void;
  chefLoading: boolean;
  setChefLoading: (v: boolean) => void;

  // Loading state
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;

  // Session info
  sessionId: string | null;
  shareToken: string | null;
  setSessionInfo: (id: string, token: string) => void;

  // Dynamic models cache
  fetchedModels: Record<string, ModelDetail[]>;
  setFetchedModels: (pid: string, models: ModelDetail[]) => void;
}

export const usePolyMindStore = create<PolyMindStore>((set) => ({
  prompt: "",
  setPrompt: (p) => set({ prompt: p }),

  activeProviders: ["openai", "anthropic", "google"],
  toggleProvider: (id) =>
    set((s) => ({
      activeProviders: s.activeProviders.includes(id)
        ? s.activeProviders.filter((p) => p !== id)
        : [...s.activeProviders, id],
    })),

  providerToModel: {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-latest",
    google: "gemini-1.5-flash",
    xai: "grok-2-1212",
    cohere: "command-r-plus-08-2024",
    mistral: "mistral-large-latest",
  },
  setProviderModel: (pid, mid) =>
    set((s) => ({
      providerToModel: { ...s.providerToModel, [pid]: mid },
    })),

  chefModel: "claude-3-5-sonnet-latest",
  setChefModel: (id) => set({ chefModel: id }),

  responses: {},
  setResponse: (pid, r) =>
    set((s) => ({
      responses: {
        ...s.responses,
        [pid]: {
          ...(s.responses[pid] || {
            modelId: s.providerToModel[pid as ProviderId],
            displayName: pid,
            provider: pid,
            content: "",
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: 0,
            costUsd: 0,
            success: true,
            streaming: false,
          }),
          ...r,
        },
      },
    })),
  appendChunk: (pid, chunk) =>
    set((s) => ({
      responses: {
        ...s.responses,
        [pid]: {
          ...(s.responses[pid] || {
            modelId: s.providerToModel[pid as ProviderId],
            displayName: pid,
            provider: pid,
            content: "",
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: 0,
            costUsd: 0,
            success: true,
            streaming: false,
          }),
          content: (s.responses[pid]?.content || "") + chunk,
          streaming: true,
        },
      },
    })),
  clearResponses: () => set({ responses: {}, chefResult: null }),

  chefResult: null,
  setChefResult: (r) => set({ chefResult: r }),
  chefLoading: false,
  setChefLoading: (v) => set({ chefLoading: v }),

  isStreaming: false,
  setIsStreaming: (v) => set({ isStreaming: v }),

  sessionId: null,
  shareToken: null,
  setSessionInfo: (id, token) => set({ sessionId: id, shareToken: token }),

  fetchedModels: {},
  setFetchedModels: (pid, models) => 
    set((s) => ({ 
      fetchedModels: { ...s.fetchedModels, [pid]: models } 
    })),
}));
