"use client";

import ReactMarkdown from "react-markdown";
import { ChefHat, TrendingUp, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Check, Play, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePolyMindStore } from "@/lib/store";
import { PROVIDER_MODELS, PROVIDER_INFO, ProviderId, ModelDetail } from "@/lib/models";
import { runChef } from "@/lib/api";
import { useApiKeysStore } from "@/lib/keysStore";

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const level = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";
  const label = pct >= 70 ? "High Confidence" : pct >= 40 ? "Moderate" : "Low Confidence";
  return (
    <div className={`confidence-badge ${level}`}>
      <TrendingUp size={13} />
      {pct}% — {label}
    </div>
  );
}

export function ChefPanel() {
  const { 
    chefResult, 
    chefLoading, 
    chefModel, 
    setChefModel, 
    fetchedModels, 
    setChefLoading, 
    setChefResult,
    responses,
    isStreaming,
    prompt,
  } = usePolyMindStore();

  const { getKeysForRequest } = useApiKeysStore();
  const [claimsExpanded, setClaimsExpanded] = useState(true);
  const [openProviderDropdown, setOpenProviderDropdown] = useState<ProviderId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper to find provider for a model
  const findProviderForModel = (mid: string): ProviderId => {
    return (Object.keys(PROVIDER_INFO) as ProviderId[]).find(pid => {
      const all = [...(PROVIDER_MODELS[pid] || []), ...(fetchedModels[pid] || [])];
      return all.some(m => m.id === mid);
    }) || "anthropic";
  };

  const currentProviderId = findProviderForModel(chefModel);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenProviderDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSynthesize = async () => {
    if (chefLoading) return;
    
    // Prepare responses for chef
    const modelResponsesForChef = Object.values(responses)
      .filter(r => r.success && !r.streaming)
      .map(r => ({
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

    if (modelResponsesForChef.length === 0) return;

    setChefLoading(true);
    try {
      const currentKeys = getKeysForRequest() as Record<string, string>;
      const chefProviderHint = findProviderForModel(chefModel);
      
      const result = await runChef({
        original_prompt: prompt.trim(),
        model_responses: modelResponsesForChef,
        chef_model: chefModel,
        chef_provider_hint: chefProviderHint,
        user_keys: Object.keys(currentKeys).length > 0 ? currentKeys : undefined,
      });

      setChefResult({
        synthesis: result.synthesis,
        confidenceScore: result.confidence_score,
        verifiedClaims: result.verified_claims || [],
        disputedClaims: result.disputed_claims || [],
        unverifiedClaims: result.unverified_claims || [],
        chefModel: result.chef_model,
      });
    } catch (e) {
      console.error("Chef failed:", e);
    } finally {
      setChefLoading(false);
    }
  };

  // Show the chef selector. It will be disabled until all streaming is completely finished and there are responses
  const allStreamsFinished = Object.values(responses).length > 0 && !isStreaming;

  return (
    <div className="chef-panel animate-fade-in" style={{ padding: "20px" }}>
      {/* Header with Selector and Go Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ChefHat size={20} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
              Chef Summary
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Select a synthesizer and click Go
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {chefResult && <ConfidenceBadge score={chefResult.confidenceScore} />}
          
          {/* Main Model Selector Styled Pill List */}
          <div className="flex flex-wrap gap-2" ref={dropdownRef}>
            {(Object.keys(PROVIDER_INFO) as ProviderId[]).map((pid) => {
              const info = PROVIDER_INFO[pid];
              const isSelected = currentProviderId === pid;
              
              const availableModels = [
                ...(PROVIDER_MODELS[pid] || []),
                ...(fetchedModels[pid] || [])
              ];
              const currentModel = availableModels.find(m => m.id === chefModel) || availableModels[0];
              const isDropdownOpen = openProviderDropdown === pid;

              return (
                <div key={pid} style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: isSelected ? "var(--bg-card)" : "transparent",
                      border: `1px solid ${isSelected ? info.color + "60" : "var(--border)"}`,
                      borderRadius: 12,
                      padding: "2px",
                      transition: "all 0.2s",
                    }}
                  >
                    <button
                      onClick={() => {
                        const firstModel = availableModels[0]?.id;
                        if (firstModel) setChefModel(firstModel);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 12px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isSelected ? "var(--text-primary)" : "var(--text-muted)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: isSelected ? info.color : "var(--text-muted)",
                          boxShadow: isSelected ? `0 0 8px ${info.color}` : "none",
                        }}
                      />
                      {info.name}
                    </button>

                    {isSelected && (
                      <button
                        onClick={() => setOpenProviderDropdown(isDropdownOpen ? null : pid)}
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
                        {currentModel?.name || "Select"}
                        <ChevronDown size={12} />
                      </button>
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 100,
                        width: 200,
                        maxHeight: 250,
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
                      {availableModels.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setChefModel(m.id);
                            setOpenProviderDropdown(null);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: m.id === chefModel ? "var(--border-accent)" : "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontSize: 12,
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontWeight: m.id === chefModel ? 600 : 400 }}>{m.name}</span>
                          {m.id === chefModel && <Check size={13} color="var(--accent-purple)" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* GO BUTTON */}
          <button
            onClick={handleSynthesize}
            disabled={chefLoading || !allStreamsFinished}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              background: "var(--gradient-brand)",
              borderRadius: 12,
              border: "none",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: chefLoading ? "default" : "pointer",
              transition: "transform 0.2s, filter 0.2s",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
              opacity: allStreamsFinished ? 1 : 0.5
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {chefLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Cooking...
              </>
            ) : (
              <>
                <Play size={16} fill="white" />
                GO
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {chefLoading && !chefResult && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
          <div className="spinner" />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>The Chef is analyzing all perspectives...</p>
        </div>
      )}

      {chefResult && (
        <>
          {/* Claims section */}
          {(chefResult.verifiedClaims.length > 0 ||
            chefResult.disputedClaims.length > 0 ||
            chefResult.unverifiedClaims.length > 0) && (
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => setClaimsExpanded((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0 0 12px 0",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Detailed Analysis
                {claimsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {claimsExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {chefResult.verifiedClaims.map((claim, i) => (
                    <div key={i} className="claim-item verified">
                      <CheckCircle2 size={14} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: "var(--text-primary)" }}>{claim}</span>
                    </div>
                  ))}
                  {chefResult.disputedClaims.map((claim, i) => (
                    <div key={i} className="claim-item disputed">
                      <AlertTriangle size={14} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: "var(--text-primary)" }}>{claim}</span>
                    </div>
                  ))}
                  {chefResult.unverifiedClaims.map((claim, i) => (
                    <div key={i} className="claim-item unverified">
                      <XCircle size={14} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ color: "var(--text-primary)" }}>{claim}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />

          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>
              Final Synthesis
            </p>
            <div className="prose" style={{ fontSize: 14, lineHeight: 1.8 }}>
              <ReactMarkdown>{chefResult.synthesis}</ReactMarkdown>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
