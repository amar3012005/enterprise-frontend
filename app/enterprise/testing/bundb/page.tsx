"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import BundBTaraVoiceWidget from "@/components/testing/BundBTaraVoiceWidget";

export default function BundBTestingPage(): React.ReactElement {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#0A0A0A" : "#111111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#EBE5DF",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: "#A63E1B",
          marginBottom: "8px",
        }}
      >
        BundB Voice Agent &mdash; Testing
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "rgba(235, 229, 223, 0.5)",
          marginBottom: "40px",
        }}
      >
        Click the orb in the bottom-right corner to start a voice session.
      </p>

      <BundBTaraVoiceWidget
        config={{
          tenantId: "bundb",
          agentId: "bundb",
          agentName: "BUNDB Agent",
          language: "de",
        }}
      />
    </div>
  );
}
