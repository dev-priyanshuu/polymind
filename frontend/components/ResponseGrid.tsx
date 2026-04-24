"use client";

import { usePolyMindStore } from "@/lib/store";
import { ResponsePane } from "./ResponsePane";

export function ResponseGrid() {
  const { activeProviders, responses, isStreaming } = usePolyMindStore();

  const hasResponses = Object.keys(responses).length > 0;

  if (!hasResponses && !isStreaming) return null;

  const cols =
    activeProviders.length === 1
      ? "repeat(1, 1fr)"
      : activeProviders.length === 2
      ? "repeat(2, 1fr)"
      : activeProviders.length <= 4
      ? "repeat(2, 1fr)"
      : "repeat(3, 1fr)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gap: 16,
        alignItems: "start",
      }}
      className="response-grid"
    >
      {activeProviders.map((pid) => {
        const response = responses[pid];
        if (!response) return null;
        return <ResponsePane key={pid} response={response} />;
      })}
    </div>
  );
}
