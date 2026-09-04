/* ============================================================
 * Fluxo — Design System: primitivos de UI reutilizáveis
 * ============================================================ */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";
import {
  X, CheckCircle2, AlertTriangle, Info, AlertCircle, ChevronDown, Search,
  Inbox, Plus, Minus,
} from "lucide-react";
import { cx } from "../lib/utils";

/* ---------------- Toasts ---------------- */

export type ToastKind = "success" | "warn" | "danger" | "info";
interface Toast { id: number; kind: ToastKind; msg: string }
const ToastCtx = createContext<{ push: (kind: ToastKind, msg: string) => void }>(null!);
export const useToast = () => useContext(ToastCtx);

let toastSeq = 1;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (kind: ToastKind, msg: string) => {
    const id = toastSeq++;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  };
  const icon = (k: ToastKind) =>
    k === "success" ? <CheckCircle2 size={17} className="text-pine-500 shrink-0" /> :
    k === "danger" ? <AlertCircle size={17} className="text-danger shrink-0" /> :
    k === "warn" ? <AlertTriangle size={17} className="text-warn shrink-0" /> :
    <Info size={17} className="text-info shrink-0" />;
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed z-[90] right-4 top-4 flex flex-col gap-2 w-[min(92vw,360px)]" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="animate-slide-in flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-pop">
            {icon(t.kind)}
            <p className="text-[13px] leading-snug text-ink flex-1">{t.msg}</p>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-ink-faint hover:text-ink" aria-label="Fechar aviso">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Botões ---------------- */

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "soft" | "dark";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
}
export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-pine-600 text-leaf-200 hover:bg-pine-700 active:bg-pine-800 shadow-sm",
    dark: "bg-pine-900 text-leaf-300 hover:bg-pine-950",
    outline: "border border-line-strong bg-surface text-ink hover:bg-pine-50 hover:border-pine-300",
    ghost: "text-ink-soft hover:bg-pine-50 hover:text-pine-700",
    danger: "bg-danger-soft text-danger border border-danger/25 hover:bg-danger hover:text-white",
    soft: "bg-pine-100 text-pine-800 hover:bg-pine-200",
  };
  const s = { sm: "h-8 px-3 text-[12.5px] gap-1.5", md: "h-10 px-4 text-[13.5px] gap-2", lg: "h-12 px-5 text-[15px] gap-2" };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 select-none",
        "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        v[variant], s[size], className,
      )}
      {...rest}
    />
  );
}

export function IconBtn({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx("inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-pine-50 hover:text-pine-700 disabled:opacity-35 disabled:pointer-events-none", className)}
      {...rest}
    />
  );
}

/* ---------------- Formulário ---------------- */

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
      {error && <span className="mt-1 flex items-center gap-1 text-[12px] font-medium text-danger"><AlertCircle size={12} /> {error}</span>}
    </label>
  );
}

const inputCls = "w-full h-10 rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-ink-faint transition-colors focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/20 disabled:opacity-50";

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx(inputCls, invalid && "border-danger focus:border-danger focus:ring-danger/20", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(inputCls, "appearance-none pr-9 cursor-pointer", className)} {...rest}>{children}</select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "h-auto min-h-[84px] py-2.5 resize-y", className)} {...rest} />;
}

/* ---------------- Badge ---------------- */

type Tone = "green" | "red" | "amber" | "blue" | "gray" | "lime" | "pine";
export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const t: Record<Tone, string> = {
    green: "bg-pine-100 text-pine-800",
    red: "bg-danger-soft text-danger",
    amber: "bg-warn-soft text-warn",
    blue: "bg-info-soft text-info",
    gray: "bg-line/60 text-ink-soft",
    lime: "bg-leaf-300 text-pine-950",
    pine: "bg-pine-800 text-leaf-300",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", t[tone], className)}>
      {children}
    </span>
  );
}

/* ---------------- Card / Stat ---------------- */

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 className="font-display text-[14px] font-semibold text-ink">{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, icon, tone = "default", onClick }: {
  label: string; value: string; sub?: ReactNode; icon?: ReactNode;
  tone?: "default" | "green" | "red" | "amber" | "dark"; onClick?: () => void;
}) {
  const tones = {
    default: "bg-surface border-line",
    green: "bg-pine-50 border-pine-200",
    red: "bg-danger-soft border-danger/20",
    amber: "bg-warn-soft border-warn/20",
    dark: "bg-pine-900 border-pine-800 text-leaf-200",
  };
  return (
    <div
      onClick={onClick}
      className={cx("rounded-xl border p-4 shadow-card transition-transform duration-150", tones[tone], onClick && "cursor-pointer hover:-translate-y-0.5")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cx("text-[11.5px] font-semibold uppercase tracking-wider", tone === "dark" ? "text-pine-300" : "text-ink-soft")}>{label}</p>
        {icon && <span className={tone === "dark" ? "text-leaf-400" : "text-pine-600"}>{icon}</span>}
      </div>
      <p className={cx("tnum mt-2 font-display text-[21px] font-bold leading-none sm:text-[23px]", tone === "dark" ? "text-leaf-300" : "text-ink")}>{value}</p>
      {sub && <div className={cx("mt-2 text-[12px]", tone === "dark" ? "text-pine-300" : "text-ink-soft")}>{sub}</div>}
    </div>
  );
}

