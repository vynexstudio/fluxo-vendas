/* ============================================================
 * Fluxo — Regras de negócio (agnósticas de UI e de banco)
 * Toda mutação de domínio passa por aqui.
 * ============================================================ */
import type {
  DB, Sale, SaleItem, Purchase, Receivable, Payable, Order, OrderStatus, CashSession, StockMove,
} from "./types";
import { inRange, todayISO, uid } from "./utils";
import { addDays, addMonths, format, subDays, startOfWeek, startOfMonth, startOfYear, parseISO } from "date-fns";

const dISO = (d: Date) => format(d, "yyyy-MM-dd");
export const R = (n: number) => Math.round(n * 100) / 100;

export function notify(d: DB, kind: "success" | "warn" | "info" | "danger", msg: string): void {
  d.notis.unshift({ id: uid(), kind, msg, read: false, createdAt: new Date().toISOString() });
  if (d.notis.length > 60) d.notis.length = 60;
}

function seq(d: DB, key: "v" | "p" | "o", prefix: string): string {
  d.settings.seq[key] += 1;
  return `${prefix}-${String(d.settings.seq[key]).padStart(4, "0")}`;
}

export function openSession(d: DB): CashSession | null {
  return d.sessions.find((s) => !s.closedAt) ?? null;
}

function cashMove(d: DB, dir: "in" | "out", description: string, amount: number, method: string, date: string, refType?: string, refId?: string): void {
  const s = openSession(d);
  d.cashMoves.unshift({
    id: uid(), sessionId: s?.id ?? "avulso", dir, description, amount: R(amount), method, date, refType, refId,
    createdAt: new Date().toISOString(),
  });
}

export function moveStock(d: DB, productId: string, type: StockMove["type"], delta: number, note: string, ref = "", date?: string): void {
  const p = d.products.find((x) => x.id === productId);
  if (!p) return;
  p.stock = Math.max(0, Math.round((p.stock + delta) * 1000) / 1000);
  d.moves.unshift({ id: uid(), productId, type, qty: delta, date: date ?? todayISO(), note, ref });
}

/* ---------------- Vendas ---------------- */

export interface SaleInput {
  customerId: string;
  items: SaleItem[];
  discount: number;
  method: string;
  installments: number;
  firstDue: string;
  date: string;
}

export function completeSale(d: DB, inp: SaleInput): Sale {
  const number = seq(d, "v", "V");
  const customer = d.customers.find((c) => c.id === inp.customerId);
  const subtotal = R(inp.items.reduce((s, it) => s + it.qty * it.price, 0));
  const total = R(Math.max(0, subtotal - inp.discount));
  const isFiado = inp.method === "Fiado";
  const sale: Sale = {
    id: uid(), number,
    customerId: inp.customerId || "avulso",
    customerName: customer?.name ?? "Consumidor final",
    items: inp.items, subtotal, discount: R(inp.discount), total,
    method: inp.method, installments: Math.max(1, inp.installments),
    status: isFiado || inp.installments > 1 ? "fiado" : "concluida",
    date: inp.date || todayISO(), createdAt: new Date().toISOString(),
  };
  d.sales.unshift(sale);
  for (const it of sale.items) moveStock(d, it.productId, "venda", -it.qty, `Venda ${number}`, sale.id, sale.date);

  if (isFiado || sale.installments > 1) {
    const n = sale.installments;
    const part = R(total / n);
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? R(total - part * (n - 1)) : part;
      d.receivables.unshift({
        id: uid(), customerId: sale.customerId, customerName: sale.customerName,
        description: n > 1 ? `Venda ${number} — parcela ${i + 1}/${n}` : `Venda ${number} (fiado)`,
        amount, paid: 0,
        dueDate: dISO(addMonths(parseISO(inp.firstDue || todayISO()), i)),
        origin: "venda", refId: sale.id, status: "pendente", createdAt: new Date().toISOString(),
      });
    }
    notify(d, "warn", `Venda ${number} registrada no fiado — ${sale.customerName}`);
  } else if (total > 0) {
    cashMove(d, "in", `Venda ${number} — ${sale.customerName}`, total, sale.method, sale.date, "venda", sale.id);
  }
  notify(d, "success", `Venda ${number} registrada (${sale.customerName}).`);
  return sale;
}

