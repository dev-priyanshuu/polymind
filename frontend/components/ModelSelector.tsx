"use client";

import { usePolyMindStore } from "@/lib/store";
import { useApiKeysStore } from "@/lib/keysStore";
import { PROVIDER_MODELS, PROVIDER_INFO, ProviderId, ModelDetail } from "@/lib/models";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { fetchProviderModels } from "@/lib/api";

export function ModelSelector() {
  const { 
    activeProviders, 
    toggleProvider, 
    providerToModel, 
    setProviderModel,
    fetchedModels,
    setFetchedModels
  } = usePolyMindStore();
  const { keys } = useApiKeysStore();
  
  const [openProvider, setOpenProvider] = useState<ProviderId | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenProvider(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenDropdown = async (pid: ProviderId) => {
    if (openProvider === pid) {
      setOpenProvider(null);
      return;
    }

    setOpenProvider(pid);

    // If models not cached, fetch them
    if (!fetchedModels[pid]) {
      const apiKey = keys[pid];
      if (apiKey && apiKey.trim().length > 0) {
        setLoadingProvider(pid);
        try {
          const result = await fetchProviderModels(pid, apiKey);
          // Standardize response to ModelDetail format
          const normalized: ModelDetail[] = result.models.map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            context: "Unknown"
          }));
          setFetchedModels(pid, normalized);
        } catch (error) {
          console.error(`Failed to fetch models for ${pid}:`, error);
        } finally {
          setLoadingProvider(null);
        }
      }
    }
  };

  // Fetch models for all active providers on mount or when activeProviders/keys change
  useEffect(() => {
    activeProviders.forEach(pid => {
      const apiKey = keys[pid];
      if (apiKey && apiKey.trim().length > 0 && !fetchedModels[pid]) {
        handleOpenDropdown(pid);
      }
    });
  }, [activeProviders, keys, fetchedModels]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          MODELS
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {activeProviders.length} active
        </span>
      </div>

      <div className="flex flex-wrap gap-3" ref={dropdownRef}>
        {(Object.keys(PROVIDER_INFO) as ProviderId[]).map((pid) => {
          const info = PROVIDER_INFO[pid];
          const isActive = activeProviders.includes(pid);
          const currentModelId = providerToModel[pid];
          
          // Use fetched models if available, otherwise fall back to hardcoded defaults
          const availableModels = fetchedModels[pid] || PROVIDER_MODELS[pid] || [];
          const currentModel = availableModels.find((m) => m.id === currentModelId);
          const isOpen = openProvider === pid;
          const isLoading = loadingProvider === pid;

          return (
            <div key={pid} style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: isActive ? "var(--bg-card)" : "transparent",
                  border: `1px solid ${isActive ? info.color + "40" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "2px",
                  transition: "all 0.2s",
                }}
              >
                <button
                  onClick={() => toggleProvider(pid)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isActive ? info.color : "var(--text-muted)",
                      boxShadow: isActive ? `0 0 8px ${info.color}` : "none",
                    }}
                  />
                  {info.name}
                </button>

                {isActive && (
                  <button
                    onClick={() => handleOpenDropdown(pid)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px 4px 10px",
                      background: "var(--bg-secondary)",
                      borderLeft: "1px solid var(--border)",
                      borderTopRightRadius: 10,
                      borderBottomRightRadius: 10,
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 500,
                      border: "none",
                    }}
                  >
                    {currentModel?.name || currentModelId}
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                )}
              </div>

              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    zIndex: 100,
                    width: 220,
                    maxHeight: 300,
                    overflowY: "auto",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-card)",
                    padding: "6px",
                    backdropFilter: "blur(10px)",
                  }}
                  className="animate-fade-in custom-scrollbar"
                >
                  {isLoading ? (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      Fetching models...
                    </div>
                  ) : availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setProviderModel(pid, m.id);
                          setOpenProvider(null);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: m.id === currentModelId ? "var(--border-accent)" : "transparent",
                          border: "none",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: 12.5,
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                          {m.context !== "Unknown" && (
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.context} context</span>
                          )}
                        </div>
                        {m.id === currentModelId && <Check size={14} color="var(--accent-purple)" />}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      No models found. Check your API key.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
