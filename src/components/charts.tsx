/* ============================================================
 * Fluxo — Gráficos (wrappers do Recharts com tema da marca)
 * ============================================================ */
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ComposedChart, ReferenceLine,
} from "recharts";
import { brlShort } from "../lib/utils";

export const CHART = {
  pine: "#14684a",
  leaf: "#a2cf37",
  leafBright: "#c0e95f",
  danger: "#c74a4a",
  warn: "#d99326",
  info: "#3f759c",
  grid: "#e2e6de",
  label: "#8b958e",
};

function Tip({ active, payload, label, money = true }: { active?: boolean; payload?: { name?: string; value?: number | string; color?: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      {label != null && <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tnum">{money ? brlShort(Number(p.value)) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

const axis = { fontSize: 11, fill: CHART.label, fontFamily: "IBM Plex Sans" };

export function VendasDespesasChart({ data, height = 260 }: { data: { label: string; vendas: number; despesas: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.pine} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART.pine} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.danger} stopOpacity={0.22} />
            <stop offset="100%" stopColor={CHART.danger} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => brlShort(Number(v)).replace("R$ ", "")} width={52} />
        <Tooltip content={<Tip />} />
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "IBM Plex Sans" }} />
        <Area type="monotone" dataKey="vendas" name="Vendas" stroke={CHART.pine} strokeWidth={2.2} fill="url(#gVendas)" />
        <Area type="monotone" dataKey="despesas" name="Despesas" stroke={CHART.danger} strokeWidth={1.8} fill="url(#gDesp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FluxoChart({ data, height = 280 }: {
  data: { label: string; in: number; out: number; saldo: number; pIn: number; pOut: number }[]; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => brlShort(Number(v)).replace("R$ ", "")} width={52} />
        <Tooltip content={<Tip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke={CHART.label} strokeDasharray="3 3" />
        <Bar dataKey="in" name="Entradas" fill={CHART.pine} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="out" name="Saídas" fill={CHART.danger} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="pIn" name="A receber (prev.)" fill={CHART.pine} fillOpacity={0.28} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="pOut" name="A pagar (prev.)" fill={CHART.danger} fillOpacity={0.28} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Line type="monotone" dataKey="saldo" name="Saldo" stroke={CHART.warn} strokeWidth={2.2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function LucroChart({ data, height = 260 }: { data: { label: string; faturamento: number; lucro: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => brlShort(Number(v)).replace("R$ ", "")} width={52} />
        <Tooltip content={<Tip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturamento" name="Faturamento" fill={CHART.pine} radius={[4, 4, 0, 0]} maxBarSize={34} />
        <Bar dataKey="lucro" name="Lucro líquido" fill={CHART.leafBright} radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const colors = [CHART.pine, CHART.info, CHART.warn, CHART.leaf, CHART.danger, "#8a5fb0", "#4e7d94", "#a2653a"];
  const valid = data.filter((d) => d.value > 0);
  if (!valid.length) return <p className="py-10 text-center text-[13px] text-ink-faint">Sem dados no período.</p>;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={height} className="sm:max-w-[220px]">
        <PieChart>
          <Pie data={valid} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} strokeWidth={0}>
            {valid.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full space-y-1.5">
        {valid.slice(0, 6).map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2 text-ink-soft">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="tnum font-semibold text-ink">{brlShort(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportChart({ data, x, series, height = 260 }: {
  data: Record<string, string | number>[]; x: string;
  series: { key: string; color: string; label: string }[]; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => brlShort(Number(v)).replace("R$ ", "")} width={52} />
        <Tooltip content={<Tip />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={30} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MarginLine({ data, height = 200 }: { data: { label: string; margem: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={40} />
        <Tooltip content={<Tip money={false} />} />
        <Line type="monotone" dataKey="margem" name="Margem (%)" stroke={CHART.pine} strokeWidth={2.4} dot={{ r: 3, fill: CHART.pine }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
