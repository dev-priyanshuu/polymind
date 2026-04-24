"use client";

import { useState } from "react";
import { Key, X, ExternalLink, Eye, EyeOff, Check, Trash2, AlertCircle } from "lucide-react";
import { useApiKeysStore, PROVIDER_CONFIGS, ProviderId } from "@/lib/keysStore";

interface ApiKeysModalProps {
  onClose: () => void;
}

export function ApiKeysModal({ onClose }: ApiKeysModalProps) {
  const { keys, setKey, clearKey, clearAll, hasAnyKey } = useApiKeysStore();
  const [draftKeys, setDraftKeys] = useState<Partial<Record<ProviderId, string>>>(
    Object.fromEntries(
      Object.entries(keys).map(([k, v]) => [k, v || ""])
    ) as Partial<Record<ProviderId, string>>
  );
  const [visible, setVisible] = useState<Partial<Record<ProviderId, boolean>>>({});
  const [saved, setSaved] = useState(false);

  const toggleVisible = (id: ProviderId) =>
    setVisible((v) => ({ ...v, [id]: !v[id] }));

  const handleSave = () => {
    for (const [provider, key] of Object.entries(draftKeys)) {
      const k = key?.trim() || "";
      if (k.length > 0) {
        setKey(provider as ProviderId, k);
      } else {
        clearKey(provider as ProviderId);
      }
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClearAll = () => {
    clearAll();
    setDraftKeys({});
  };

  const configuredCount = Object.values(draftKeys).filter((v) => v && v.trim().length > 0).length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(640px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-card)",
          color: "var(--text-primary)",
        }}
        className="animate-modal-in"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--gradient-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Key size={17} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                API Keys
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {configuredCount} of {PROVIDER_CONFIGS.length} configured
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" id="close-keys-modal">
            <X size={16} />
          </button>
        </div>

        {/* Notice */}
        <div
          style={{
            margin: "16px 24px 0",
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(139,92,246,0.06)",
            border: "1px solid var(--border-accent)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={15} color="var(--accent-purple)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>
            Keys are stored only in your browser (localStorage) and sent directly with each request.
          </p>
        </div>

        {/* Key inputs */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {PROVIDER_CONFIGS.map((cfg) => {
            const hasKey = !!(draftKeys[cfg.id] && draftKeys[cfg.id]!.trim().length > 0);
            const isVisible = !!visible[cfg.id];

            return (
              <div key={cfg.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: cfg.color,
                        display: "inline-block",
                      }}
                    />
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {cfg.label}
                    </label>
                    {hasKey && (
                      <span style={{ fontSize: 11, color: "var(--accent-green)", fontWeight: 500 }}>
                        ✓ Set
                      </span>
                    )}
                  </div>
                  <a
                    href={cfg.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    Get key <ExternalLink size={10} />
                  </a>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      id={`key-input-${cfg.id}`}
                      type={isVisible ? "text" : "password"}
                      placeholder={cfg.placeholder}
                      value={draftKeys[cfg.id] || ""}
                      onChange={(e) =>
                        setDraftKeys((prev) => ({ ...prev, [cfg.id]: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        background: "var(--bg-secondary)",
                        border: `1px solid ${hasKey ? "var(--accent-green)" : "var(--border)"}`,
                        borderRadius: 9,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        padding: "9px 40px 9px 12px",
                        outline: "none",
                        fontFamily: "monospace",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisible(cfg.id)}
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        display: "flex",
                      }}
                    >
                      {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {hasKey && (
                    <button
                      className="btn-icon"
                      onClick={() => setDraftKeys((prev) => ({ ...prev, [cfg.id]: "" }))}
                      style={{ flexShrink: 0 }}
                    >
                      <Trash2 size={13} color="var(--accent-red)" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px 20px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button onClick={handleClearAll} className="btn-secondary" style={{ color: "var(--accent-red)" }}>
            Clear all
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button id="save-api-keys-btn" onClick={handleSave} className="btn-primary">
              {saved ? <Check size={14} /> : "Save Keys"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
