"use client";

import Link from "next/link";
import { Layers, GitBranch, History, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { ApiKeysModal } from "./ApiKeysModal";
import { useApiKeysStore } from "@/lib/keysStore";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const [keysOpen, setKeysOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { hasAnyKey, keys } = useApiKeysStore();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const configuredCount = Object.values(keys).filter((v) => v && v.trim().length > 0).length;

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Layers size={17} color="white" />
            </div>
            <span
              style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.02em" }}
            >
              Poly<span className="text-gradient">Mind</span>
            </span>
          </Link>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Link href="/compare" className="nav-link">
              Compare
            </Link>
            <Link href="/history" className="nav-link">
              <History size={14} />
              History
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              <GitBranch size={14} />
            </a>

            <ThemeToggle />

            {/* API Keys button */}
            <button
              id="open-api-keys-btn"
              onClick={() => setKeysOpen(true)}
              className="nav-link"
              style={{
                background: "none",
                border: (mounted && configuredCount > 0)
                  ? "1px solid rgba(16,185,129,0.4)"
                  : "1px solid rgba(139,92,246,0.3)",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                color: (mounted && configuredCount > 0) ? "var(--accent-green)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s",
                marginLeft: 4,
              }}
              title="Manage your API keys"
            >
              <Key size={13} />
              {mounted && configuredCount > 0 ? `${configuredCount} key${configuredCount !== 1 ? "s" : ""}` : "API Keys"}
            </button>
          </nav>
        </div>
      </header>

      {/* Modal (rendered at nav level so it's always on top) */}
      {keysOpen && <ApiKeysModal onClose={() => setKeysOpen(false)} />}
    </>
  );
}
