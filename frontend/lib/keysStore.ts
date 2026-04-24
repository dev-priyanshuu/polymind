/**
 * API Keys store — persists user's own provider keys in localStorage.
 * Keys never leave the browser unencrypted; they're sent per-request.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "cohere"
  | "mistral";

export interface ProviderKeyConfig {
  id: ProviderId;
  label: string;
  placeholder: string;
  docsUrl: string;
  color: string;
}

export const PROVIDER_CONFIGS: ProviderKeyConfig[] = [
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "#10a37f",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/keys",
    color: "#d97757",
  },
  {
    id: "google",
    label: "Google (Gemini)",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: "#4285f4",
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    placeholder: "xai-...",
    docsUrl: "https://console.x.ai/",
    color: "#a855f7",
  },
  {
    id: "cohere",
    label: "Cohere",
    placeholder: "...",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    color: "#39d3c3",
  },
  {
    id: "mistral",
    label: "Mistral",
    placeholder: "...",
    docsUrl: "https://console.mistral.ai/api-keys/",
    color: "#f97316",
  },
];

interface ApiKeysState {
  keys: Partial<Record<ProviderId, string>>;
  setKey: (provider: ProviderId, key: string) => void;
  clearKey: (provider: ProviderId) => void;
  clearAll: () => void;
  hasAnyKey: () => boolean;
  getKeysForRequest: () => Partial<Record<ProviderId, string>>;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: {},
      setKey: (provider, key) =>
        set((s) => ({ keys: { ...s.keys, [provider]: key } })),
      clearKey: (provider) =>
        set((s) => {
          const next = { ...s.keys };
          delete next[provider];
          return { keys: next };
        }),
      clearAll: () => set({ keys: {} }),
      hasAnyKey: () => Object.values(get().keys).some((v) => v && v.length > 0),
      getKeysForRequest: () => {
        const filtered: Partial<Record<ProviderId, string>> = {};
        for (const [k, v] of Object.entries(get().keys)) {
          if (v && v.trim().length > 0) {
            filtered[k as ProviderId] = v.trim();
          }
        }
        return filtered;
      },
    }),
    {
      name: "polymind-api-keys", // localStorage key
    }
  )
);