export function cancelSale(d: DB, saleId: string): void {
  const sale = d.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === "cancelada") return;
  sale.status = "cancelada";
  for (const it of sale.items) moveStock(d, it.productId, "devolucao", it.qty, `Cancelamento da venda ${sale.number}`, sale.id);
  d.cashMoves = d.cashMoves.filter((m) => !(m.refType === "venda" && m.refId === saleId));
  for (const r of d.receivables.filter((r) => r.refId === saleId && r.status === "pendente")) r.status = "cancelado";
  notify(d, "info", `Venda ${sale.number} cancelada e estoque devolvido.`);
}

/* ---------------- Compras ---------------- */

export interface PurchaseInput {
  supplierId: string;
  items: { productId: string; qty: number; cost: number }[];
  discount: number;
  freight: number;
  method: string;
  date: string;
  dueDate: string;
}

export function completePurchase(d: DB, inp: PurchaseInput): Purchase {
  const number = seq(d, "p", "C");
  const sup = d.suppliers.find((s) => s.id === inp.supplierId);
  const items = inp.items.map((it) => {
    const p = d.products.find((x) => x.id === it.productId)!;
    return { productId: it.productId, name: p?.name ?? "Produto", qty: it.qty, cost: it.cost };
  });
  const total = R(items.reduce((s, it) => s + it.qty * it.cost, 0) - inp.discount + inp.freight);
  const purchase: Purchase = {
    id: uid(), number, supplierId: inp.supplierId, supplierName: sup?.name ?? "Fornecedor",
    items, discount: R(inp.discount), freight: R(inp.freight), total,
    method: inp.method, date: inp.date || todayISO(), dueDate: inp.dueDate || "",
    status: "concluida", createdAt: new Date().toISOString(),
  };
  d.purchases.unshift(purchase);
  for (const it of items) {
    const p = d.products.find((x) => x.id === it.productId);
    if (p) { p.cost = it.cost; }
    moveStock(d, it.productId, "compra", it.qty, `Compra ${number}`, purchase.id, purchase.date);
  }
  const onCredit = inp.method === "Fiado" || (inp.dueDate && inp.dueDate > purchase.date);
  if (onCredit && total > 0) {
    d.payables.unshift({
      id: uid(), supplierId: purchase.supplierId, supplierName: purchase.supplierName,
      description: `Compra ${number} (a prazo)`, amount: total, dueDate: inp.dueDate || purchase.date,
      origin: "compra", refId: purchase.id, status: "pendente", createdAt: new Date().toISOString(),
    });
    notify(d, "warn", `Compra ${number} gerou conta a pagar para ${inp.dueDate ? "vencimento" : "hoje"}.`);
  } else if (total > 0) {
    cashMove(d, "out", `Compra ${number} — ${purchase.supplierName}`, total, inp.method, purchase.date, "compra", purchase.id);
  }
  notify(d, "success", `Compra ${number} registrada e estoque atualizado.`);
  return purchase;
}

/* ---------------- Despesas / Contas ---------------- */

export function settleExpense(d: DB, id: string, method: string): void {
  const e = d.expenses.find((x) => x.id === id);
  if (!e || e.status === "pago") return;
  e.status = "pago";
  e.method = method;
  cashMove(d, "out", `Despesa: ${e.description}`, e.amount, method, todayISO(), "despesa", e.id);
  notify(d, "success", `Despesa "${e.description}" paga.`);
}

export function settleReceivable(d: DB, id: string, amount: number, method: string): void {
  const r = d.receivables.find((x) => x.id === id);
  if (!r || r.status !== "pendente") return;
  const val = R(Math.min(amount, r.amount - r.paid));
  r.paid = R(r.paid + val);
  if (r.paid >= r.amount - 0.005) { r.paid = r.amount; r.status = "pago"; }
  cashMove(d, "in", `Recebimento: ${r.description} — ${r.customerName}`, val, method, todayISO(), "recebimento", r.id);
  notify(d, "success", `Recebido ${val.toFixed(2).replace(".", ",")} de ${r.customerName}.`);
}

