/* ============================================================
 * Fluxo — Dashboard
 * ============================================================ */
import { useMemo, useState } from "react";
import {
  Plus, ShoppingCart, Receipt, Package, Users, Boxes, Truck,
  TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, ArrowRight, Sparkles,
} from "lucide-react";
import { useApp } from "../store";
import { brl, cx, fmtDate, presetRange, RANGE_PRESETS, todayISO } from "../lib/utils";
import { dashStats, seriesVendasDespesas, topProducts, topCustomers, lowStock, receivableStatus, R } from "../lib/services";
import { Card, Stat, Badge, Button, Empty, Seg, Input, PageHead, ProductThumb, Money, TableWrap, Th, Td } from "../components/ui";
import { VendasDespesasChart } from "../components/charts";

export default function DashboardPage() {
  const { db, navigate, user } = useApp();
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState({ start: "", end: "" });

  const range = useMemo(
    () => presetRange(preset === "custom" ? "custom" : preset, custom.start && custom.end ? custom : undefined),
    [preset, custom],
  );

  const stats = useMemo(() => (db ? dashStats(db, range) : null), [db, range]);
  const series = useMemo(() => (db ? seriesVendasDespesas(db, preset === "hoje" ? 7 : preset === "7d" ? 7 : 30) : []), [db, preset]);
  const top = useMemo(() => (db ? topProducts(db, range) : []), [db, range]);
  const topCli = useMemo(() => (db ? topCustomers(db, range) : []), [db, range]);
  const low = useMemo(() => (db ? lowStock(db) : []), [db]);

  if (!db || !stats) return null;

  const lastSales = db.sales.filter((s) => s.status !== "cancelada").slice(0, 6);
  const lastExp = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const hasData = db.products.length > 0 || db.sales.length > 0;

  const shortcuts = [
    { label: "Nova venda", icon: <ShoppingCart size={19} />, to: "/vendas?nova=1", cls: "bg-pine-600 text-leaf-200 hover:bg-pine-700" },
    { label: "Nova despesa", icon: <Receipt size={19} />, to: "/despesas?nova=1", cls: "bg-surface text-pine-700 border border-line-strong hover:border-pine-400" },
    { label: "Novo produto", icon: <Package size={19} />, to: "/produtos?novo=1", cls: "bg-surface text-pine-700 border border-line-strong hover:border-pine-400" },
    { label: "Novo cliente", icon: <Users size={19} />, to: "/clientes?novo=1", cls: "bg-surface text-pine-700 border border-line-strong hover:border-pine-400" },
    { label: "Entrada de estoque", icon: <Boxes size={19} />, to: "/estoque?mov=entrada", cls: "bg-surface text-pine-700 border border-line-strong hover:border-pine-400" },
    { label: "Nova compra", icon: <Truck size={19} />, to: "/compras?nova=1", cls: "bg-surface text-pine-700 border border-line-strong hover:border-pine-400" },
  ];

  const firstName = (user?.name ?? "").split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  if (!hasData) {
    return (
      <div>
        <PageHead title={`${greet}, ${firstName}`} desc="Seu painel está pronto. Comece cadastrando um produto ou registrando uma venda." />
        <Empty
          icon={<Sparkles size={26} />}
          title="Bem-vindo ao Fluxo!"
          desc="Cadastre seu primeiro produto para começar a vender, ou registre uma venda avulsa em segundos."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate("/produtos?novo=1")}><Plus size={16} /> Cadastrar produto</Button>
              <Button variant="outline" onClick={() => navigate("/vendas?nova=1")}><ShoppingCart size={16} /> Nova venda</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHead title={`${greet}, ${firstName}`} desc={`Aqui está o resumo de ${db.business?.name ?? "seu negócio"} — ${fmtDate(todayISO())}.`}>
        <Seg options={RANGE_PRESETS.map((p) => ({ id: p.id, label: p.label }))} value={preset as never} onChange={(v) => setPreset(v as string)} />
        {preset === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="h-9 w-[142px] text-[12.5px]" aria-label="Data inicial" />
            <span className="text-ink-faint">—</span>
            <Input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="h-9 w-[142px] text-[12.5px]" aria-label="Data final" />
          </div>
        )}
      </PageHead>

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {shortcuts.map((s) => (
          <button key={s.label} onClick={() => navigate(s.to)}
            className={cx("flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[13px] font-bold shadow-card transition-all hover:-translate-y-0.5", s.cls)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Vendas de hoje" value={brl(stats.hoje.vendas)} icon={<TrendingUp size={16} />} tone="green"
          sub={`${db.sales.filter((s) => s.date === todayISO() && s.status !== "cancelada").length} vendas`} />
        <Stat label="Despesas de hoje" value={brl(stats.hoje.despesas)} icon={<TrendingDown size={16} />} tone="red" sub="pagas hoje" />
        <Stat label="Lucro estimado" value={brl(stats.lucroHoje)} icon={<PiggyBank size={16} />} tone="dark" sub="hoje (bruto − despesas)" />
        <Stat label="A receber" value={brl(stats.aReceber)} icon={<Wallet size={16} />} sub="fiado e parcelado" onClick={() => navigate("/receber")} />
        <Stat label="A pagar" value={brl(stats.aPagar)} icon={<Receipt size={16} />} sub="contas e despesas" onClick={() => navigate("/pagar")} />
        <Stat label="Estoque" value={`${stats.estoqueUnidades} un`} icon={<Boxes size={16} />} sub={`${db.products.length} produtos · ${brl(stats.estoqueValor)}`} onClick={() => navigate("/estoque")} />
      </div>

      {/* Gráfico principal */}
      <Card title={`Vendas × despesas — últimos ${series.length} dias`} action={<Button size="sm" variant="ghost" onClick={() => navigate("/relatorios")}>Relatórios <ArrowRight size={13} /></Button>}>
        <div className="p-4"><VendasDespesasChart data={series} /></div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Mais vendidos */}
        <Card title="Produtos mais vendidos">
          <div className="p-4">
            {top.length === 0 && <p className="py-6 text-center text-[13px] text-ink-faint">Sem vendas no período.</p>}
            <ul className="space-y-3">
              {top.map((t, i) => {
                const max = top[0]?.qty ?? 1;
                return (
                  <li key={t.name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                        <span className="tnum w-4 text-[11px] font-bold text-ink-faint">{i + 1}</span>
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="tnum shrink-0 text-ink-soft">{t.qty} un · <Money value={t.revenue} className="font-semibold text-ink" /></span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-paper">
                      <div className="h-full rounded-full bg-pine-500 transition-all duration-700" style={{ width: `${(t.qty / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        {/* Melhores clientes */}
        <Card title="Clientes que mais compram">
          <div className="p-4">
            {topCli.length === 0 && <p className="py-6 text-center text-[13px] text-ink-faint">Sem vendas no período.</p>}
            <ul className="divide-y divide-line/70">
              {topCli.map((c) => (
                <li key={c.name} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-pine-100 font-display text-[12px] font-bold text-pine-700">
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{c.name}</span>
                    <span className="text-[11.5px] text-ink-faint">{c.count} compra{c.count > 1 ? "s" : ""}</span>
                  </span>
                  <Money value={c.total} className="text-[13.5px] font-bold" />
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Últimas vendas */}
        <Card title="Últimas vendas" className="lg:col-span-2" action={<Button size="sm" variant="ghost" onClick={() => navigate("/vendas")}>Ver todas <ArrowRight size={13} /></Button>}>
          {lastSales.length === 0 ? (
            <div className="p-4"><Empty title="Nenhuma venda ainda" desc="Registre sua primeira venda em poucos cliques." action={<Button onClick={() => navigate("/vendas?nova=1")}><Plus size={15} /> Nova venda</Button>} /></div>
          ) : (
            <TableWrap className="rounded-none border-0 shadow-none">
              <thead><tr><Th>Nº</Th><Th>Cliente</Th><Th>Data</Th><Th>Pagamento</Th><Th right>Total</Th></tr></thead>
              <tbody>
                {lastSales.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-pine-50/60">
                    <Td className="font-semibold text-pine-700">{s.number}</Td>
                    <Td>{s.customerName}</Td>
                    <Td>{fmtDate(s.date)}</Td>
                    <Td>{s.method === "Fiado" ? <Badge tone="amber">Fiado</Badge> : <span className="text-ink-soft">{s.method}</span>}</Td>
                    <Td right><Money value={s.total} className="font-bold" /></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        {/* Estoque baixo + últimas despesas */}
        <div className="space-y-5">
          <Card title="Estoque baixo" action={low.length > 0 ? <Badge tone="red">{low.length}</Badge> : <Badge tone="green">OK</Badge>}>
            <div className="max-h-56 overflow-y-auto p-4">
              {low.length === 0 && <p className="py-4 text-center text-[13px] text-ink-faint">Nenhum produto abaixo do mínimo.</p>}
              <ul className="space-y-2.5">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5">
                    <ProductThumb name={p.name} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                      <span className="flex items-center gap-1 text-[11.5px] text-danger"><AlertTriangle size={11} /> {p.stock} un / mín {p.minStock}</span>
                    </span>
                    <Button size="sm" variant="soft" onClick={() => navigate("/estoque?mov=entrada")}>Repor</Button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card title="Últimas despesas">
            <ul className="divide-y divide-line/70 p-4">
              {lastExp.length === 0 && <p className="py-4 text-center text-[13px] text-ink-faint">Nenhuma despesa registrada.</p>}
              {lastExp.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">{e.description}</span>
                    <span className="text-[11.5px] text-ink-faint">{e.category} · {fmtDate(e.date)}</span>
                  </span>
                  <span className="text-right">
                    <Money value={-e.amount} className="text-[13px] font-bold" />
                    <span className="block">{e.status === "pago" ? <Badge tone="green">Pago</Badge> : <Badge tone={e.dueDate < todayISO() ? "red" : "amber"}>{e.dueDate < todayISO() ? "Vencido" : "Pendente"}</Badge>}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Alerta de recebíveis vencidos */}
      {db.receivables.some((r) => receivableStatus(r) === "vencido") && (
        <button onClick={() => navigate("/fiado")} className="flex w-full items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3.5 text-left shadow-card transition-transform hover:-translate-y-0.5">
          <AlertTriangle size={18} className="shrink-0 text-warn" />
          <span className="flex-1 text-[13.5px] font-semibold text-warn">
            Existem fiados vencidos — total de {brl(R(db.receivables.filter((r) => receivableStatus(r) === "vencido").reduce((s, r) => s + r.amount - r.paid, 0)))}. Toque para ver.
          </span>
          <ArrowRight size={16} className="text-warn" />
        </button>
      )}
    </div>
  );
}
