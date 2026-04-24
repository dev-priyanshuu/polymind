"use client";

import { Navbar } from "@/components/Navbar";
import { Clock, MessageSquare } from "lucide-react";

export default function HistoryPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            History
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Your past comparison sessions
          </p>
        </div>

        {/* Empty state */}
        <div
          className="glass-card"
          style={{
            padding: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Clock size={26} color="var(--accent-purple)" />
          </div>
          <div>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              No sessions yet
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 340 }}>
              Your comparison sessions will appear here once you run your first
              prompt on the Compare page. Auth & session persistence is coming in
              Sprint 4.
            </p>
          </div>
          <a href="/compare" className="btn-primary" style={{ marginTop: 8 }}>
            <MessageSquare size={15} />
            Start Comparing
          </a>
        </div>
      </main>
    </div>
  );
}
