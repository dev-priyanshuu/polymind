const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface CompletionRequest {
  prompt: string;
  models: string[];
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  user_keys?: Record<string, string>;  // provider → api_key
  provider_hints?: Record<string, string>; // model_id → provider
}

export interface ChefRequest {
  original_prompt: string;
  model_responses: any[];
  chef_model: string;
  chef_provider_hint?: string;
  user_keys?: Record<string, string>;
}

/**
 * Kick off streaming and call onChunk for every SSE event.
 * Returns a cleanup function (abort).
 */
export async function streamComplete(
  request: CompletionRequest,
  onChunk: (chunk: any) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<() => void> {
  const controller = new AbortController();

  const run = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        onError(`API error ${res.status}: ${err}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed);
            } catch {
              // Ignore malformed lines
            }
          }
        }
      }
      onDone();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        onError(err.message || "Stream failed");
      }
    }
  };

  run();
  return () => controller.abort();
}

/**
 * Non-streaming complete — all models at once.
 */
export async function completeAll(request: CompletionRequest) {
  const res = await fetch(`${API_BASE}/api/v1/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * Run chef aggregator.
 */
export async function runChef(request: ChefRequest) {
  const res = await fetch(`${API_BASE}/api/v1/chef`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Chef API error: ${res.status}`);
  return res.json();
}

/**
 * Get session by share token.
 */
export async function getSharedSession(shareToken: string) {
  const res = await fetch(`${API_BASE}/api/v1/sessions/share/${shareToken}`);
  if (!res.ok) throw new Error(`Session not found`);
  return res.json();
}

/**
 * List all models.
 */
export async function listModels() {
  const res = await fetch(`${API_BASE}/api/v1/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}
/**
 * Fetch models for a specific provider using their API key.
 */
export async function fetchProviderModels(provider: string, apiKey: string) {
  const res = await fetch(`${API_BASE}/api/v1/models/${provider}?api_key=${encodeURIComponent(apiKey)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch provider models");
  }
  return res.json();
}
