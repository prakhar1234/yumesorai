import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Colors ────────────────────────────────────────────────────
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand colors from core architecture
        indigo: {
          950: "#1E1B4B",
          900: "#2D2A6E",
          800: "#3730A3",
        },
        coral: {
          DEFAULT: "#FF6B6B",
          light: "#FF8A8A",
          dark: "#E85555",
        },
        offwhite: "#FAF9F6",
        // Design system tokens
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        secondary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
          DEFAULT: "#f97316",
          foreground: "#ffffff",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
          DEFAULT: "#d97706",
          foreground: "#ffffff",
        },
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
          DEFAULT: "#737373",
        },
      },

      // ── Typography ────────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      // ── Border Radius ─────────────────────────────────────────────
      borderRadius: {
        "2xs": "0.125rem",
      },

      // ── Shadows ───────────────────────────────────────────────────
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },

      // ── Animations ────────────────────────────────────────────────
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        spinner: {
          to: { transform: "rotate(360deg)" },
        },
        holoHue: {
          to: { filter: "blur(28px) hue-rotate(360deg)" },
        },
        holoHueSm: {
          to: { filter: "blur(14px) hue-rotate(360deg)" },
        },
        holoSheen: {
          "0%, 55%": { transform: "translateX(-130%) skewX(-18deg)" },
          "100%": { transform: "translateX(260%) skewX(-18deg)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spinner: "spinner 0.6s linear infinite",
        "holo-hue": "holoHue 9s linear infinite",
        "holo-hue-sm": "holoHueSm 9s linear infinite",
        "holo-sheen": "holoSheen 5.5s ease-in-out infinite",
        "holo-sheen-slow": "holoSheen 6.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
