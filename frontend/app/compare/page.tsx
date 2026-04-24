"use client";

import { Navbar } from "@/components/Navbar";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { ResponseGrid } from "@/components/ResponseGrid";
import { ChefPanel } from "@/components/ChefPanel";
import { usePolyMindStore } from "@/lib/store";
import { Share2, Check } from "lucide-react";
import { useState } from "react";

export default function ComparePage() {
  const { shareToken, sessionId, chefResult, chefLoading, responses } = usePolyMindStore();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasResults = Object.keys(responses).length > 0;
  const totalCost = Object.values(responses).reduce((sum, r) => sum + (r.costUsd || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Compare
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Select models → enter your prompt → see all responses stream in simultaneously
          </p>
        </div>

        {/* Input Panel */}
        <div
          className="glass-card"
          style={{ padding: "20px 24px", marginBottom: 24 }}
        >
          {/* Model selector */}
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 10,
              }}
            >
              Models
            </p>
            <ModelSelector />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", marginBottom: 16 }} />

          {/* Prompt input */}
          <PromptInput />
        </div>

        {/* Session toolbar (shows after a response) */}
        {hasResults && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {totalCost > 0 && (
                <span className="stat-badge">
                  Total cost: ${totalCost.toFixed(5)}
                </span>
              )}
            </div>
            {shareToken && (
              <button
                id="share-btn"
                onClick={handleShare}
                className="btn-secondary"
                style={{ fontSize: 13 }}
              >
                {copied ? <Check size={14} color="var(--accent-green)" /> : <Share2 size={14} />}
                {copied ? "Copied!" : "Share session"}
              </button>
            )}
          </div>
        )}

        {/* Response Grid */}
        <ResponseGrid />

        {/* Chef Panel */}
        <div style={{ marginTop: 28 }}>
          <ChefPanel />
        </div>
      </main>
    </div>
  );
}
