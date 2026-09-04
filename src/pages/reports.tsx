/* ============================================================
 * Fluxo — Central de Relatórios
 * ============================================================ */
import { useMemo, useState } from "react";
import { Download, Printer, BarChart3, FileJson } from "lucide-react";
import { useApp } from "../store";
import { buildReport } from "../lib/services";
import { download, toCSV, presetRange, RANGE_PRESETS, cx } from "../lib/utils";
import { Button, Card, Empty, Input, PageHead, Seg, TableWrap, Th, Td, useToast } from "../components/ui";
import { ReportChart } from "../components/charts";

const REPORTS = [
  { id: "vendas", label: "Vendas", desc: "Todas as vendas do período com ticket médio" },
  { id: "despesas", label: "Despesas", desc: "Gastos por categoria e status" },
  { id: "lucro", label: "Lucro", desc: "Faturamento, CMV, despesas e margem" },
  { id: "fluxo", label: "Fluxo de caixa", desc: "Entradas, saídas e saldo diário" },
  { id: "estoque", label: "Estoque", desc: "Posição, valor imobilizado e alertas" },
  { id: "produtos", label: "Produtos mais vendidos", desc: "Ranking por unidades e receita" },
  { id: "clientes", label: "Clientes", desc: "Quem compra mais e valores em aberto" },
  { id: "fornecedores", label: "Fornecedores", desc: "Volume de compras por parceiro" },
  { id: "receber", label: "Contas a receber", desc: "Títulos pendentes, pagos e vencidos" },
  { id: "pagar", label: "Contas a pagar", desc: "Obrigações e vencimentos" },
];

export default function ReportsPage() {
  const { db } = useApp();
  const toast = useToast();
  const [type, setType] = useState("vendas");
  const [preset, setPreset] = useState("30d");
  const [custom, setCustom] = useState({ start: "", end: "" });

  const range = useMemo(
    () => presetRange(preset === "custom" ? "custom" : preset, custom.start && custom.end ? custom : undefined),
    [preset, custom],
  );
  const report = useMemo(() => (db ? buildReport(db, type, range) : null), [db, type, range]);

  if (!db || !report) return null;

  const exportCSV = () => {
    download(`fluxo-${type}-${range.start}-a-${range.end}.csv`, toCSV([report.cols, ...report.rows]), "text/csv");
    toast.push("success", "Relatório exportado em CSV (compatível com Excel).");
  };
  const exportJSON = () => {
    download(`fluxo-${type}.json`, JSON.stringify({ report: report.title, periodo: range, cols: report.cols, rows: report.rows }, null, 2), "application/json");
    toast.push("success", "Relatório exportado em JSON.");
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Relatórios" desc="Análises prontas para decidir melhor — exporte em CSV quando precisar.">
        <Button variant="outline" onClick={exportJSON}><FileJson size={15} /> JSON</Button>
        <Button onClick={exportCSV}><Download size={15} /> Exportar CSV</Button>
        <Button variant="ghost" onClick={() => window.print()}><Printer size={15} /> Imprimir</Button>
      </PageHead>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {REPORTS.map((r) => (
          <button key={r.id} onClick={() => setType(r.id)}
            className={cx(
              "rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5",
              type === r.id ? "border-pine-600 bg-pine-50 shadow-card" : "border-line bg-surface hover:border-pine-300",
            )}>
            <p className={cx("font-display text-[13.5px] font-bold", type === r.id && "text-pine-800")}>{r.label}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Seg options={RANGE_PRESETS.map((p) => ({ id: p.id, label: p.label }))} value={preset as never} onChange={(v) => setPreset(v as string)} />
        {preset === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="h-9 w-[142px] text-[12.5px]" aria-label="Data inicial" />
            <span className="text-ink-faint">—</span>
            <Input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="h-9 w-[142px] text-[12.5px]" aria-label="Data final" />
          </div>
        )}
      </div>

      <h2 className="mb-3 font-display text-[18px] font-bold">{report.title}</h2>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {report.summary.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{s.label}</p>
            <p className="tnum mt-1 font-display text-[19px] font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {report.chart && report.chart.data.length > 0 && (
        <Card className="mb-4" title="Visualização">
          <div className="p-4"><ReportChart data={report.chart.data} x={report.chart.x} series={report.chart.series} /></div>
        </Card>
      )}

      {report.rows.length === 0 ? (
        <Empty icon={<BarChart3 size={26} />} title="Sem dados no período selecionado" desc="Ajuste o filtro de período ou registre movimentações." />
      ) : (
        <TableWrap>
          <thead><tr>{report.cols.map((c, i) => <Th key={i} right={i === report.cols.length - 1}>{c}</Th>)}</tr></thead>
          <tbody>
            {report.rows.slice(0, 120).map((r, i) => (
              <tr key={i} className="transition-colors hover:bg-pine-50/40">
                {r.map((c, j) => <Td key={j} right={j === r.length - 1} className={j === r.length - 1 ? "font-semibold" : ""}>{c}</Td>)}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {report.rows.length > 120 && <p className="mt-2 text-center text-[12px] text-ink-faint">Mostrando 120 de {report.rows.length} linhas — exporte o CSV para ver tudo.</p>}
    </div>
  );
}