export function settlePayable(d: DB, id: string, method: string): void {
  const p = d.payables.find((x) => x.id === id);
  if (!p || p.status === "pago") return;
  p.status = "pago";
  cashMove(d, "out", `Pagamento: ${p.description}`, p.amount, method, todayISO(), "pagamento", p.id);
  notify(d, "success", `Conta "${p.description}" paga.`);
}

/* ---------------- Caixa ---------------- */

export function openCash(d: DB, opening: number): void {
  if (openSession(d)) return;
  d.sessions.unshift({ id: uid(), openDate: todayISO(), openedAt: new Date().toISOString(), opening: R(opening) });
  notify(d, "info", "Caixa aberto.");
}

export function closeCash(d: DB, counted: number): CashSession | null {
  const s = openSession(d);
  if (!s) return null;
  const moves = d.cashMoves.filter((m) => m.sessionId === s.id);
  const totalIn = R(moves.filter((m) => m.dir === "in").reduce((a, m) => a + m.amount, 0));
  const totalOut = R(moves.filter((m) => m.dir === "out").reduce((a, m) => a + m.amount, 0));
  const byMethod: Record<string, number> = {};
  for (const m of moves.filter((m) => m.dir === "in")) byMethod[m.method] = R((byMethod[m.method] ?? 0) + m.amount);
  const expected = R(s.opening + totalIn - totalOut);
  s.closedAt = new Date().toISOString();
  s.closing = { counted: R(counted), expected, diff: R(counted - expected), byMethod, totalIn, totalOut };
  notify(d, "info", "Caixa fechado.");
  return s;
}

/* ---------------- Pedidos / Catálogo ---------------- */

export function placeOrder(d: DB, inp: { customerName: string; phone: string; address: string; items: SaleItem[]; method: string; notes: string }): Order {
  const number = seq(d, "o", "P");
  const total = R(inp.items.reduce((s, it) => s + it.qty * it.price, 0));
  const order: Order = {
    id: uid(), number, customerName: inp.customerName, phone: inp.phone, address: inp.address,
    items: inp.items, total, method: inp.method, notes: inp.notes,
    status: "novo", date: todayISO(), createdAt: new Date().toISOString(),
  };
  d.orders.unshift(order);
  notify(d, "warn", `Pedido ${number} recebido pelo catálogo — ${order.customerName}.`);
  return order;
}

export function setOrderStatus(d: DB, id: string, status: OrderStatus): void {
  const o = d.orders.find((x) => x.id === id);
  if (!o) return;
  o.status = status;
  if (status === "cancelado") {
    for (const r of d.receivables.filter((r) => r.refId === id && r.status === "pendente")) r.status = "cancelado";
  }
}

export function convertOrderToSale(d: DB, orderId: string, method: string, customerId: string): Sale | null {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return null;
  const sale = completeSale(d, {
    customerId: customerId || d.customers.find((c) => c.name === o.customerName)?.id || "avulso",
    items: o.items, discount: 0, method, installments: 1, firstDue: todayISO(), date: todayISO(),
  });
  o.status = "concluido";
  return sale;
}

export function chargeOrder(d: DB, orderId: string, dueDate: string): void {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  const cust = d.customers.find((c) => c.name === o.customerName);
  d.receivables.unshift({
    id: uid(), customerId: cust?.id ?? "avulso", customerName: o.customerName,
    description: `Pedido ${o.number}`, amount: o.total, paid: 0, dueDate: dueDate || todayISO(),
    origin: "pedido", refId: o.id, status: "pendente", createdAt: new Date().toISOString(),
  });
  notify(d, "info", `Cobrança do pedido ${o.number} lançada em contas a receber.`);
}

/* ---------------- Análises ---------------- */

export interface Range { start: string; end: string }

export function salesInRange(d: DB, r: Range): Sale[] {
  return d.sales.filter((s) => s.status !== "cancelada" && inRange(s.date, r.start, r.end));
}

export function receivableStatus(r: Receivable): "pago" | "pendente" | "vencido" | "cancelado" {
  if (r.status === "cancelado") return "cancelado";
  if (r.status === "pago" || r.paid >= r.amount - 0.005) return "pago";
  return r.dueDate < todayISO() ? "vencido" : "pendente";
}
export function payableStatus(p: Payable): "pago" | "pendente" | "vencido" {
  if (p.status === "pago") return "pago";
  return p.dueDate < todayISO() ? "vencido" : "pendente";
}

