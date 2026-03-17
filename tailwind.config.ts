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
        neon: "0 0 0 1px rgba(73,246,255,0.12), 0 0 28px rgba(73,246,255,0.16), 0 0 48px rgba(255,79,216,0.08)"
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(73,246,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(73,246,255,0.07) 1px, transparent 1px)",
        "cyber-vignette":
          "radial-gradient(circle at top, rgba(248,239,0,0.16), transparent 32%), radial-gradient(circle at 85% 18%, rgba(255,79,216,0.14), transparent 28%), radial-gradient(circle at 15% 100%, rgba(73,246,255,0.18), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
