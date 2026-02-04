/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,tsx,ts}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        calm: {
          cream: "#f7f5f0",
          parchment: "#f0ede6",
          stone: "#e8e4db",
          sage: "#7a9e7e",
          lavender: "#a8b4c4",
          sand: "#d4b896",
          charcoal: "#3d4043",
        },
        neon: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
          pink: "#ec4899",
          teal: "#14b8a6",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
        },
        bg: {
          deep: "#050505",
          glass: "rgba(255, 255, 255, 0.03)",
        },
        // shadcn/ui CSS variables
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        "soft-sm": "0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)",
        "soft-md": "0 4px 12px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03)",
        "soft-lg":
          "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)",
        "soft-xl": "0 20px 50px -12px rgba(0,0,0,0.15)",
        "glow-blue": "0 0 15px rgba(59, 130, 246, 0.12)",
        "glow-purple": "0 0 15px rgba(139, 92, 246, 0.12)",
        "glow-pink": "0 0 15px rgba(236, 72, 153, 0.12)",
        "glow-teal": "0 0 15px rgba(20, 184, 166, 0.12)",
      },
      borderRadius: {
        neu: "24px",
        "neu-sm": "16px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        neu: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "SF Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