export function dashStats(d: DB, r: Range) {
  const sales = salesInRange(d, r);
  const today = todayISO();
  const salesToday = d.sales.filter((s) => s.status !== "cancelada" && s.date === today);
  const expToday = d.expenses.filter((e) => e.status === "pago" && e.date === today);
  const faturamento = R(sales.reduce((s, v) => s + v.total, 0));
  const cmv = R(sales.reduce((s, v) => s + v.items.reduce((a, it) => a + it.cost * it.qty, 0), 0));
  const despesas = R(d.expenses.filter((e) => e.status === "pago" && inRange(e.date, r.start, r.end)).reduce((s, e) => s + e.amount, 0));
  const hoje = {
    vendas: R(salesToday.reduce((s, v) => s + v.total, 0)),
    despesas: R(expToday.reduce((s, e) => s + e.amount, 0)),
  };
  const hojeCMV = R(salesToday.reduce((s, v) => s + v.items.reduce((a, it) => a + it.cost * it.qty, 0), 0));
  return {
    hoje,
    lucroHoje: R(hoje.vendas - hojeCMV - hoje.despesas),
    faturamento, cmv, despesas,
    lucro: R(faturamento - cmv - despesas),
    margem: faturamento > 0 ? ((faturamento - cmv - despesas) / faturamento) * 100 : 0,
    aReceber: R(d.receivables.filter((x) => receivableStatus(x) !== "pago" && receivableStatus(x) !== "cancelado").reduce((s, x) => s + x.amount - x.paid, 0)),
    aPagar: R([
      ...d.payables.filter((p) => payableStatus(p) !== "pago").map((p) => p.amount),
      ...d.expenses.filter((e) => e.status === "pendente").map((e) => e.amount),
    ].reduce((a, b) => a + b, 0)),
    estoqueUnidades: d.products.reduce((s, p) => s + p.stock, 0),
    estoqueValor: R(d.products.reduce((s, p) => s + p.stock * p.cost, 0)),
  };
}

export function seriesVendasDespesas(d: DB, days: number) {
  const out: { label: string; vendas: number; despesas: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dISO(subDays(new Date(), i));
    const v = d.sales.filter((s) => s.status !== "cancelada" && s.date === day).reduce((s, x) => s + x.total, 0);
    const e = d.expenses.filter((x) => x.status === "pago" && x.date === day).reduce((s, x) => s + x.amount, 0);
    out.push({ label: format(parseISO(day), "dd/MM"), vendas: R(v), despesas: R(e) });
  }
  return out;
}

