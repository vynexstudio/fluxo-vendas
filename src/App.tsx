/* ============================================================
 * Fluxo — App raiz: providers, roteador, guardas e PWA
 * ============================================================ */
import { useEffect, useState } from "react";
import { Lock, WifiOff } from "lucide-react";
import { AppProvider, useApp } from "./store";
import { ToastProvider, Button, Spinner, useToast, Empty } from "./components/ui";
import { Shell, can } from "./components/layout";
import { Logo } from "./components/layout";
import { LoginPage, OnboardingPage } from "./pages/auth";
import DashboardPage from "./pages/dashboard";
import SalesPage from "./pages/sales";
import ProductsPage from "./pages/products";
import InventoryPage from "./pages/inventory";
import PurchasesPage from "./pages/purchases";
import ExpensesPage from "./pages/expenses";
import { ReceivablesPage, PayablesPage, DebtsPage } from "./pages/finance";
import { CashPage, CashflowPage, ProfitPage } from "./pages/cash";
import ReportsPage from "./pages/reports";
import OrdersPage, { CatalogManagerPage, CatalogPublicPage } from "./pages/orders";
import SettingsPage from "./pages/settings";
import { CustomersPage, SuppliersPage, EmployeesPage } from "./pages/people";

const AREA_OF: Record<string, string> = {
  "/dashboard": "dashboard",
  "/vendas": "vendas", "/pedidos": "vendas", "/catalogo": "vendas", "/fiado": "vendas", "/clientes": "vendas",
  "/produtos": "estoque", "/estoque": "estoque",
  "/compras": "compras", "/fornecedores": "compras",
  "/caixa": "financeiro", "/receber": "financeiro", "/pagar": "financeiro",
  "/despesas": "financeiro", "/fluxo": "financeiro", "/lucro": "financeiro",
  "/relatorios": "relatorios",
  "/funcionarios": "config", "/config": "config",
};

function Splash() {
  return (
    <div className="brand-grad flex min-h-dvh flex-col items-center justify-center gap-5">
      <div className="animate-scale-in"><Logo /></div>
      <Spinner className="text-leaf-400" />
      <p className="text-[12.5px] font-medium text-pine-300">Preparando seu negócio…</p>
    </div>
  );
}

function Restricted() {
  const { navigate, user } = useApp();
  return (
    <Empty
      icon={<Lock size={26} />}
      title="Acesso restrito"
      desc={`Sua função (${user?.role}) não tem permissão para este módulo. Fale com um administrador.`}
      action={<Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>}
    />
  );
}

function Router() {
  const { path, user, db, ready, navigate } = useApp();
  const toast = useToast();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => { setOffline(false); toast.push("success", "Conexão restabelecida."); };
    const off = () => { setOffline(true); toast.push("warn", "Você está offline — os dados continuam salvos no dispositivo."); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [toast]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(() => { /* ambiente sem suporte */ });
  }, []);

  if (!ready || !db) return <Splash />;

  // Rota pública do catálogo
  if (path.startsWith("/catalogo/")) {
    const slug = path.split("/")[2] ?? "";
    return (
      <>
        {offline && <OfflineBar />}
        <CatalogPublicPage slug={slug} />
      </>
    );
  }

  if (!user) return <LoginPage />;
  if (db.business && !db.business.onboarded && path !== "/onboarding") return <OnboardingPage />;
  if (path === "/onboarding") return <OnboardingPage />;

  const area = AREA_OF[path];
  const page =
    path === "/vendas" ? <SalesPage /> :
    path === "/produtos" ? <ProductsPage /> :
    path === "/estoque" ? <InventoryPage /> :
    path === "/compras" ? <PurchasesPage /> :
    path === "/despesas" ? <ExpensesPage /> :
    path === "/receber" ? <ReceivablesPage /> :
    path === "/pagar" ? <PayablesPage /> :
    path === "/fiado" ? <DebtsPage /> :
    path === "/clientes" ? <CustomersPage /> :
    path === "/fornecedores" ? <SuppliersPage /> :
    path === "/funcionarios" ? <EmployeesPage /> :
    path === "/caixa" ? <CashPage /> :
    path === "/fluxo" ? <CashflowPage /> :
    path === "/lucro" ? <ProfitPage /> :
    path === "/relatorios" ? <ReportsPage /> :
    path === "/pedidos" ? <OrdersPage /> :
    path === "/catalogo" ? <CatalogManagerPage /> :
    path === "/config" ? <SettingsPage /> :
    <DashboardPage />;

  return (
    <>
      {offline && <OfflineBar />}
      <Shell>
        {area && !can(user.role, area) ? <Restricted /> : page}
      </Shell>
    </>
  );
}

function OfflineBar() {
  const { navigate } = useApp();
  return (
    <div className="fixed inset-x-0 top-0 z-[95] flex items-center justify-center gap-2 bg-warn px-4 py-1.5 text-[12.5px] font-bold text-warn-soft shadow-card">
      <WifiOff size={14} /> Modo offline — tudo continua funcionando e fica salvo no seu dispositivo.
      <button className="underline" onClick={() => navigate("/config")}>Backup</button>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AppProvider>
  );
}
