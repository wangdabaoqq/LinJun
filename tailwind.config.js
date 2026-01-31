/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,tsx,ts}"],
  darkMode: "class",
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
        "neu-raised":
          "6px 6px 16px rgba(166, 160, 148, 0.35), -6px -6px 16px rgba(255, 255, 255, 0.9)",
        "neu-inset":
          "inset 4px 4px 10px rgba(166, 160, 148, 0.25), inset -4px -4px 10px rgba(255, 255, 255, 0.8)",
        "neu-btn":
          "4px 4px 12px rgba(166, 160, 148, 0.28), -4px -4px 12px rgba(255, 255, 255, 0.85)",
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
