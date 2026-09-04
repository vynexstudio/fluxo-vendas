/* ============================================================
 * Fluxo — Branding do sistema (Painel do Sistema)
 * Identidade persistida localmente e aplicada em tempo real
 * via CSS variables. Sobrevive a trocas de usuário e negócios.
 * ============================================================ */
import { useSyncExternalStore } from "react";

export interface Branding {
  appName: string;
  tagline: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  presetId: string;
  customPrimary: string | null;
  sidebarGradient: boolean;
}

export interface ThemePreset {
  id: string;
  label: string;
  swatches: [string, string, string];
  vars: Record<string, string>;
}

const KEY = "fluxo.branding.v1";

export const DEFAULT_BRANDING: Branding = {
  appName: "Fluxo",
  tagline: "GESTÃO SIMPLES",
  logoDataUrl: null,
  faviconDataUrl: null,
  presetId: "azul",
  customPrimary: null,
  sidebarGradient: false,
};

export const PRESETS: ThemePreset[] = [
  {
    id: "azul", label: "Azul Fluxo", swatches: ["#0047b3", "#0066ff", "#12bfff"],
    vars: {
      "--color-pine-50": "#eef4ff", "--color-pine-100": "#dce9ff", "--color-pine-200": "#b8d2ff",
      "--color-pine-300": "#8ab5ff", "--color-pine-400": "#5292ff", "--color-pine-500": "#1f73ff",
      "--color-pine-600": "#0066ff", "--color-pine-700": "#0052d9", "--color-pine-800": "#093a8c",
      "--color-pine-900": "#082c60", "--color-pine-950": "#06203f",
      "--color-leaf-200": "#eaf6ff", "--color-leaf-300": "#aee2ff", "--color-leaf-400": "#4fc8ff",
      "--grad-1": "#0047b3", "--grad-2": "#0066ff", "--grad-3": "#12bfff",
    },
  },
  {
    id: "esmeralda", label: "Esmeralda", swatches: ["#0e5c3d", "#128a5c", "#2fc98a"],
    vars: {
      "--color-pine-50": "#ecf7f1", "--color-pine-100": "#d5eedf", "--color-pine-200": "#a9dcc0",
      "--color-pine-300": "#74c39b", "--color-pine-400": "#3fa576", "--color-pine-500": "#1d8a5c",
      "--color-pine-600": "#12724b", "--color-pine-700": "#0e5c3d", "--color-pine-800": "#0b4830",
      "--color-pine-900": "#093a27", "--color-pine-950": "#05271a",
      "--color-leaf-200": "#eafff4", "--color-leaf-300": "#8df0c0", "--color-leaf-400": "#4fe39a",
      "--grad-1": "#0e5c3d", "--grad-2": "#128a5c", "--grad-3": "#2fc98a",
    },
  },
  {
    id: "vinho", label: "Vinho", swatches: ["#861e2f", "#a62639", "#e05c74"],
    vars: {
      "--color-pine-50": "#fdf0f2", "--color-pine-100": "#fadde1", "--color-pine-200": "#f3b3bc",
      "--color-pine-300": "#e67f8e", "--color-pine-400": "#d24d61", "--color-pine-500": "#b83049",
      "--color-pine-600": "#a62639", "--color-pine-700": "#861e2f", "--color-pine-800": "#671825",
      "--color-pine-900": "#4d121c", "--color-pine-950": "#360c14",
      "--color-leaf-200": "#fff0f3", "--color-leaf-300": "#ffb3c1", "--color-leaf-400": "#ff9fb0",
      "--grad-1": "#861e2f", "--grad-2": "#a62639", "--grad-3": "#e05c74",
    },
  },
  {
    id: "ambar", label: "Âmbar", swatches: ["#855410", "#c07f1d", "#e8b763"],
    vars: {
      "--color-pine-50": "#fdf6e9", "--color-pine-100": "#faead0", "--color-pine-200": "#f3d49e",
      "--color-pine-300": "#e8b763", "--color-pine-400": "#d99a31", "--color-pine-500": "#c07f1d",
      "--color-pine-600": "#a56a14", "--color-pine-700": "#855410", "--color-pine-800": "#66400e",
      "--color-pine-900": "#4c300c", "--color-pine-950": "#362108",
      "--color-leaf-200": "#fff8e8", "--color-leaf-300": "#ffe2ac", "--color-leaf-400": "#ffd58a",
      "--grad-1": "#855410", "--grad-2": "#c07f1d", "--grad-3": "#e8b763",
    },
  },
  {
    id: "grafite", label: "Grafite", swatches: ["#303a47", "#475569", "#6f8299"],
    vars: {
      "--color-pine-50": "#f3f5f8", "--color-pine-100": "#e4e9f0", "--color-pine-200": "#c6d0de",
      "--color-pine-300": "#9fb0c5", "--color-pine-400": "#6f8299", "--color-pine-500": "#475569",
      "--color-pine-600": "#3b4757", "--color-pine-700": "#303a47", "--color-pine-800": "#262e38",
      "--color-pine-900": "#1d242c", "--color-pine-950": "#141a20",
      "--color-leaf-200": "#f3f6fa", "--color-leaf-300": "#c6d3e2", "--color-leaf-400": "#9fb0c5",
      "--grad-1": "#303a47", "--grad-2": "#475569", "--grad-3": "#6f8299",
    },
  },
];

