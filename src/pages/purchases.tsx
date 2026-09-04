/* ============================================================
 * Fluxo — Módulo de Compras
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Plus, Truck, Trash2 } from "lucide-react";
import { useApp } from "../store";
import { brl, fmtDate, numParse, todayISO } from "../lib/utils";
import { completePurchase, addDaysISO, R } from "../lib/services";
import type { PurchaseItem } from "../lib/types";
import {
  Button, Badge, Card, Empty, Field, Input, Modal, SearchSelect, Select, Stepper,
  TableWrap, Th, Td, useToast, PageHead, Money, IconBtn, ProductThumb, Confirm,
} from "../components/ui";

function PurchaseModal({ open, onClose, presetSupplier }: { open: boolean; onClose: () => void; presetSupplier?: string }) {
  const { db, update } = useApp();
  const toast = useToast();
  const [f, setF] = useState({
    supplierId: "", items: [] as PurchaseItem[], discount: "", freight: "",
    method: "PIX", date: todayISO(), dueDate: addDaysISO(todayISO(), 15),
  });
  const [pick, setPick] = useState("");

  useEffect(() => {
    if (open) {
      setF({ supplierId: presetSupplier ?? "", items: [], discount: "", freight: "", method: "PIX", date: todayISO(), dueDate: addDaysISO(todayISO(), 15) });
      setPick("");
    }
  }, [open, presetSupplier]);

  if (!db) return null;

  const addItem = (id: string) => {
    if (!id) return;
    const p = db.products.find((x) => x.id === id);
    if (!p) return;
    setF((prev) => prev.items.some((i) => i.productId === id)
      ? prev
      : { ...prev, items: [...prev.items, { productId: p.id, name: p.name, qty: 1, cost: p.cost }] });
    setPick("");
  };

  const itemsTotal = f.items.reduce((s, i) => s + i.qty * i.cost, 0);
  const total = R(itemsTotal - numParse(f.discount) + numParse(f.freight));
  const onCredit = f.method === "Fiado";

  const save = () => {
    if (!f.supplierId) return toast.push("danger", "Selecione o fornecedor.");
    if (f.items.length === 0) return toast.push("danger", "Adicione ao menos um produto.");
    update((d) => completePurchase(d, {
      supplierId: f.supplierId, items: f.items.map((i) => ({ productId: i.productId, qty: i.qty, cost: i.cost })),
      discount: numParse(f.discount), freight: numParse(f.freight), method: f.method,
      date: f.date, dueDate: onCredit ? f.dueDate : "",
    }));
    toast.push("success", "Compra registrada — estoque atualizado.");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova compra" size="lg"
      footer={
        <>
          <div className="mr-auto">
            <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">Total</p>
            <p className="tnum font-display text-[22px] font-bold text-pine-700">{brl(total)}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button size="lg" onClick={save}><Truck size={16} /> Concluir compra</Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fornecedor">
          <SearchSelect options={db.suppliers.map((s) => ({ id: s.id, label: s.name, sub: s.phone }))} value={f.supplierId} onChange={(id) => setF({ ...f, supplierId: id })} placeholder="Buscar fornecedor…" />
        </Field>
        <Field label="Data da compra">
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Adicionar produto">
          <SearchSelect
            options={db.products.map((p) => ({ id: p.id, label: p.name, sub: `custo atual ${brl(p.cost)} · estoque ${p.stock}`, right: `SKU ${p.sku}` }))}
            value={pick} onChange={addItem} placeholder="Buscar produto…" allowClear={false}
          />
        </Field>
      </div>

      {f.items.length > 0 && (
        <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
          {f.items.map((it) => (
            <li key={it.productId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <ProductThumb name={it.name} size={32} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{it.name}</span>
              <Stepper value={it.qty} onChange={(n) => setF({ ...f, items: f.items.map((x) => (x.productId === it.productId ? { ...x, qty: n } : x)) })} />
              <div className="w-28">
                <Input aria-label="Custo unitário" value={String(it.cost).replace(".", ",")} className="h-9 text-right text-[13px]"
                  onChange={(e) => setF({ ...f, items: f.items.map((x) => (x.productId === it.productId ? { ...x, cost: numParse(e.target.value) } : x)) })} />
              </div>
              <Money value={it.qty * it.cost} className="w-20 text-right text-[13.5px] font-bold" />
              <IconBtn label="Remover" className="text-danger hover:bg-danger-soft" onClick={() => setF({ ...f, items: f.items.filter((x) => x.productId !== it.productId) })}>
                <Trash2 size={15} />
              </IconBtn>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Desconto (R$)"><Input inputMode="decimal" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} placeholder="0,00" /></Field>
        <Field label="Frete (R$)"><Input inputMode="decimal" value={f.freight} onChange={(e) => setF({ ...f, freight: e.target.value })} placeholder="0,00" /></Field>
        <Field label="Forma de pagamento">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            {db.settings.methods.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>

      {onCredit && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Vencimento" hint="Será criada uma conta a pagar automaticamente">
            <Input type="date" value={f.dueDate} min={f.date} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </Field>
          <div className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[12.5px] font-medium text-warn self-end">
            Compra a prazo: o valor entra em Contas a Pagar.
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function PurchasesPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [cancelT, setCancelT] = useState<{ id: string; number: string } | null>(null);

  useEffect(() => { if (query.get("nova")) setShow(true); }, [query]);

  const list = useMemo(() => (db ? db.purchases : []), [db]);
  if (!db) return null;

  return (
    <div className="animate-fade-up">
      <PageHead title="Compras" desc="Reponha o estoque — o custo do produto e o caixa agradecem.">
        <Button size="lg" onClick={() => setShow(true)}><Plus size={17} /> Nova compra</Button>
      </PageHead>

      {list.length === 0 ? (
        <Empty icon={<Truck size={26} />} title="Nenhuma compra registrada."
          desc="Ao concluir uma compra o estoque é atualizado na hora — e compras a prazo viram contas a pagar."
          action={<Button onClick={() => setShow(true)}><Plus size={15} /> Nova compra</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Nº</Th><Th>Data</Th><Th>Fornecedor</Th><Th className="hidden md:table-cell">Itens</Th><Th>Pagamento</Th><Th className="hidden sm:table-cell">Vencimento</Th><Th right>Total</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((p) => {
              const payable = db.payables.find((x) => x.refId === p.id);
              return (
                <tr key={p.id} className="transition-colors hover:bg-pine-50/50">
                  <Td className="font-bold text-pine-700">{p.number}</Td>
                  <Td>{fmtDate(p.date)}</Td>
                  <Td className="font-semibold">{p.supplierName}</Td>
                  <Td className="hidden text-ink-soft md:table-cell">{p.items.reduce((a, i) => a + i.qty, 0)} un</Td>
                  <Td>
                    {p.method === "Fiado"
                      ? payable?.status === "pago" ? <Badge tone="green">Paga</Badge> : <Badge tone="amber">A prazo</Badge>
                      : p.method}
                  </Td>
                  <Td className="hidden text-[12.5px] text-ink-soft sm:table-cell">{p.dueDate ? fmtDate(p.dueDate) : "—"}</Td>
                  <Td right><Money value={p.total} className="font-bold" /></Td>
                  <Td right>
                    {p.status !== "cancelada" && (
                      <IconBtn label="Cancelar compra" className="text-danger hover:bg-danger-soft" onClick={() => setCancelT({ id: p.id, number: p.number })}>
                        <Trash2 size={15} />
                      </IconBtn>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <PurchaseModal open={show} presetSupplier={query.get("fornecedor") ?? undefined} onClose={() => { setShow(false); if (query.get("nova")) navigate("/compras"); }} />
      <Confirm open={!!cancelT} onClose={() => setCancelT(null)} danger yesLabel="Cancelar compra" title={`Cancelar ${cancelT?.number}?`}
        msg="O estoque será reduzido e a conta a pagar vinculada, cancelada."
        onYes={() => {
          if (!cancelT) return;
          update((d) => {
            const p = d.purchases.find((x) => x.id === cancelT.id);
            if (!p || p.status === "cancelada") return;
            p.status = "cancelada";
            for (const it of p.items) {
              const prod = d.products.find((x) => x.id === it.productId);
              if (prod) prod.stock = Math.max(0, prod.stock - it.qty);
            }
            for (const pay of d.payables.filter((x) => x.refId === p.id && x.status === "pendente")) pay.status = "pago";
            d.cashMoves = d.cashMoves.filter((m) => !(m.refType === "compra" && m.refId === p.id));
          });
          toast.push("info", `Compra ${cancelT.number} cancelada.`);
        }} />
    </div>
  );
}
