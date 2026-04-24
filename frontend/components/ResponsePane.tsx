"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, AlertCircle, Clock, Coins, Hash } from "lucide-react";
import { ModelResponse } from "@/lib/store";

interface ResponsePaneProps {
  response: ModelResponse;
}

const PROVIDER_COLOR: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#4285f4",
  xai: "#a855f7",
  cohere: "#39d3c3",
  mistral: "#f97316",
};

function formatCost(usd: number): string {
  if (usd === 0) return "–";
  if (usd < 0.001) return `<$0.001`;
  return `$${usd.toFixed(4)}`;
}

function formatMs(ms: number): string {
  if (ms === 0) return "–";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

export function ResponsePane({ response }: ResponsePaneProps) {
  const [copied, setCopied] = useState(false);
  const color = PROVIDER_COLOR[response.provider] || "#888";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="response-pane">
      {/* Header */}
      <div className="pane-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: color,
              display: "inline-block",
              flexShrink: 0,
              boxShadow: `0 0 8px ${color}60`,
            }}
          />
          <span
            style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}
          >
            {response.displayName}
          </span>
          {response.streaming && (
            <span
              style={{
                fontSize: 11,
                color,
                padding: "2px 7px",
                borderRadius: 999,
                background: `${color}20`,
                border: `1px solid ${color}40`,
                fontWeight: 500,
              }}
            >
              streaming
            </span>
          )}
          {!response.streaming && response.success && response.content && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent-green)",
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                fontWeight: 500,
              }}
            >
              done
            </span>
          )}
          {!response.success && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent-red)",
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                fontWeight: 500,
              }}
            >
              failed
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            id={`copy-${response.modelId}`}
            className="btn-icon"
            onClick={handleCopy}
            title="Copy response"
            disabled={!response.content}
          >
            {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="pane-body">
        {response.error ? (
          <div className="error-pane">
            <AlertCircle size={32} color="var(--accent-red)" style={{ opacity: 0.6 }} />
            <p style={{ color: "var(--accent-red)", fontSize: 13, maxWidth: 280 }}>
              {response.error}
            </p>
          </div>
        ) : response.content ? (
          <div className={`prose ${response.streaming ? "streaming-cursor" : ""}`}>
            <ReactMarkdown>{response.content}</ReactMarkdown>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: 120,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div className="spinner" style={{ borderTopColor: color }} />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Waiting for first token…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="pane-footer">
        <span className="stat-badge" title="Latency to first byte">
          <Clock size={10} />
          {formatMs(response.latencyMs)}
        </span>
        <span className="stat-badge" title="Tokens used">
          <Hash size={10} />
          {response.inputTokens + response.outputTokens > 0
            ? `${response.inputTokens + response.outputTokens} tokens`
            : "–"}
        </span>
        <span className="stat-badge" title="Estimated cost">
          <Coins size={10} />
          {formatCost(response.costUsd)}
        </span>
      </div>
    </div>
  );
}
