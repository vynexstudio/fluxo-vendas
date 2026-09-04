/* ============================================================
 * Fluxo — Layout: sidebar, topbar, busca global, notificações
 * ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Globe, Coins, Package, Boxes,
  Truck, Wallet, ArrowDownCircle, ArrowUpCircle, Receipt, TrendingUp, PiggyBank,
  Users, Factory, UserCog, BarChart3, Settings, Bell, Search, LogOut, Menu, X, ChevronRight,
  AlertTriangle, Store, ShieldCheck,
} from "lucide-react";
import { useApp } from "../store";
import { cx, brl, timeAgo, todayISO } from "../lib/utils";
import { lowStock, receivableStatus, payableStatus } from "../lib/services";
import { PERMISSIONS, ROLE_LABEL } from "../lib/types";
import type { Role } from "../lib/types";
import { useBranding } from "../lib/branding";
import { Badge, IconBtn } from "./ui";

export function Logo({ compact, tone = "dark" }: { compact?: boolean; tone?: "dark" | "light" }) {
  const b = useBranding();
  return (
    <span className="flex items-center gap-2.5">
      <span className="brand-grad flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/25">
        <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden>
          <path d="M10 42 L24 42 L30 20 L38 50 L45 30 L54 30" stroke="#eaf6ff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className={cx("block font-display text-[18px] font-extrabold tracking-tight", tone === "light" ? "text-ink" : "text-leaf-200")}>{b.appName}</span>
          <span className={cx("mt-1 block text-[8.5px] font-semibold uppercase", tone === "light" ? "text-ink-soft" : "text-pine-300")} style={{ letterSpacing: "3px" }}>
            {b.tagline}
          </span>
        </span>
      )}
    </span>
  );
}

/* Logo em PNG: prioriza o upload feito no Painel do Sistema,
   depois /logo.png (public/logo.png) e, por fim, a marca vetorial. */
function BrandLogo() {
  const b = useBranding();
  const [fallback, setFallback] = useState(false);
  const src = b.logoDataUrl ?? "/logo.png";
  const showImg = b.logoDataUrl ? true : !fallback;
  if (!showImg) return <Logo />;
  return (
    <img
      key={src}
      src={src}
      alt={`${b.appName} — logo`}
      className="h-10 w-auto max-w-[170px] object-contain object-left"
      onError={() => { if (!b.logoDataUrl) setFallback(true); }}
      draggable={false}
    />
  );
}

interface NavItem { path: string; label: string; icon: ReactNode; area: string }
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Visão geral",
    items: [{ path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} />, area: "dashboard" }],
  },
  {
    group: "Vendas",
    items: [
      { path: "/vendas", label: "Vendas", icon: <ShoppingCart size={17} />, area: "vendas" },
      { path: "/pedidos", label: "Pedidos", icon: <ClipboardList size={17} />, area: "vendas" },
      { path: "/catalogo", label: "Catálogo online", icon: <Globe size={17} />, area: "vendas" },
      { path: "/fiado", label: "Fiado e dívidas", icon: <Coins size={17} />, area: "vendas" },
    ],
  },
  {
    group: "Estoque",
    items: [
      { path: "/produtos", label: "Produtos", icon: <Package size={17} />, area: "estoque" },
      { path: "/estoque", label: "Movimentações", icon: <Boxes size={17} />, area: "estoque" },
      { path: "/compras", label: "Compras", icon: <Truck size={17} />, area: "compras" },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { path: "/caixa", label: "Caixa", icon: <Wallet size={17} />, area: "financeiro" },
      { path: "/receber", label: "Contas a receber", icon: <ArrowDownCircle size={17} />, area: "financeiro" },
      { path: "/pagar", label: "Contas a pagar", icon: <ArrowUpCircle size={17} />, area: "financeiro" },
      { path: "/despesas", label: "Despesas", icon: <Receipt size={17} />, area: "financeiro" },
      { path: "/fluxo", label: "Fluxo de caixa", icon: <TrendingUp size={17} />, area: "financeiro" },
      { path: "/lucro", label: "Lucro", icon: <PiggyBank size={17} />, area: "financeiro" },
    ],
  },
  {
    group: "Relacionamentos",
    items: [
      { path: "/clientes", label: "Clientes", icon: <Users size={17} />, area: "vendas" },
      { path: "/fornecedores", label: "Fornecedores", icon: <Factory size={17} />, area: "compras" },
      { path: "/funcionarios", label: "Funcionários", icon: <UserCog size={17} />, area: "config" },
    ],
  },
  {
    group: "Análise",
    items: [{ path: "/relatorios", label: "Relatórios", icon: <BarChart3 size={17} />, area: "relatorios" }],
  },
  {
    group: "Sistema",
    items: [{ path: "/config", label: "Configurações", icon: <Settings size={17} />, area: "config" }],
  },
];

