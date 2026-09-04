/* ============================================================
 * Fluxo — DatabaseService
 * Camada única de persistência. Hoje: LocalStorage.
 * Amanhã: Supabase / Firebase / PostgreSQL — basta trocar esta
 * classe; nenhuma regra de negócio conhece o armazenamento.
 * ============================================================ */
import type { DB } from "./types";

const KEY = "fluxo.db.v1";

export interface IDatabase {
  load(): DB | null;
  save(db: DB): void;
  wipe(): void;
}

class LocalStorageDB implements IDatabase {
  load(): DB | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DB;
      if (!parsed || !Array.isArray(parsed.products)) return null;
      return parsed;
    } catch {
      return null;
    }
  }
  save(db: DB): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Falha ao persistir dados", e);
    }
  }
  wipe(): void {
    localStorage.removeItem(KEY);
  }
}

export const dbService: IDatabase = new LocalStorageDB();

export function saveSession(userId: string | null): void {
  if (userId) localStorage.setItem("fluxo.session", userId);
  else localStorage.removeItem("fluxo.session");
}
export function loadSession(): string | null {
  return localStorage.getItem("fluxo.session");
}