/* ---------------- utilidades de cor ---------------- */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
}

export function varsFor(b: Branding): Record<string, string> {
  const preset = PRESETS.find((p) => p.id === b.presetId) ?? PRESETS[0];
  const vars = { ...preset.vars };
  if (b.customPrimary && /^#[0-9a-fA-F]{6}$/.test(b.customPrimary)) {
    const P = b.customPrimary;
    Object.assign(vars, {
      "--color-pine-50": mix(P, "#ffffff", 0.9), "--color-pine-100": mix(P, "#ffffff", 0.78),
      "--color-pine-200": mix(P, "#ffffff", 0.6), "--color-pine-300": mix(P, "#ffffff", 0.42),
      "--color-pine-400": mix(P, "#ffffff", 0.22), "--color-pine-500": P,
      "--color-pine-600": mix(P, "#000000", 0.12), "--color-pine-700": mix(P, "#000000", 0.26),
      "--color-pine-800": mix(P, "#000000", 0.42), "--color-pine-900": mix(P, "#000000", 0.58),
      "--color-pine-950": mix(P, "#000000", 0.72),
      "--color-leaf-200": mix(P, "#ffffff", 0.72), "--color-leaf-300": mix(P, "#ffffff", 0.55),
      "--color-leaf-400": mix(P, "#ffffff", 0.45),
      "--grad-1": mix(P, "#000000", 0.3), "--grad-2": P, "--grad-3": mix(P, "#ffffff", 0.45),
    });
  }
  return vars;
}

function defaultFavicon(g1: string, g2: string, g3: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${g1}'/><stop offset='.55' stop-color='${g2}'/><stop offset='1' stop-color='${g3}'/></linearGradient></defs><rect width='64' height='64' rx='14' fill='url(#g)'/><path d='M12 40 H24 L30 20 L38 50 L45 32 H54' fill='none' stroke='#ffffff' stroke-opacity='.92' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ---------------- armazenamento e aplicação ---------------- */

function load(): Branding {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_BRANDING, ...(JSON.parse(raw) as Partial<Branding>) };
  } catch { /* padrão */ }
  return { ...DEFAULT_BRANDING };
}

let cache: Branding = typeof window !== "undefined" ? load() : { ...DEFAULT_BRANDING };
const listeners = new Set<() => void>();

export function getBranding(): Branding {
  return cache;
}

export function applyBranding(): void {
  if (typeof document === "undefined") return;
  const b = cache;
  const vars = varsFor(b);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = b.faviconDataUrl && b.faviconDataUrl.startsWith("data:image/svg") ? "image/svg+xml" : b.faviconDataUrl ? "image/png" : "image/svg+xml";
  link.href = b.faviconDataUrl ?? defaultFavicon(vars["--grad-1"], vars["--grad-2"], vars["--grad-3"]);

  const meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (meta) meta.content = vars["--color-pine-700"] ?? "#0052d9";

  document.title = `${b.appName} — Gestão do seu negócio`;
}

export function setBranding(partial: Partial<Branding>): void {
  cache = { ...cache, ...partial };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* quota */ }
  applyBranding();
  listeners.forEach((l) => l());
}

export function resetBranding(): void {
  cache = { ...DEFAULT_BRANDING };
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  applyBranding();
  listeners.forEach((l) => l());
}

export function subscribeBranding(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useBranding(): Branding {
  return useSyncExternalStore(subscribeBranding, getBranding);
}

/* aplica imediatamente ao carregar o módulo (evita flash do tema antigo) */
applyBranding();
