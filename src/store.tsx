/* ============================================================
 * Fluxo — Estado global: dados, sessão, rota e mutações
 * ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DB, User } from "./lib/types";
import { dbService, loadSession, saveSession } from "./lib/db";
import { buildSeed, emptyDB } from "./lib/seed";
import { hashPass, slugify, uid, todayISO } from "./lib/utils";

interface AppCtx {
  db: DB | null;
  user: User | null;
  ready: boolean;
  update: (fn: (d: DB) => void) => void;
  login: (email: string, pass: string) => Promise<{ err: string | null; isSuper: boolean }>;
  loginDemo: () => Promise<void>;
  signup: (inp: { name: string; email: string; pass: string; business: string; segment: string; sells: string }) => Promise<string | null>;
  logout: () => void;
  finishOnboarding: (inp: { name: string; segment: string; sells: string }) => void;
  resetDemo: () => Promise<void>;
  clearDemo: () => void;
  importDB: (d: DB) => void;
  wipeAll: () => void;
  route: string;
  path: string;
  query: URLSearchParams;
  navigate: (to: string) => void;
}

const Ctx = createContext<AppCtx>(null!);
export const useApp = () => useContext(Ctx);

function readRoute(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h || "/";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => loadSession());
  const [route, setRoute] = useState<string>(() => readRoute());

  useEffect(() => {
    let alive = true;
    (async () => {
      let d = dbService.load();
      if (!d) {
        d = await buildSeed();
        dbService.save(d);
      }
      // Migração: garante a existência da conta de Administrador do Sistema
      if (!d.users.some((u) => u.super)) {
        d.users.unshift({
          id: "sys-admin", name: "Administrador do Sistema", email: "admin@fluxo.app",
          passHash: await hashPass("admin123"), role: "admin", super: true, createdAt: new Date().toISOString(),
        });
        dbService.save(d);
      }
      if (!alive) return;
      setDb(d);
      setReady(true);
    })();
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => { alive = false; window.removeEventListener("hashchange", onHash); };
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    window.scrollTo({ top: 0 });
  }, []);

  const update = useCallback((fn: (d: DB) => void) => {
    setDb((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      dbService.save(next);
      return next;
    });
  }, []);

  const user = useMemo(() => {
    if (!db || !sessionId) return null;
    return db.users.find((u) => u.id === sessionId) ?? null;
  }, [db, sessionId]);

  const login = useCallback(async (email: string, pass: string) => {
    const d = dbService.load();
    if (!d) return { err: "Sistema ainda não inicializado.", isSuper: false };
    const u = d.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { err: "E-mail não encontrado.", isSuper: false };
    const h = await hashPass(pass);
    if (u.passHash !== h) return { err: "Senha incorreta.", isSuper: false };
    saveSession(u.id);
    setSessionId(u.id);
    return { err: null, isSuper: !!u.super };
  }, []);

  const loginDemo = useCallback(async () => {
    const d = dbService.load();
    if (!d) return;
    const u = d.users.find((x) => x.email === "demo@fluxo.app");
    if (!u) return;
    saveSession(u.id);
    setSessionId(u.id);
  }, []);

  const signup = useCallback(async (inp: { name: string; email: string; pass: string; business: string; segment: string; sells: string }) => {
    if (!inp.name.trim()) return "Informe seu nome.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.email)) return "E-mail inválido.";
    if (inp.pass.length < 6) return "A senha precisa de ao menos 6 caracteres.";
    if (!inp.business.trim()) return "Informe o nome do negócio.";
    const d = dbService.load();
    if (d && d.users.some((u) => u.email.toLowerCase() === inp.email.trim().toLowerCase())) {
      return "Já existe uma conta com este e-mail.";
    }
    const passHash = await hashPass(inp.pass);
    const newUser: User = { id: uid(), name: inp.name.trim(), email: inp.email.trim(), passHash, role: "admin", createdAt: new Date().toISOString() };
    update((draft) => {
      const fresh = emptyDB([...draft.users, newUser], {
        id: uid(), name: inp.business.trim(), segment: inp.segment, sells: inp.sells,
        slug: slugify(inp.business), phone: "", address: "", onboarded: false, createdAt: new Date().toISOString(),
      });
      Object.assign(draft, fresh);
    });
    saveSession(newUser.id);
    setSessionId(newUser.id);
    return null;
  }, [update]);

  const logout = useCallback(() => {
    saveSession(null);
    setSessionId(null);
    navigate("/login");
  }, [navigate]);

  const finishOnboarding = useCallback((inp: { name: string; segment: string; sells: string }) => {
    update((d) => {
      if (!d.business) return;
      d.business.name = inp.name || d.business.name;
      d.business.slug = slugify(inp.name || d.business.name);
      d.business.segment = inp.segment;
      d.business.sells = inp.sells;
      d.business.onboarded = true;
    });
  }, [update]);

  const resetDemo = useCallback(async () => {
    const seed = await buildSeed();
    update((d) => {
      const extraUsers = d.users.filter((u) => u.email !== "demo@fluxo.app");
      seed.users = [...seed.users, ...extraUsers];
      Object.assign(d, seed);
    });
  }, [update]);

  const clearDemo = useCallback(() => {
    update((d) => {
      const fresh = emptyDB(d.users, d.business ? { ...d.business, onboarded: true } : null);
      Object.assign(d, fresh);
    });
  }, [update]);

  const importDB = useCallback((data: DB) => {
    setDb(data);
    dbService.save(data);
  }, []);

  const wipeAll = useCallback(() => {
    dbService.wipe();
    try {
      localStorage.removeItem("fluxo.branding.v1");
      localStorage.removeItem("fluxo.session");
    } catch { /* noop */ }
    window.location.hash = "/login";
    window.location.reload();
  }, []);

  const [path, queryString] = route.split("?");
  const query = useMemo(() => new URLSearchParams(queryString ?? ""), [queryString]);

  const value: AppCtx = {
    db, user, ready, update, login, loginDemo, signup, logout, finishOnboarding,
    resetDemo, clearDemo, importDB, wipeAll, route, path, query, navigate,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayInput(): string {
  return todayISO();
}
