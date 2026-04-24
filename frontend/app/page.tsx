"use client";

import Link from "next/link";
import { ArrowRight, Zap, ChefHat, BarChart2, Shield } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const FEATURES = [
  {
    icon: <Zap size={22} />,
    title: "Parallel Fan-out",
    description:
      "Fire up to 6 AI models simultaneously. No tab switching. No copy-paste. One prompt, all answers instantly.",
    color: "#8b5cf6",
  },
  {
    icon: <ChefHat size={22} />,
    title: "Chef Aggregator",
    description:
      "A designated \"chef\" model reads every response and produces a synthesized answer — with verified, disputed, and unverified claims labeled.",
    color: "#3b82f6",
  },
  {
    icon: <BarChart2 size={22} />,
    title: "Confidence Scores",
    description:
      "See what percentage of models agree on core claims. Green = consensus. Amber = disputed. Red = outlier claim.",
    color: "#06b6d4",
  },
  {
    icon: <Shield size={22} />,
    title: "Your Keys, Your Cost",
    description:
      "Connect your own API keys. We never store them in plaintext — AES-256 encrypted. Pay only what providers charge.",
    color: "#10b981",
  },
];

const MODELS = [
  { name: "GPT-4o", color: "#10a37f", provider: "OpenAI" },
  { name: "Claude Sonnet", color: "#d97757", provider: "Anthropic" },
  { name: "Gemini Flash", color: "#4285f4", provider: "Google" },
  { name: "Grok 3", color: "#a855f7", provider: "xAI" },
  { name: "Command R+", color: "#39d3c3", provider: "Cohere" },
  { name: "Mistral Large", color: "#f97316", provider: "Mistral" },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />

      {/* Background glows */}
      <div
        className="bg-glow"
        style={{ top: -100, left: "50%", transform: "translateX(-50%)" }}
      />

      {/* Hero */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "100px 24px 80px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 999,
            border: "1px solid rgba(139,92,246,0.3)",
            background: "rgba(139,92,246,0.08)",
            fontSize: 13,
            color: "var(--accent-purple)",
            fontWeight: 500,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-purple)",
              display: "inline-block",
              animation: "pulse-glow 2s infinite",
            }}
          />
          Phase 1 — Now live
        </div>

        <h1
          style={{
            fontSize: "clamp(42px, 7vw, 72px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            marginBottom: 20,
            color: "var(--text-primary)",
          }}
        >
          Stop trusting one AI.
          <br />
          <span className="text-gradient">Validate with many.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            maxWidth: 620,
            margin: "0 auto 40px",
            lineHeight: 1.7,
          }}
        >
          PolyMind fires your prompt at 6 AI models simultaneously, then has a
          "chef" model synthesize the best answer — showing exactly where models
          agree, disagree, and contradict each other.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/compare" className="btn-primary" style={{ fontSize: 16, padding: "13px 28px" }}>
            Start Comparing
            <ArrowRight size={18} />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ fontSize: 16, padding: "13px 28px" }}
          >
            View on GitHub
          </a>
        </div>

        {/* Model pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            marginTop: 56,
          }}
        >
          {MODELS.map((m) => (
            <div
              key={m.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 14px",
                borderRadius: 999,
                border: `1px solid ${m.color}30`,
                background: `${m.color}10`,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: m.color,
                  display: "inline-block",
                  boxShadow: `0 0 8px ${m.color}80`,
                }}
              />
              {m.name}
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.provider}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto 80px",
          padding: "0 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            One prompt. All answers.
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            See what each model says — and what the consensus actually is.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card" style={{ padding: 24 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${f.color}18`,
                  border: `1px solid ${f.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: "var(--text-primary)",
                  marginBottom: 8,
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: 700,
          margin: "0 auto 100px",
          padding: "0 24px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 24,
            padding: "48px 32px",
          }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: 12,
            }}
          >
            Ready to stop guessing?
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 28 }}>
            PolyMind is free during Phase 1. No credit card. Bring your own API keys.
          </p>
          <Link href="/compare" className="btn-primary" style={{ fontSize: 16, padding: "13px 32px" }}>
            Try it now
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        PolyMind — Phase 1 Foundation · Built with FastAPI + Next.js
      </footer>
    </div>
  );
}