export function can(role: Role | undefined, area: string): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  return PERMISSIONS[area]?.roles.includes(role) ?? false;
}

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items.map((i) => [i.path, i.label])),
);

/* ---------------- Busca global ---------------- */

function GlobalSearch() {
  const { db, navigate } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.querySelector("input")?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || !db) return [];
    const groups: { group: string; items: { label: string; sub?: string; to: string }[] }[] = [];
    const push = (group: string, items: { label: string; sub?: string; to: string }[]) => { if (items.length) groups.push({ group, items: items.slice(0, 5) }); };
    push("Produtos", db.products.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)).map((p) => ({ label: p.name, sub: `SKU ${p.sku} · ${brl(p.price)}`, to: `/produtos?q=${encodeURIComponent(p.name)}` })));
    push("Clientes", db.customers.filter((c) => c.name.toLowerCase().includes(t)).map((c) => ({ label: c.name, sub: c.phone, to: `/clientes?q=${encodeURIComponent(c.name)}` })));
    push("Vendas", db.sales.filter((s) => s.number.toLowerCase().includes(t) || s.customerName.toLowerCase().includes(t)).map((s) => ({ label: `${s.number} — ${s.customerName}`, sub: `${brl(s.total)} · ${s.method}`, to: `/vendas?q=${encodeURIComponent(s.number)}` })));
    push("Pedidos", db.orders.filter((o) => o.number.toLowerCase().includes(t) || o.customerName.toLowerCase().includes(t)).map((o) => ({ label: `${o.number} — ${o.customerName}`, sub: brl(o.total), to: "/pedidos" })));
    push("Fornecedores", db.suppliers.filter((f) => f.name.toLowerCase().includes(t)).map((f) => ({ label: f.name, sub: f.phone, to: `/fornecedores?q=${encodeURIComponent(f.name)}` })));
    push("Despesas", db.expenses.filter((e) => e.description.toLowerCase().includes(t)).map((e) => ({ label: e.description, sub: brl(e.amount), to: `/despesas?q=${encodeURIComponent(e.description)}` })));
    return groups;
  }, [q, db]);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar produtos, clientes, vendas…  (Ctrl+K)"
        aria-label="Busca global"
        className="h-9.5 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint transition-colors focus:border-pine-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-pine-500/15"
      />
      {open && q.trim() && (
        <div className="animate-scale-in absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          {results.length === 0 && <p className="px-4 py-5 text-center text-[13px] text-ink-faint">Nada encontrado para “{q}”.</p>}
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {results.map((g) => (
              <div key={g.group}>
                <p className="px-3.5 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{g.group}</p>
                {g.items.map((it, i) => (
                  <button
                    key={i}
                    className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left hover:bg-pine-50"
                    onClick={() => { navigate(it.to); setOpen(false); setQ(""); }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{it.label}</span>
                      {it.sub && <span className="block truncate text-[11.5px] text-ink-faint">{it.sub}</span>}
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-ink-faint" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Notificações ---------------- */

function NotifBell() {
  const { db, update, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const alerts = useMemo(() => {
    if (!db) return [] as { kind: "success" | "warn" | "info" | "danger"; msg: string; to: string; when: string; read: boolean }[];
    const out: { kind: "success" | "warn" | "info" | "danger"; msg: string; to: string; when: string; read: boolean }[] = [];
    const today = todayISO();
    if (db.settings.notifyLowStock) {
      const low = lowStock(db);
      if (low.length) out.push({ kind: "warn", msg: `${low.length} produto${low.length > 1 ? "s" : ""} com estoque baixo (${low.slice(0, 2).map((p) => p.name).join(", ")}${low.length > 2 ? "…" : ""})`, to: "/estoque", when: "", read: false });
    }
    if (db.settings.notifyDue) {
      const vencHoje = db.expenses.filter((e) => e.status === "pendente" && e.dueDate === today).length
        + db.payables.filter((p) => p.status === "pendente" && p.dueDate === today).length;
      if (vencHoje) out.push({ kind: "warn", msg: `Você possui ${vencHoje} conta${vencHoje > 1 ? "s" : ""} vencendo hoje.`, to: "/pagar", when: "", read: false });
      const atrasados = db.receivables.filter((r) => receivableStatus(r) === "vencido").length;
      if (atrasados) out.push({ kind: "danger", msg: `${atrasados} cliente${atrasados > 1 ? "s" : ""} com pagamento${atrasados > 1 ? "s" : ""} atrasado${atrasados > 1 ? "s" : ""}.`, to: "/fiado", when: "", read: false });
      const vencidas = db.payables.filter((p) => payableStatus(p) === "vencido").length + db.expenses.filter((e) => e.status === "pendente" && e.dueDate < today).length;
      if (vencidas) out.push({ kind: "danger", msg: `${vencidas} conta${vencidas > 1 ? "s" : ""} a pagar vencida${vencidas > 1 ? "s" : ""}.`, to: "/pagar", when: "", read: false });
    }
    for (const n of db.notis.slice(0, 12)) out.push({ kind: n.kind, msg: n.msg, to: "", when: n.createdAt, read: n.read });
    return out;
  }, [db]);

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificações (${unread} não lidas)`}
        className="relative flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition-colors hover:border-pine-300 hover:text-pine-700"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-scale-in absolute right-0 z-50 mt-1.5 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="font-display text-[13px] font-bold">Notificações</p>
            <button
              className="text-[12px] font-semibold text-pine-600 hover:underline"
              onClick={() => update((d) => d.notis.forEach((n) => { n.read = true; }))}
            >
              Marcar todas como lidas
            </button>
          </header>
          <ul className="max-h-[60vh] overflow-y-auto py-1">
            {alerts.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-faint">Tudo em dia por aqui.</li>}
            {alerts.map((a, i) => (
              <li key={i}>
                <button
                  disabled={!a.to}
                  className={cx("flex w-full items-start gap-2.5 px-4 py-2.5 text-left", a.to && "hover:bg-pine-50", !a.read && "bg-leaf-200/30")}
                  onClick={() => { if (a.to) { navigate(a.to); setOpen(false); } }}
                >
                  <span className={cx("mt-0.5", a.kind === "warn" ? "text-warn" : a.kind === "danger" ? "text-danger" : a.kind === "success" ? "text-pine-600" : "text-info")}>
                    <AlertTriangle size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-[13px] leading-snug", a.read ? "text-ink-soft" : "font-semibold text-ink")}>{a.msg}</span>
                    {a.when && <span className="text-[11px] text-ink-faint">{timeAgo(a.when)}</span>}
                  </span>
                  {!a.read && <span className="animate-pulse-dot mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Menu mobile / drawer ---------------- */

function NavList({ onNavigate, activePath, role, isSuper }: { onNavigate: () => void; activePath: string; role?: Role; isSuper?: boolean }) {
  const { db } = useApp();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Navegação principal">
      {NAV.map((g) => {
        const items = g.items.filter((i) => can(role, i.area));
        if (!items.length) return null;
        return (
          <div key={g.group}>
            <p className="mb-1 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6ea1e8]">{g.group}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const active = activePath === i.path;
                return (
                  <li key={i.path}>
                    <a
                      href={`#${i.path}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all",
                        active ? "bg-leaf-400/15 text-leaf-300 shadow-[inset_2px_0_0_0_var(--color-leaf-400)]" : "text-[#d9e8fb] hover:bg-pine-800/70 hover:text-white",
                      )}
                    >
                      {i.icon}
                      <span className="flex-1">{i.label}</span>
                      {i.path === "/pedidos" && db && db.orders.filter((o) => o.status === "novo").length > 0 && (
                        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-leaf-400 px-1 text-[10px] font-bold text-pine-950">
                          {db.orders.filter((o) => o.status === "novo").length}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {isSuper && (
        <div>
          <p className="mb-1 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6ea1e8]">Sistema</p>
          <ul className="space-y-0.5">
            <li>
              <a
                href="#/admin"
                onClick={onNavigate}
                aria-current={activePath === "/admin" ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all",
                  activePath === "/admin"
                    ? "bg-leaf-400/15 text-leaf-300 shadow-[inset_2px_0_0_0_var(--color-leaf-400)]"
                    : "text-[#d9e8fb] hover:bg-pine-800/70 hover:text-white",
                )}
              >
                <ShieldCheck size={17} />
                <span className="flex-1">Painel do Sistema</span>
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

/* ---------------- Shell ---------------- */

export function Shell({ children }: { children: ReactNode }) {
  const { path, user, db, logout } = useApp();
  const b = useBranding();
  const [drawer, setDrawer] = useState(false);
  const [more, setMore] = useState(false);

  const biz = db?.business;

  const mobileNav: NavItem[] = [
    { path: "/dashboard", label: "Início", icon: <LayoutDashboard size={20} />, area: "dashboard" },
    { path: "/vendas", label: "Vendas", icon: <ShoppingCart size={20} />, area: "vendas" },
    { path: "/pedidos", label: "Pedidos", icon: <ClipboardList size={20} />, area: "vendas" },
    { path: "/produtos", label: "Estoque", icon: <Package size={20} />, area: "estoque" },
  ];

  return (
    <div className="min-h-dvh">
      {/* Sidebar desktop */}
      <aside className={cx("fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col lg:flex", b.sidebarGradient ? "brand-grad" : "bg-pine-900")}>
        <div className="flex h-16 items-center border-b border-pine-800 px-5">
          <BrandLogo />
        </div>
        {biz && (
          <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-lg bg-pine-800/60 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf-400 text-pine-950">
              <Store size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-leaf-200">{biz.name}</span>
              <span className="block text-[11px] text-pine-300">{biz.segment}</span>
            </span>
          </div>
        )}
        <div className="mt-4 flex-1 overflow-hidden">
          <NavList onNavigate={() => {}} activePath={path} role={user?.role} isSuper={!!user?.super} />
        </div>
        <div className="border-t border-pine-800 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-pine-700 font-display text-[13px] font-bold text-leaf-300">
              {(user?.name ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-leaf-200">{user?.name}</span>
              <span className="block text-[11px] text-pine-300">{user ? ROLE_LABEL[user.role] : ""}</span>
            </span>
            <IconBtn label="Sair da conta" onClick={logout} className="text-pine-300 hover:bg-pine-800 hover:text-leaf-300">
              <LogOut size={16} />
            </IconBtn>
          </div>
        </div>
      </aside>

      {/* Drawer mobile/tablet */}
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-pine-950/50" aria-label="Fechar menu" onClick={() => setDrawer(false)} />
          <div className={cx("animate-slide-in absolute inset-y-0 left-0 flex w-[270px] flex-col", b.sidebarGradient ? "brand-grad" : "bg-pine-900")}>
            <div className="flex h-16 items-center justify-between border-b border-pine-800 px-5">
              <BrandLogo />
              <IconBtn label="Fechar menu" onClick={() => setDrawer(false)} className="text-pine-300 hover:bg-pine-800"><X size={18} /></IconBtn>
            </div>
            <div className="mt-3 flex-1 overflow-hidden">
              <NavList onNavigate={() => setDrawer(false)} activePath={path} role={user?.role} isSuper={!!user?.super} />
            </div>
            <div className="border-t border-pine-800 p-3">
              <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-pine-200 hover:bg-pine-800">
                <LogOut size={16} /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft lg:hidden"
              onClick={() => setDrawer(true)} aria-label="Abrir menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:block"><GlobalSearch /></div>
            <div className="ml-auto flex items-center gap-2">
              <NotifBell />
              <div className="hidden items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-3 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pine-900 font-display text-[12px] font-bold text-leaf-300">
                  {(user?.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-[12.5px] font-semibold text-ink">{user?.name?.split(" ")[0]}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-line px-4 py-2 md:hidden">
            <GlobalSearch />
          </div>
        </header>

        <main className="mx-auto max-w-[1380px] px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden" aria-label="Menu inferior">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
          {mobileNav.filter((i) => can(user?.role, i.area)).map((i) => {
            const active = path === i.path;
            return (
              <a key={i.path} href={`#${i.path}`} aria-current={active ? "page" : undefined}
                className={cx("flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] font-semibold transition-colors", active ? "text-pine-700" : "text-ink-faint")}>
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-pine-100")}>{i.icon}</span>
                {i.label}
              </a>
            );
          })}
          <button onClick={() => setMore(true)} className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10.5px] font-semibold text-ink-faint">
            <span className="flex h-7 w-12 items-center justify-center rounded-full"><Menu size={20} /></span>
            Mais
          </button>
        </div>
      </nav>

      {/* Sheet "Mais" */}
      {more && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-pine-950/50" aria-label="Fechar" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-fade-up rounded-t-2xl bg-pine-900 pb-[max(env(safe-area-inset-bottom),12px)]">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-pine-700" />
            <div className="max-h-[70vh] overflow-y-auto p-3">
              <NavList onNavigate={() => setMore(false)} activePath={path} role={user?.role} />
            </div>
          </div>
        </div>
      )}

      {biz && !biz.onboarded && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 lg:bottom-6">
          <Badge tone="amber" className="shadow-pop">Configure seu negócio em Configurações</Badge>
        </div>
      )}
    </div>
  );
}