export function topProducts(d: DB, r: Range, limit = 5) {
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of salesInRange(d, r)) {
    for (const it of s.items) {
      const cur = map.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.qty; cur.revenue = R(cur.revenue + it.qty * it.price);
      map.set(it.productId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

export function topCustomers(d: DB, r: Range, limit = 5) {
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const s of salesInRange(d, r)) {
    const cur = map.get(s.customerName) ?? { name: s.customerName, total: 0, count: 0 };
    cur.total = R(cur.total + s.total); cur.count++;
    map.set(s.customerName, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function lowStock(d: DB) {
  return d.products.filter((p) => p.active && p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
}

export function customerStats(d: DB, id: string) {
  const sales = d.sales.filter((s) => s.customerId === id && s.status !== "cancelada");
  const open = d.receivables
    .filter((r) => r.customerId === id && (receivableStatus(r) === "pendente" || receivableStatus(r) === "vencido"))
    .reduce((s, r) => s + r.amount - r.paid, 0);
  return {
    total: R(sales.reduce((s, v) => s + v.total, 0)),
    count: sales.length,
    last: sales[0]?.date ?? "",
    open: R(open),
  };
}

export type Granularity = "diario" | "semanal" | "mensal" | "anual";

export function cashflowSeries(d: DB, gran: Granularity, days = 90) {
  const buckets = new Map<string, { label: string; in: number; out: number; pIn: number; pOut: number; key: string }>();
  const keyOf = (date: string) => {
    const dt = parseISO(date);
    if (gran === "diario") return { key: date, label: format(dt, "dd/MM") };
    if (gran === "semanal") { const w = startOfWeek(dt, { weekStartsOn: 1 }); return { key: dISO(w), label: `Sem ${format(w, "dd/MM")}` }; }
    if (gran === "mensal") { const m = startOfMonth(dt); return { key: dISO(m), label: format(m, "MMM/yy") }; }
    const y = startOfYear(dt); return { key: dISO(y), label: format(y, "yyyy") };
  };
  const from = dISO(subDays(new Date(), days));
  const get = (date: string) => {
    const { key, label } = keyOf(date);
    if (!buckets.has(key)) buckets.set(key, { key, label, in: 0, out: 0, pIn: 0, pOut: 0 });
    return buckets.get(key)!;
  };
  for (const m of d.cashMoves) {
    if (m.date < from) continue;
    const b = get(m.date);
    if (m.dir === "in") b.in = R(b.in + m.amount); else b.out = R(b.out + m.amount);
  }
  const today = todayISO();
  for (const r of d.receivables) {
    if (r.status === "pendente" && r.dueDate > today) get(r.dueDate).pIn = R(get(r.dueDate).pIn + r.amount - r.paid);
  }
  for (const p of d.payables) {
    if (p.status === "pendente" && p.dueDate > today) get(p.dueDate).pOut = R(get(p.dueDate).pOut + p.amount);
  }
  for (const e of d.expenses) {
    if (e.status === "pendente" && e.dueDate > today) get(e.dueDate).pOut = R(get(e.dueDate).pOut + e.amount);
  }
  const arr = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  let saldo = 0;
  return arr.map((b) => {
    saldo = R(saldo + b.in - b.out);
    return { ...b, saldo };
  });
}

export function profitSeries(d: DB, months = 6) {
  const out: { label: string; faturamento: number; lucro: number; margem: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const ref = addMonths(startOfMonth(now), -i);
    const start = dISO(ref);
    const end = dISO(addMonths(ref, 1)).replace(/-\d{2}$/, "-01");
    const r: Range = { start, end: i === 0 ? todayISO() : dISO(subDays(parseISO(end), 1)) };
    const sales = salesInRange(d, r);
    const fat = R(sales.reduce((s, v) => s + v.total, 0));
    const cmv = R(sales.reduce((s, v) => s + v.items.reduce((a, it) => a + it.cost * it.qty, 0), 0));
    const desp = R(d.expenses.filter((e) => e.status === "pago" && inRange(e.date, r.start, r.end)).reduce((s, e) => s + e.amount, 0));
    const lucro = R(fat - cmv - desp);
    out.push({ label: format(ref, "MMM/yy"), faturamento: fat, lucro, margem: fat > 0 ? R((lucro / fat) * 100) : 0 });
  }
  return out;
}

/* ---------------- Relatórios ---------------- */

export interface ReportResult {
  title: string;
  cols: string[];
  rows: (string | number)[][];
  summary: { label: string; value: string }[];
  chart?: { data: Record<string, string | number>[]; x: string; series: { key: string; color: string; label: string }[] };
}

export function buildReport(d: DB, type: string, r: Range): ReportResult {
  const B = (v: number) => v.toFixed(2).replace(".", ",");
  switch (type) {
    case "vendas": {
      const sales = salesInRange(d, r).sort((a, b) => b.date.localeCompare(a.date));
      const total = R(sales.reduce((s, v) => s + v.total, 0));
      return {
        title: "Relatório de vendas",
        cols: ["Número", "Data", "Cliente", "Itens", "Pagamento", "Status", "Total (R$)"],
        rows: sales.map((s) => [s.number, format(parseISO(s.date), "dd/MM/yyyy"), s.customerName, s.items.reduce((a, i) => a + i.qty, 0), s.method, s.status, B(s.total)]),
        summary: [
          { label: "Vendas", value: String(sales.length) },
          { label: "Faturamento", value: `R$ ${B(total)}` },
          { label: "Ticket médio", value: `R$ ${sales.length ? B(total / sales.length) : "0,00"}` },
        ],
      };
    }
    case "despesas": {
      const list = d.expenses.filter((e) => inRange(e.date, r.start, r.end));
      const total = R(list.reduce((s, e) => s + e.amount, 0));
      const cats = new Map<string, number>();
      list.forEach((e) => cats.set(e.category, R((cats.get(e.category) ?? 0) + e.amount)));
      return {
        title: "Relatório de despesas",
        cols: ["Descrição", "Categoria", "Data", "Vencimento", "Status", "Valor (R$)"],
        rows: list.map((e) => [e.description, e.category, format(parseISO(e.date), "dd/MM/yyyy"), format(parseISO(e.dueDate || e.date), "dd/MM/yyyy"), e.status === "pago" ? "Pago" : "Pendente", B(e.amount)]),
        summary: [{ label: "Despesas", value: String(list.length) }, { label: "Total", value: `R$ ${B(total)}` }],
        chart: {
          data: [...cats.entries()].map(([name, value]) => ({ name, value })),
          x: "name", series: [{ key: "value", color: "#c74a4a", label: "Valor" }],
        },
      };
    }
    case "lucro": {
      const data = profitSeries(d, 6);
      const sales = salesInRange(d, r);
      const fat = R(sales.reduce((s, v) => s + v.total, 0));
      const cmv = R(sales.reduce((s, v) => s + v.items.reduce((a, it) => a + it.cost * it.qty, 0), 0));
      const desp = R(d.expenses.filter((e) => e.status === "pago" && inRange(e.date, r.start, r.end)).reduce((s, e) => s + e.amount, 0));
      const lucro = R(fat - cmv - desp);
      return {
        title: "Relatório de lucro",
        cols: ["Mês", "Faturamento (R$)", "Lucro (R$)", "Margem (%)"],
        rows: data.map((m) => [m.label, B(m.faturamento), B(m.lucro), m.margem.toFixed(1).replace(".", ",")]),
        summary: [
          { label: "Faturamento no período", value: `R$ ${B(fat)}` },
          { label: "CMV", value: `R$ ${B(cmv)}` },
          { label: "Despesas", value: `R$ ${B(desp)}` },
          { label: "Lucro líquido", value: `R$ ${B(lucro)}` },
        ],
        chart: {
          data: data as unknown as Record<string, string | number>[],
          x: "label",
          series: [{ key: "faturamento", color: "#14684a", label: "Faturamento" }, { key: "lucro", color: "#c0e95f", label: "Lucro" }],
        },
      };
    }
    case "produtos": {
      const tops = topProducts(d, { start: "2000-01-01", end: "2099-12-31" }, 999)
        .filter((t) => d.products.some((p) => p.name === t.name));
      return {
        title: "Produtos mais vendidos",
        cols: ["Produto", "Qtd vendida", "Receita (R$)"],
        rows: tops.map((t) => [t.name, t.qty, B(t.revenue)]),
        summary: [{ label: "Produtos vendidos", value: String(tops.length) }],
        chart: {
          data: tops.slice(0, 8).map((t) => ({ name: t.name, qty: t.qty })),
          x: "name", series: [{ key: "qty", color: "#14684a", label: "Unidades" }],
        },
      };
    }
    case "estoque": {
      return {
        title: "Relatório de estoque",
        cols: ["Produto", "SKU", "Estoque", "Mínimo", "Custo (R$)", "Valor em estoque (R$)", "Situação"],
        rows: d.products.map((p) => [p.name, p.sku, p.stock, p.minStock, B(p.cost), B(p.stock * p.cost), p.stock <= p.minStock ? "Baixo" : "OK"]),
        summary: [
          { label: "Produtos", value: String(d.products.length) },
          { label: "Valor imobilizado", value: `R$ ${B(d.products.reduce((s, p) => s + p.stock * p.cost, 0))}` },
          { label: "Estoque baixo", value: String(lowStock(d).length) },
        ],
      };
    }
    case "clientes": {
      const list = d.customers.map((c) => ({ c, s: customerStats(d, c.id) })).sort((a, b) => b.s.total - a.s.total);
      return {
        title: "Relatório de clientes",
        cols: ["Cliente", "Compras", "Total comprado (R$)", "Em aberto (R$)", "Última compra"],
        rows: list.map(({ c, s }) => [c.name, s.count, B(s.total), B(s.open), s.last ? format(parseISO(s.last), "dd/MM/yyyy") : "—"]),
        summary: [{ label: "Clientes", value: String(d.customers.length) }],
      };
    }
    case "fornecedores": {
      return {
        title: "Relatório de fornecedores",
        cols: ["Fornecedor", "Compras", "Total (R$)", "Em aberto (R$)"],
        rows: d.suppliers.map((f) => {
          const buys = d.purchases.filter((p) => p.supplierId === f.id && p.status !== "cancelada");
          const open = d.payables.filter((p) => p.supplierId === f.id && p.status === "pendente").reduce((s, p) => s + p.amount, 0);
          return [f.name, buys.length, B(buys.reduce((s, p) => s + p.total, 0)), B(open)] as (string | number)[];
        }),
        summary: [{ label: "Fornecedores", value: String(d.suppliers.length) }],
      };
    }
    case "receber": {
      const list = d.receivables.filter((x) => x.status !== "cancelado");
      const open = list.filter((x) => receivableStatus(x) !== "pago");
      return {
        title: "Contas a receber",
        cols: ["Cliente", "Descrição", "Vencimento", "Valor (R$)", "Recebido (R$)", "Status"],
        rows: list.map((x) => [x.customerName, x.description, format(parseISO(x.dueDate), "dd/MM/yyyy"), B(x.amount), B(x.paid), receivableStatus(x)]),
        summary: [
          { label: "Títulos", value: String(list.length) },
          { label: "Em aberto", value: `R$ ${B(open.reduce((s, x) => s + x.amount - x.paid, 0))}` },
        ],
      };
    }
    case "pagar": {
      const list = [
        ...d.payables.map((p) => ({ who: p.supplierName, desc: p.description, due: p.dueDate, val: p.amount, st: payableStatus(p) })),
        ...d.expenses.filter((e) => e.status === "pendente").map((e) => ({ who: "Despesa interna", desc: e.description, due: e.dueDate, val: e.amount, st: payableStatus({ ...e, supplierId: "", supplierName: "", origin: "outro", refId: "", createdAt: "" }) })),
      ];
      return {
        title: "Contas a pagar",
        cols: ["Fornecedor/Origem", "Descrição", "Vencimento", "Valor (R$)", "Status"],
        rows: list.map((x) => [x.who, x.desc, format(parseISO(x.due || todayISO()), "dd/MM/yyyy"), B(x.val), x.st]),
        summary: [{ label: "Títulos", value: String(list.length) }, { label: "A pagar", value: `R$ ${B(list.filter((x) => x.st !== "pago").reduce((s, x) => s + x.val, 0))}` }],
      };
    }
    default: {
      const data = cashflowSeries(d, "diario", 30);
      return {
        title: "Fluxo de caixa",
        cols: ["Dia", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"],
        rows: data.map((x) => [x.label, B(x.in), B(x.out), B(x.saldo)]),
        summary: [
          { label: "Entradas", value: `R$ ${B(data.reduce((s, x) => s + x.in, 0))}` },
          { label: "Saídas", value: `R$ ${B(data.reduce((s, x) => s + x.out, 0))}` },
        ],
        chart: {
          data: data as unknown as Record<string, string | number>[],
          x: "label",
          series: [{ key: "in", color: "#14684a", label: "Entradas" }, { key: "out", color: "#c74a4a", label: "Saídas" }],
        },
      };
    }
  }
}

export function backupJSON(d: DB): string {
  return JSON.stringify({ app: "fluxo", version: 1, exportedAt: new Date().toISOString(), data: d }, null, 2);
}

export function parseBackup(text: string): DB | null {
  try {
    const obj = JSON.parse(text);
    const data = obj?.data ?? obj;
    if (!data || !Array.isArray(data.products) || !Array.isArray(data.sales)) return null;
    return data as DB;
  } catch {
    return null;
  }
}

export function addDaysISO(iso: string, n: number): string {
  return dISO(addDays(parseISO(iso || todayISO()), n));
}

export function dueBadge(date: string): "vencido" | "hoje" | "proximo" | "futuro" {
  const t = todayISO();
  if (date < t) return "vencido";
  if (date === t) return "hoje";
  if (date <= dISO(addDays(new Date(), 7))) return "proximo";
  return "futuro";
}

export function addMonthsISO(iso: string, n: number): string {
  return dISO(addMonths(parseISO(iso || todayISO()), n));
}
