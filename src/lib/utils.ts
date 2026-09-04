/* ============================================================
 * Fluxo — Utilitários puros (formatação, datas, CSV, download)
 * ============================================================ */

let counter = 0;
export function uid(): string {
  counter = (counter + 1) % 10000;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function brl(n: number): string {
  return BRL.format(Number.isFinite(n) ? n : 0);
}
export function brlShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000) return `R$ ${(n / 1000).toFixed(0)}k`;
  if (abs >= 10000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return brl(n);
}
export function num(n: number, dec = 0): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: dec }).format(n);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export const RANGE_PRESETS = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "ano", label: "Este ano" },
  { id: "tudo", label: "Tudo" },
];

export function presetRange(id: string, custom?: { start: string; end: string }): { start: string; end: string } {
  const today = todayISO();
  const now = new Date();
  const back = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  switch (id) {
    case "hoje": return { start: today, end: today };
    case "7d": return { start: back(6), end: today };
    case "30d": return { start: back(29), end: today };
    case "mes": return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: today };
    case "ano": return { start: `${now.getFullYear()}-01-01`, end: today };
    case "custom": return custom ?? { start: back(29), end: today };
    default: return { start: "2000-01-01", end: "2099-12-31" };
  }
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "negocio";
}

export function waLink(phone: string, msg: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}

export function download(filename: string, content: string, mime = "text/plain"): void {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => {
      const s = String(c ?? "").replace(/"/g, '""');
      return /[";\n]/.test(s) ? `"${s}"` : s;
    }).join(";"))
    .join("\n");
}

export function parseCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(cur.trim()); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur.trim()); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export function numParse(v: string | number): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = (v || "").trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export async function hashPass(p: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(`${p}::fluxo-v1`);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 5381;
    for (const c of p) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return `fb${(h >>> 0).toString(16)}`;
  }
}

export function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function productColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  const colors = ["#14684a", "#3f759c", "#c07f1d", "#8a5fb0", "#b0563f", "#2a7a5b", "#4e7d94", "#a2653a", "#5b7d3a", "#7a5c9e"];
  return colors[Math.abs(h) % colors.length];
}
