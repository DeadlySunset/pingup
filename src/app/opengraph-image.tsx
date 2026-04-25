import { ImageResponse } from "next/og";

export const alt = "Pingup — uptime and cron monitoring for indie devs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #18181b 0%, #1c1917 50%, #292524 100%)",
          color: "#fafafa",
          padding: "80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#ffffff",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span>ping</span>
            <span style={{ color: "#fb923c" }}>up</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              maxWidth: 980,
            }}
          >
            Monitoring that catches silent failures.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#a1a1aa",
              maxWidth: 920,
              lineHeight: 1.3,
            }}
          >
            Heartbeat & ping monitors. Email and Telegram alerts. Pay in TON.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(234, 88, 12, 0.18)",
              border: "1px solid rgba(234, 88, 12, 0.45)",
              color: "#fb923c",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            pingup.dev
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>
            for indie devs · TON-native
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
