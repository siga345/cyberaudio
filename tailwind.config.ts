import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--color-bg)",
          panel: "var(--color-panel)",
          elevated: "var(--color-elevated)",
          border: "var(--color-border)",
          ink: "var(--color-ink)",
          muted: "var(--color-muted)",
          primary: "var(--color-primary)",
          cyan: "var(--color-cyan)",
          magenta: "var(--color-magenta)"
        }
      },
      boxShadow: {
        neon:
          "0 28px 80px rgba(0,0,0,0.58), 0 0 0 1px rgba(255,68,88,0.2), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 32px rgba(85,247,255,0.08)",
        hud:
          "0 24px 72px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(255,62,89,0.16)"
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(255,70,93,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,70,93,0.08) 1px, transparent 1px)",
        "cyber-vignette":
          "radial-gradient(circle at top, rgba(255,230,0,0.12), transparent 30%), radial-gradient(circle at 82% 22%, rgba(85,247,255,0.16), transparent 24%), radial-gradient(circle at 18% 100%, rgba(255,62,89,0.1), transparent 26%)"
      }
    }
  },
  plugins: []
};

export default config;
