"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getSharedSession } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { ChefHat, TrendingUp, CheckCircle2, AlertTriangle, XCircle, Clock, Hash, Coins } from "lucide-react";

const PROVIDER_COLOR: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#4285f4",
  xai: "#a855f7",
  cohere: "#39d3c3",
  mistral: "#f97316",
};

export default function SharePage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getSharedSession(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 24px" }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <Navbar />
        <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--text-muted)" }}>
          <p>Session not found or has been removed.</p>
        </div>
      </div>
    );
  }

  const { session, responses, chef } = data;
  const confidencePct = chef ? Math.round(chef.confidence_score * 100) : 0;
  const confidenceLevel = confidencePct >= 70 ? "high" : confidencePct >= 40 ? "medium" : "low";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div className="stat-badge" style={{ marginBottom: 12, display: "inline-flex" }}>
            Read-only · Shared session
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              maxWidth: 800,
              lineHeight: 1.35,
            }}
          >
            {session.prompt}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
            {new Date(session.created_at).toLocaleString()} ·{" "}
            {session.models_used.join(", ")} ·{" "}
            ${session.total_cost_usd.toFixed(5)} total cost
          </p>
        </div>

        {/* Responses */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: responses.length === 1 ? "1fr" : responses.length === 2 ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {responses.map((r: any) => (
            <div key={r.model_id} className="response-pane">
              <div className="pane-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 9, height: 9, borderRadius: "50%",
                      background: PROVIDER_COLOR[r.provider] || "#888",
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.model_id}</span>
                </div>
              </div>
              <div className="pane-body">
                {r.error ? (
                  <p style={{ color: "var(--accent-red)", fontSize: 13 }}>{r.error}</p>
                ) : (
                  <div className="prose-dark">
                    <ReactMarkdown>{r.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="pane-footer">
                <span className="stat-badge"><Clock size={10} />{r.latency_ms > 1000 ? `${(r.latency_ms/1000).toFixed(1)}s` : `${Math.round(r.latency_ms)}ms`}</span>
                <span className="stat-badge"><Hash size={10} />{r.input_tokens + r.output_tokens} tokens</span>
                <span className="stat-badge"><Coins size={10} />${r.cost_usd.toFixed(5)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chef panel */}
        {chef && (
          <div className="chef-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChefHat size={18} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Chef Summary</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>by {chef.chef_model}</p>
              </div>
              <div className={`confidence-badge ${confidenceLevel}`} style={{ marginLeft: "auto" }}>
                <TrendingUp size={13} />
                {confidencePct}% Confidence
              </div>
            </div>

            {chef.verified_claims?.map((c: string, i: number) => (
              <div key={i} className="claim-item verified"><CheckCircle2 size={13} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: 2 }} /><span>{c}</span></div>
            ))}
            {chef.disputed_claims?.map((c: string, i: number) => (
              <div key={i} className="claim-item disputed"><AlertTriangle size={13} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} /><span>{c}</span></div>
            ))}
            {chef.unverified_claims?.map((c: string, i: number) => (
              <div key={i} className="claim-item unverified"><XCircle size={13} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 2 }} /><span>{c}</span></div>
            ))}

            <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
            <div className="prose-dark" style={{ fontSize: 14 }}>
              <ReactMarkdown>{chef.synthesis}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