/* ---------------- Modal / Confirm / Drawer ---------------- */

export function Modal({ open, onClose, title, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button aria-label="Fechar" className="absolute inset-0 bg-pine-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx("animate-scale-in relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl", w)}>
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onYes, title, msg, yesLabel = "Confirmar", danger }: {
  open: boolean; onClose: () => void; onYes: () => void; title: string; msg: ReactNode; yesLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => { onYes(); onClose(); }}>{yesLabel}</Button>
        </>
      }>
      <div className="text-[14px] leading-relaxed text-ink-soft">{msg}</div>
    </Modal>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      <button aria-label="Fechar" className="absolute inset-0 bg-pine-950/45" onClick={onClose} />
      <div className="animate-slide-in absolute inset-y-0 right-0 flex w-[min(94vw,430px)] flex-col bg-surface shadow-pop">
        <header className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h2 className="font-display text-[15px] font-bold">{title}</h2>
          <IconBtn label="Fechar" onClick={onClose}><X size={18} /></IconBtn>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Empty / Spinner ---------------- */

export function Empty({ icon, title, desc, action }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-pine-500">
        {icon ?? <Inbox size={26} />}
      </span>
      <h3 className="font-display text-[16px] font-bold text-ink">{title}</h3>
      {desc && <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="Carregando">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Segmented / Stepper ---------------- */

export function Seg<T extends string>({ options, value, onChange, className }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cx("inline-flex flex-wrap gap-1 rounded-lg border border-line bg-paper p-1", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id} role="tab" aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all",
            value === o.id ? "bg-pine-900 text-leaf-300 shadow-sm" : "text-ink-soft hover:text-pine-700",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface">
      <button type="button" aria-label="Diminuir" className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-danger disabled:opacity-30" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus size={14} />
      </button>
      <span className="tnum w-9 text-center text-[13.5px] font-bold">{value}</span>
      <button type="button" aria-label="Aumentar" className="flex h-full w-8 items-center justify-center text-ink-soft hover:text-pine-600" onClick={() => onChange(value + 1)}>
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ---------------- SearchSelect (autocomplete) ---------------- */

export interface Opt { id: string; label: string; sub?: string; right?: string }
export function SearchSelect({ options, value, onChange, placeholder = "Buscar…", allowClear = true, autoFocus }: {
  options: Opt[]; value: string; onChange: (id: string) => void; placeholder?: string; allowClear?: boolean; autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t) || (o.sub ?? "").toLowerCase().includes(t));
  }, [options, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => { setHi(0); }, [q]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus={autoFocus}
          className={cx(inputCls, "pl-9", selected && !open && "pr-8")}
          placeholder={placeholder}
          value={open ? q : selected?.label ?? ""}
          onFocus={() => { setOpen(true); setQ(""); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(filtered.length - 1, h + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); const o = filtered[hi]; if (o) { onChange(o.id); setOpen(false); } }
            else if (e.key === "Escape") setOpen(false);
          }}
          role="combobox" aria-expanded={open} aria-label={placeholder}
        />
        {selected && !open && allowClear && (
          <button type="button" aria-label="Limpar seleção" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-danger"
            onClick={() => onChange("")}>
            <X size={15} />
          </button>
        )}
      </div>
      {open && (
        <ul className="animate-scale-in absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-pop">
          {filtered.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-ink-faint">Nada encontrado.</li>}
          {filtered.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                className={cx("flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13.5px]", i === hi ? "bg-pine-50" : "hover:bg-paper", o.id === value && "font-semibold text-pine-700")}
                onMouseEnter={() => setHi(i)}
                onClick={() => { onChange(o.id); setOpen(false); }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-[11.5px] text-ink-faint">{o.sub}</span>}
                </span>
                {o.right && <span className="tnum shrink-0 text-[12px] font-semibold text-ink-soft">{o.right}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Tabela ---------------- */

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return (
    <th className={cx("whitespace-nowrap border-b border-line px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint", right ? "text-right" : "text-left", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <td className={cx("border-b border-line/70 px-3 py-2.5 text-[13.5px] text-ink", right && "text-right", className)}>{children}</td>;
}
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("overflow-x-auto rounded-xl border border-line bg-surface shadow-card", className)}><table className="w-full border-collapse">{children}</table></div>;
}

/* ---------------- Diversos ---------------- */

export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="animate-fade-up mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] font-bold leading-tight text-ink sm:text-[26px]">{title}</h1>
        {desc && <p className="mt-1 text-[13.5px] text-ink-soft">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function ProductThumb({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  const colors = ["#14684a", "#3f759c", "#c07f1d", "#8a5fb0", "#b0563f", "#2a7a5b", "#4e7d94", "#a2653a", "#5b7d3a", "#7a5c9e"];
  const bg = colors[Math.abs(h) % colors.length];
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg font-display font-bold text-white/90"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${bg}, ${bg}cc)`, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cx("tnum", value < 0 && "text-danger", className)}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)}</span>;
}
