/* ============================================================
 * Fluxo — Módulo de Vendas
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Plus, Printer, XCircle, Eye, ShoppingCart, Trash2, Ban } from "lucide-react";
import { useApp } from "../store";
import type { Sale, SaleItem } from "../lib/types";
import { brl, cx, fmtDate, numParse, todayISO } from "../lib/utils";
import { completeSale, cancelSale, addDaysISO, R } from "../lib/services";
import {
  Button, Badge, Card, Empty, Field, Input, Modal, SearchSelect, Select, Stepper,
  TableWrap, Th, Td, Money, Confirm, useToast, PageHead, IconBtn, ProductThumb,
} from "../components/ui";

const emptyForm = () => ({
  customerId: "",
  items: [] as SaleItem[],
  discount: "",
  method: "PIX",
  installments: 1,
  firstDue: addDaysISO(todayISO(), 15),
  date: todayISO(),
});

export function SaleModal({ open, onClose, onDone, presetCustomerId }: {
  open: boolean; onClose: () => void; onDone?: (sale: Sale) => void; presetCustomerId?: string;
}) {
  const { db, update } = useApp();
  const toast = useToast();
  const [f, setF] = useState(emptyForm());
  const [pickProduct, setPickProduct] = useState("");

  useEffect(() => {
    if (open) { setF({ ...emptyForm(), customerId: presetCustomerId ?? "" }); setPickProduct(""); }
  }, [open, presetCustomerId]);

  if (!db) return null;

  const productOpts = db.products.filter((p) => p.active).map((p) => ({
    id: p.id, label: p.name, sub: `SKU ${p.sku} · estoque ${p.stock} ${p.unit}`, right: brl(p.price),
  }));
  const customerOpts = db.customers.map((c) => ({ id: c.id, label: c.name, sub: c.phone }));

  const addItem = (id: string) => {
    if (!id) return;
    const p = db.products.find((x) => x.id === id);
    if (!p) return;
    setF((prev) => {
      const existing = prev.items.find((i) => i.productId === id);
      if (existing) {
        return { ...prev, items: prev.items.map((i) => (i.productId === id ? { ...i, qty: i.qty + 1 } : i)) };
      }
      return { ...prev, items: [...prev.items, { productId: p.id, name: p.name, qty: 1, price: p.price, cost: p.cost }] };
    });
    setPickProduct("");
  };

  const subtotal = f.items.reduce((s, i) => s + i.qty * i.price, 0);
  const discount = Math.min(numParse(f.discount), subtotal);
  const total = R(subtotal - discount);
  const isCredit = f.method === "Fiado" || f.method === "Cartão de crédito";

  const finish = () => {
    if (f.items.length === 0) return toast.push("danger", "Adicione ao menos um produto.");
    if (f.method === "Fiado" && !f.customerId) return toast.push("danger", "Venda fiado precisa de um cliente cadastrado.");
    for (const it of f.items) {
      const p = db.products.find((x) => x.id === it.productId);
      if (p && it.qty > p.stock) return toast.push("danger", `Estoque insuficiente de ${p.name} (disponível: ${p.stock}).`);
    }
    let created: Sale | null = null;
    update((d) => {
      created = completeSale(d, {
        customerId: f.customerId, items: f.items, discount, method: f.method,
        installments: f.method === "Fiado" || f.method === "Cartão de crédito" ? f.installments : 1,
        firstDue: f.firstDue, date: f.date,
      });
    });
    toast.push("success", "Venda registrada! Estoque e caixa atualizados.");
    onClose();
    if (created) onDone?.(created);
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova venda" size="lg"
      footer={
        <>
          <div className="mr-auto">
            <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">Total</p>
            <p className="tnum font-display text-[22px] font-bold text-pine-700">{brl(total)}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button size="lg" onClick={finish}><ShoppingCart size={16} /> Concluir venda</Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" hint="Deixe vazio para consumidor final">
          <SearchSelect options={customerOpts} value={f.customerId} onChange={(id) => setF({ ...f, customerId: id })} placeholder="Buscar cliente…" />
        </Field>
        <Field label="Data da venda">
          <Input type="date" value={f.date} max={todayISO()} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Adicionar produto">
          <SearchSelect options={productOpts} value={pickProduct} onChange={addItem} placeholder="Digite o nome ou SKU…" allowClear={false} />
        </Field>
      </div>

      {f.items.length > 0 && (
        <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
          {f.items.map((it) => (
            <li key={it.productId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <ProductThumb name={it.name} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{it.name}</span>
                <span className="text-[11.5px] text-ink-faint">{brl(it.price)} / {db.products.find((p) => p.id === it.productId)?.unit ?? "un"}</span>
              </span>
              <Stepper value={it.qty} onChange={(n) => setF({ ...f, items: f.items.map((x) => (x.productId === it.productId ? { ...x, qty: n } : x)) })} />
              <div className="w-24">
                <Input aria-label="Preço unitário" value={String(it.price).replace(".", ",")} className="h-9 text-right text-[13px]"
                  onChange={(e) => setF({ ...f, items: f.items.map((x) => (x.productId === it.productId ? { ...x, price: numParse(e.target.value) } : x)) })} />
              </div>
              <Money value={it.qty * it.price} className="w-20 text-right text-[13.5px] font-bold" />
              <IconBtn label="Remover item" className="text-danger hover:bg-danger-soft" onClick={() => setF({ ...f, items: f.items.filter((x) => x.productId !== it.productId) })}>
                <Trash2 size={15} />
              </IconBtn>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Desconto (R$)">
          <Input value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </Field>
        <Field label="Forma de pagamento">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            {db.settings.methods.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        {isCredit ? (
          <Field label="Parcelas">
            <Select value={String(f.installments)} onChange={(e) => setF({ ...f, installments: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}× {n > 1 ? `de ${brl(total / n)}` : "(à vista)"}</option>)}
            </Select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      {(f.method === "Fiado" || f.installments > 1) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Primeiro vencimento" hint="As demais parcelas vencem mensalmente">
            <Input type="date" value={f.firstDue} min={todayISO()} onChange={(e) => setF({ ...f, firstDue: e.target.value })} />
          </Field>
          <div className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[12.5px] font-medium text-warn">
            Esta venda vai gerar {f.method === "Fiado" || f.installments > 1 ? f.installments : 1} título(s) em contas a receber.
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl bg-paper p-4">
        <div className="flex justify-between text-[13px] text-ink-soft"><span>Subtotal</span><span className="tnum">{brl(subtotal)}</span></div>
        <div className="mt-1 flex justify-between text-[13px] text-ink-soft"><span>Desconto</span><span className="tnum text-danger">− {brl(discount)}</span></div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 font-display text-[16px] font-bold"><span>Total</span><span className="tnum text-pine-700">{brl(total)}</span></div>
      </div>
    </Modal>
  );
}

export function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { db } = useApp();
  if (!sale || !db) return null;
  return (
    <Modal open={!!sale} onClose={onClose} title={`Comprovante — ${sale.number}`} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={() => window.print()}><Printer size={15} /> Imprimir</Button>
        </>
      }>
      <div id="print-area" className="rounded-xl border border-dashed border-line-strong bg-surface p-5 font-body">
        <div className="text-center">
          <p className="font-display text-[17px] font-bold">{db.business?.name ?? "Seu negócio"}</p>
          <p className="text-[11.5px] text-ink-soft">{db.business?.address || ""}</p>
          <p className="text-[11.5px] text-ink-soft">{db.business?.phone || ""}</p>
        </div>
        <div className="my-3 border-t border-dashed border-line-strong" />
        <div className="flex justify-between text-[12.5px]"><span className="text-ink-soft">Venda</span><span className="font-bold">{sale.number}</span></div>
        <div className="flex justify-between text-[12.5px]"><span className="text-ink-soft">Data</span><span>{fmtDate(sale.date)}</span></div>
        <div className="flex justify-between text-[12.5px]"><span className="text-ink-soft">Cliente</span><span>{sale.customerName}</span></div>
        <div className="my-3 border-t border-dashed border-line-strong" />
        {sale.items.map((it) => (
          <div key={it.productId} className="flex justify-between gap-2 py-0.5 text-[12.5px]">
            <span className="min-w-0 flex-1 truncate">{it.qty}× {it.name}</span>
            <span className="tnum">{brl(it.qty * it.price)}</span>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-line-strong" />
        {sale.discount > 0 && <div className="flex justify-between text-[12.5px] text-danger"><span>Desconto</span><span className="tnum">− {brl(sale.discount)}</span></div>}
        <div className="mt-1 flex justify-between font-display text-[15px] font-bold"><span>TOTAL</span><span className="tnum">{brl(sale.total)}</span></div>
        <div className="mt-1 flex justify-between text-[12.5px]"><span className="text-ink-soft">Pagamento</span><span>{sale.method}{sale.installments > 1 ? ` · ${sale.installments}×` : ""}</span></div>
        {sale.status === "fiado" && <p className="mt-3 rounded bg-warn-soft px-2 py-1 text-center text-[11.5px] font-semibold text-warn">VENDA FIADO — pagamento pendente</p>}
        <p className="mt-4 text-center text-[11px] text-ink-faint">Obrigado pela preferência! Emitido pelo Fluxo.</p>
      </div>
    </Modal>
  );
}

export default function SalesPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [flt, setFlt] = useState({ q: "", customer: "", method: "", status: "", start: "", end: "" });

  useEffect(() => {
    if (query.get("nova") || query.get("cliente")) setShowNew(true);
    const q = query.get("q");
    if (q) setFlt((f) => ({ ...f, q }));
  }, [query]);

  const sales = useMemo(() => {
    if (!db) return [];
    return db.sales.filter((s) => {
      if (flt.q && !(`${s.number} ${s.customerName}`.toLowerCase().includes(flt.q.toLowerCase()))) return false;
      if (flt.customer && s.customerId !== flt.customer) return false;
      if (flt.method && s.method !== flt.method) return false;
      if (flt.status && s.status !== flt.status) return false;
      if (flt.start && s.date < flt.start) return false;
      if (flt.end && s.date > flt.end) return false;
      return true;
    });
  }, [db, flt]);

  if (!db) return null;

  const totalFiltrado = R(sales.filter((s) => s.status !== "cancelada").reduce((s, v) => s + v.total, 0));

  return (
    <div className="animate-fade-up">
      <PageHead title="Vendas" desc="Registre vendas em segundos — estoque, caixa e fiado atualizados automaticamente.">
        <Button size="lg" onClick={() => setShowNew(true)}><Plus size={17} /> Nova venda</Button>
      </PageHead>

      <Card className="mb-4">
        <div className="grid gap-2.5 p-3.5 sm:grid-cols-2 lg:grid-cols-6">
          <Input placeholder="Buscar por nº ou cliente…" value={flt.q} onChange={(e) => setFlt({ ...flt, q: e.target.value })} className="h-9.5 text-[13px] lg:col-span-2" aria-label="Buscar vendas" />
          <Select value={flt.customer} onChange={(e) => setFlt({ ...flt, customer: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todos os clientes</option>
            {db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={flt.method} onChange={(e) => setFlt({ ...flt, method: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todas as formas</option>
            {db.settings.methods.map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Select value={flt.status} onChange={(e) => setFlt({ ...flt, status: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todos os status</option>
            <option value="concluida">Concluída</option>
            <option value="fiado">Fiado</option>
            <option value="cancelada">Cancelada</option>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={flt.start} onChange={(e) => setFlt({ ...flt, start: e.target.value })} className="h-9.5 text-[12px]" aria-label="Data inicial" />
            <Input type="date" value={flt.end} onChange={(e) => setFlt({ ...flt, end: e.target.value })} className="h-9.5 text-[12px]" aria-label="Data final" />
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between text-[13px] text-ink-soft">
        <span>{sales.length} venda{sales.length !== 1 ? "s" : ""} encontrada{sales.length !== 1 ? "s" : ""}</span>
        <span>Total: <Money value={totalFiltrado} className="font-bold text-pine-700" /></span>
      </div>

      {sales.length === 0 ? (
        <Empty
          icon={<ShoppingCart size={26} />}
          title="Você ainda não realizou nenhuma venda."
          desc="Registre a primeira venda: selecione o cliente, os produtos e a forma de pagamento. Pronto."
          action={<Button size="lg" onClick={() => setShowNew(true)}><Plus size={16} /> Nova venda</Button>}
        />
      ) : (
        <TableWrap>
          <thead>
            <tr><Th>Nº</Th><Th>Data</Th><Th>Cliente</Th><Th className="hidden md:table-cell">Itens</Th><Th>Pagamento</Th><Th>Status</Th><Th right>Total</Th><Th right>Ações</Th></tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className={cx("transition-colors hover:bg-pine-50/50", s.status === "cancelada" && "opacity-55")}>
                <Td className="font-bold text-pine-700">{s.number}</Td>
                <Td>{fmtDate(s.date)}</Td>
                <Td>
                  <button className="font-semibold hover:text-pine-700 hover:underline" onClick={() => navigate(s.customerId !== "avulso" ? `/clientes?q=${encodeURIComponent(s.customerName)}` : "/vendas")}>
                    {s.customerName}
                  </button>
                </Td>
                <Td className="hidden md:table-cell text-ink-soft">{s.items.reduce((a, i) => a + i.qty, 0)} un</Td>
                <Td>{s.method}{s.installments > 1 ? ` (${s.installments}×)` : ""}</Td>
                <Td>
                  {s.status === "fiado" ? <Badge tone="amber">Fiado</Badge> : s.status === "cancelada" ? <Badge tone="red">Cancelada</Badge> : <Badge tone="green">Concluída</Badge>}
                </Td>
                <Td right><Money value={s.total} className="font-bold" /></Td>
                <Td right>
                  <div className="flex justify-end gap-0.5">
                    <IconBtn label="Ver comprovante" onClick={() => setReceipt(s)}><Eye size={16} /></IconBtn>
                    {s.status !== "cancelada" && (
                      <IconBtn label="Cancelar venda" className="text-danger hover:bg-danger-soft" onClick={() => setCancelTarget(s)}><Ban size={16} /></IconBtn>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <SaleModal open={showNew} onClose={() => { setShowNew(false); if (query.get("nova") || query.get("cliente")) navigate("/vendas"); }} onDone={(s) => setReceipt(s)} presetCustomerId={query.get("cliente") ?? undefined} />
      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
      <Confirm
        open={!!cancelTarget} onClose={() => setCancelTarget(null)} danger yesLabel="Cancelar venda"
        title={`Cancelar ${cancelTarget?.number}?`}
        msg={<>O estoque dos itens será devolvido, movimentações de caixa removidas e títulos em aberto cancelados. Essa ação não pode ser desfeita.</>}
        onYes={() => {
          if (!cancelTarget) return;
          update((d) => cancelSale(d, cancelTarget.id));
          toast.push("info", `Venda ${cancelTarget.number} cancelada.`);
        }}
      />
    </div>
  );
}
