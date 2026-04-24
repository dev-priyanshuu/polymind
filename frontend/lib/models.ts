export interface ModelDetail {
  id: string;
  name: string;
  context: string;
  isNew?: boolean;
}

export type ProviderId = "openai" | "anthropic" | "google" | "xai" | "cohere" | "mistral";

export const PROVIDER_MODELS: Record<string, ModelDetail[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Omni)", context: "128k" },
    { id: "o1-preview", name: "o1 Preview", context: "128k", isNew: true },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", context: "200k" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", context: "200k" },
  ],
  google: [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context: "1M", isNew: true },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "2M" },
  ],
  xai: [
    { id: "grok-2-1212", name: "Grok 2", context: "131k", isNew: true },
  ],
  cohere: [
    { id: "command-r-plus-08-2024", name: "Command R+ (v2)", context: "128k", isNew: true },
    { id: "command-r", name: "Command R", context: "128k" },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", context: "128k" },
    { id: "mistral-medium", name: "Mistral Medium", context: "32k" },
  ],
};

export const PROVIDER_INFO: Record<string, { name: string; color: string }> = {
  openai: { name: "OpenAI", color: "#10a37f" },
  anthropic: { name: "Anthropic", color: "#d97757" },
  google: { name: "Google", color: "#4285f4" },
  xai: { name: "xAI", color: "#a855f7" },
  cohere: { name: "Cohere", color: "#39d3c3" },
  mistral: { name: "Mistral", color: "#f97316" },
};
