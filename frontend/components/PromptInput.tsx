"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, AlertCircle } from "lucide-react";
import { usePolyMindStore } from "@/lib/store";
import { streamComplete, runChef } from "@/lib/api";
import { useApiKeysStore } from "@/lib/keysStore";
import { ApiKeysModal } from "./ApiKeysModal";
import { PROVIDER_INFO, ProviderId, PROVIDER_MODELS } from "@/lib/models";

export function PromptInput() {
  const {
    prompt,
    setPrompt,
    activeProviders,
    providerToModel,
    chefModel,
    isStreaming,
    setIsStreaming,
    clearResponses,
    appendChunk,
    setResponse,
    setChefResult,
    setChefLoading,
    fetchedModels,
  } = usePolyMindStore();

  const { getKeysForRequest, hasAnyKey, keys } = useApiKeysStore();
  const [keysOpen, setKeysOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isStreaming || activeProviders.length === 0) return;

    // Validation: Check if we have keys for all selected providers
    const missingKeys = activeProviders.filter(p => !keys[p] || keys[p].trim() === "");
    if (missingKeys.length > 0) {
      const providerNames = missingKeys.map(p => PROVIDER_INFO[p]?.name || p).join(", ");
      alert(`Please provide API keys for the following providers first: ${providerNames}`);
      setKeysOpen(true);
      return;
    }

    const currentKeys = getKeysForRequest();
    clearResponses();
    setIsStreaming(true);
    setChefResult(null);

    // Initialize response state for each active provider
    activeProviders.forEach((pid) => {
      const modelId = providerToModel[pid];
      setResponse(pid, {
        modelId,
        displayName: pid,
        provider: pid,
        content: "",
        streaming: true,
        success: true,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        costUsd: 0,
      });
    });

    const startTimes: Record<string, number> = {};
    activeProviders.forEach((p) => { startTimes[p] = Date.now(); });
    
    const userKeys = getKeysForRequest() as Record<string, string>;

    // Map provider IDs to the specific model IDs the user selected
    const selectedModelIds = activeProviders.map(p => providerToModel[p]);

    const cleanup = await streamComplete(
      {
        prompt: prompt.trim(),
        models: selectedModelIds,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
        user_keys: Object.keys(userKeys).length > 0 ? userKeys : undefined,
        provider_hints: activeProviders.reduce((acc, p) => ({ ...acc, [providerToModel[p]]: p }), {}),
      },
      (chunk) => {
        const { model_id, chunk: text, is_final, error, metadata } = chunk;
        if (!model_id) return;

        // Find which provider this model_id belongs to (in reverse)
        const providerId = activeProviders.find(p => providerToModel[p] === model_id);
        if (!providerId) return;

        if (error) {
          setResponse(providerId, {
            error,
            success: false,
            streaming: false,
            latencyMs: Date.now() - (startTimes[providerId] || Date.now()),
          });
        } else if (is_final) {
          setResponse(providerId, {
            streaming: false,
            latencyMs: Date.now() - (startTimes[providerId] || Date.now()),
            ...(metadata || {}),
          });
        } else if (text) {
          appendChunk(providerId, text);
        }
      },
      async () => {
        setIsStreaming(false);
        abortRef.current = null;

        const currentResponses = usePolyMindStore.getState().responses;
        const modelResponsesForChef = Object.entries(currentResponses)
          .filter(([_, r]) => r.success && r.content)
          .map(([pid, r]) => ({
            model_id: r.modelId,
            provider: r.provider,
            display_name: r.displayName,
            content: r.content,
            input_tokens: r.inputTokens,
            output_tokens: r.outputTokens,
            latency_ms: r.latencyMs,
            cost_usd: r.costUsd,
            success: r.success,
          }));

        // We no longer automatically trigger the Chef here.
        // The user will manually trigger it via the "GO" button in ChefPanel.tsx.
      },
      (err) => {
        console.error("Stream error:", err);
        setIsStreaming(false);
        abortRef.current = null;
      }
    );

    abortRef.current = cleanup;
  }, [prompt, activeProviders, providerToModel, chefModel, isStreaming]);

  const handleStop = () => {
    abortRef.current?.();
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const noKeys = !hasAnyKey();

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            id="prompt-input"
            className="prompt-input"
            rows={4}
            placeholder="Ask anything... Selected models respond simultaneously. Press ⌘+Enter to send."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
        </div>

        {mounted && noKeys && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 9,
              background: "var(--bg-secondary)",
              border: "1px solid var(--accent-amber)",
              fontSize: 12.5,
              color: "var(--accent-amber)",
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>
              No API keys set — requests will use your own keys.{" "}
              <button
                onClick={() => setKeysOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-amber)",
                  cursor: "pointer",
                  padding: 0,
                  fontWeight: 600,
                  fontSize: 12.5,
                  textDecoration: "underline",
                }}
              >
                Add keys →
              </button>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {prompt.length > 0 && `${prompt.length} chars`}
            </span>
            {mounted && !noKeys && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--accent-green)",
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  fontWeight: 500,
                }}
              >
                Using your keys
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isStreaming && (
              <button onClick={handleStop} className="btn-secondary" id="stop-btn">
                Stop
              </button>
            )}
            <button
              id="send-btn"
              onClick={handleSubmit}
              disabled={isStreaming || !prompt.trim() || activeProviders.length === 0}
              className="btn-primary"
            >
              {isStreaming ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Generating…
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Run on {activeProviders.length} provider{activeProviders.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {keysOpen && <ApiKeysModal onClose={() => setKeysOpen(false)} />}
    </>
  );
}
