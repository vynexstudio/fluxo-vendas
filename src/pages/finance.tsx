/* ============================================================
 * Fluxo — Contas a receber, a pagar e Fiado
 * ============================================================ */
import { useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, ArrowDownCircle, ArrowUpCircle, Coins, Trash2, CreditCard } from "lucide-react";
import { useApp } from "../store";
import type { Receivable } from "../lib/types";
import { brl, cx, fmtDate, numParse, todayISO, waLink } from "../lib/utils";
import { receivableStatus, payableStatus, settleReceivable, settlePayable, settleExpense, dueBadge, R } from "../lib/services";
import {
  Button, Badge, Card, Confirm, Empty, Field, Input, Modal, Seg, Select,
  TableWrap, Th, Td, useToast, PageHead, Money, IconBtn,
} from "../components/ui";

function PayReceiveModal({ target, onClose }: { target: Receivable | null; onClose: () => void }) {
  const { db, update } = useApp();
  const toast = useToast();
  const remaining = target ? R(target.amount - target.paid) : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("PIX");
  if (!db || !target) return null;
  const val = amount ? numParse(amount) : remaining;
  return (
    <Modal open={!!target} onClose={onClose} title={`Receber de ${target.customerName}`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          update((d) => settleReceivable(d, target.id, val, method));
          toast.push("success", "Pagamento registrado e caixa atualizado.");
          onClose();
        }}><CheckCircle2 size={15} /> Confirmar recebimento</Button></>}>
      <div className="rounded-xl bg-paper p-4 text-[13px]">
        <div className="flex justify-between"><span className="text-ink-soft">Título</span><span className="font-semibold">{target.description}</span></div>
        <div className="flex justify-between"><span className="text-ink-soft">Vencimento</span><span className={cx(receivableStatus(target) === "vencido" && "font-bold text-danger")}>{fmtDate(target.dueDate)}</span></div>
        <div className="flex justify-between"><span className="text-ink-soft">Valor total</span><span className="tnum">{brl(target.amount)}</span></div>
        <div className="flex justify-between"><span className="text-ink-soft">Já recebido</span><span className="tnum text-pine-600">{brl(target.paid)}</span></div>
        <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-bold"><span>Restante</span><span className="tnum text-danger">{brl(remaining)}</span></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Valor a receber" hint="Deixe vazio para receber o restante">
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(remaining).replace(".", ",")} />
        </Field>
        <Field label="Forma de pagamento">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {db.settings.methods.filter((m) => m !== "Fiado").map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export function ReceivablesPage() {
  const { db, query } = useApp();
  const [flt, setFlt] = useState<"todos" | "pendente" | "vencido" | "pago">("todos");
  const [receiving, setReceiving] = useState<Receivable | null>(null);

  const list = useMemo(() => {
    if (!db) return [];
    return db.receivables
      .filter((r) => r.status !== "cancelado")
      .filter((r) => flt === "todos" || receivableStatus(r) === flt)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [db, flt]);

  if (!db) return null;
  const open = db.receivables.filter((r) => r.status === "pendente");
  const totalOpen = R(open.reduce((s, r) => s + r.amount - r.paid, 0));
  const overdue = R(open.filter((r) => r.dueDate < todayISO()).reduce((s, r) => s + r.amount - r.paid, 0));
  const receivedMonth = R(db.cashMoves.filter((m) => m.dir === "in" && m.refType === "recebimento" && m.date.slice(0, 7) === todayISO().slice(0, 7)).reduce((s, m) => s + m.amount, 0));

  return (
    <div className="animate-fade-up">
      <PageHead title="Contas a receber" desc="Fiado, parcelas e cobranças — receba sem esquecer ninguém." />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Total em aberto</p><p className="tnum mt-1 font-display text-[22px] font-bold">{brl(totalOpen)}</p><p className="text-[12px] text-ink-faint">{open.length} título(s)</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-danger">Vencido</p><p className="tnum mt-1 font-display text-[22px] font-bold text-danger">{brl(overdue)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Recebido no mês</p><p className="tnum mt-1 font-display text-[22px] font-bold text-pine-600">{brl(receivedMonth)}</p></Card>
      </div>

      <div className="mb-4">
        <Seg options={[{ id: "todos" as const, label: "Todos" }, { id: "pendente" as const, label: "Pendentes" }, { id: "vencido" as const, label: "Vencidos" }, { id: "pago" as const, label: "Pagos" }]} value={flt} onChange={setFlt} />
      </div>

      {list.length === 0 ? (
        <Empty icon={<ArrowDownCircle size={26} />} title="Nada a receber por aqui."
          desc="Vendas fiado ou parceladas aparecem automaticamente como títulos a receber." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Cliente</Th><Th>Descrição</Th><Th>Vencimento</Th><Th right>Valor</Th><Th right className="hidden sm:table-cell">Recebido</Th><Th>Status</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((r) => {
              const st = receivableStatus(r);
              return (
                <tr key={r.id} className="transition-colors hover:bg-pine-50/50">
                  <Td className="font-semibold">{r.customerName}</Td>
                  <Td className="text-[12.5px] text-ink-soft">{r.description}</Td>
                  <Td className={cx(st === "vencido" && "font-bold text-danger")}>{fmtDate(r.dueDate)}</Td>
                  <Td right><Money value={r.amount} className="font-bold" /></Td>
                  <Td right className="hidden text-pine-600 sm:table-cell">{r.paid > 0 ? brl(r.paid) : "—"}</Td>
                  <Td>{st === "pago" ? <Badge tone="green">Pago</Badge> : st === "vencido" ? <Badge tone="red">Vencido</Badge> : <Badge tone="amber">Pendente</Badge>}</Td>
                  <Td right>
                    {st !== "pago" && <Button size="sm" variant="soft" onClick={() => { setReceiving(r); }}>Marcar como pago</Button>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      <PayReceiveModal target={receiving} onClose={() => setReceiving(null)} />
    </div>
  );
}

/* ---------------- Contas a pagar ---------------- */

export function PayablesPage() {
  const { db, update } = useApp();
  const toast = useToast();
  const [flt, setFlt] = useState<"todos" | "pendente" | "vencido" | "pago">("todos");
  const [paying, setPaying] = useState<{ kind: "payable" | "expense"; id: string; label: string; amount: number; method: string } | null>(null);
  const [payMethod, setPayMethod] = useState("PIX");
  const [del, setDel] = useState<{ id: string; label: string; kind: "payable" | "expense" } | null>(null);

  const list = useMemo(() => {
    if (!db) return [];
    const today = todayISO();
    const rows = [
      ...db.payables.map((p) => ({ kind: "payable" as const, id: p.id, who: p.supplierName, desc: p.description, due: p.dueDate, amount: p.amount, st: p.status === "pago" ? "pago" : p.dueDate < today ? "vencido" : "pendente", origin: p.origin, method: "" })),
      ...db.expenses.map((e) => ({ kind: "expense" as const, id: e.id, who: "Despesa", desc: e.description, due: e.dueDate, amount: e.amount, st: e.status === "pago" ? "pago" : e.dueDate < today ? "vencido" : "pendente", origin: "despesa" as const, method: e.method })),
    ];
    return rows
      .filter((r) => flt === "todos" || r.st === flt)
      .sort((a, b) => a.due.localeCompare(b.due));
  }, [db, flt]);

  if (!db) return null;
  const toPay = R(list.filter((r) => r.st !== "pago").reduce((s, r) => s + r.amount, 0));
  const overdue = R(list.filter((r) => r.st === "vencido").reduce((s, r) => s + r.amount, 0));

  return (
    <div className="animate-fade-up">
      <PageHead title="Contas a pagar" desc="Compras a prazo e despesas pendentes em um só lugar." />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Total a pagar</p><p className="tnum mt-1 font-display text-[22px] font-bold">{brl(toPay)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-danger">Vencidas</p><p className="tnum mt-1 font-display text-[22px] font-bold text-danger">{brl(overdue)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Vencendo em 7 dias</p>
          <p className="tnum mt-1 font-display text-[22px] font-bold text-warn">
            {brl(R(list.filter((r) => r.st !== "pago" && dueBadge(r.due) !== "vencido" && dueBadge(r.due) !== "futuro").reduce((s, r) => s + r.amount, 0)))}
          </p>
        </Card>
      </div>

      <div className="mb-4">
        <Seg options={[{ id: "todos" as const, label: "Todas" }, { id: "pendente" as const, label: "Pendentes" }, { id: "vencido" as const, label: "Vencidas" }, { id: "pago" as const, label: "Pagas" }]} value={flt} onChange={setFlt} />
      </div>

      {list.length === 0 ? (
        <Empty icon={<ArrowUpCircle size={26} />} title="Nenhuma conta a pagar." desc="Compras a prazo e despesas pendentes aparecem aqui automaticamente." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Origem</Th><Th>Descrição</Th><Th>Vencimento</Th><Th right>Valor</Th><Th>Status</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="transition-colors hover:bg-pine-50/50">
                <Td className="font-semibold">{r.who}</Td>
                <Td className="text-[12.5px] text-ink-soft">{r.desc} {r.origin === "compra" && <Badge tone="blue" className="ml-1">compra</Badge>}</Td>
                <Td className={cx(r.st === "vencido" && "font-bold text-danger")}>{fmtDate(r.due)}</Td>
                <Td right><Money value={r.amount} className="font-bold" /></Td>
                <Td>{r.st === "pago" ? <Badge tone="green">Pago</Badge> : r.st === "vencido" ? <Badge tone="red">Vencido</Badge> : <Badge tone="amber">Pendente</Badge>}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {r.st !== "pago" && (
                      <Button size="sm" variant="soft" onClick={() => { setPaying({ kind: r.kind, id: r.id, label: r.desc, amount: r.amount, method: r.method }); setPayMethod(r.method || "PIX"); }}>
                        Registrar pagamento
                      </Button>
                    )}
                    <IconBtn label="Excluir" className="text-danger hover:bg-danger-soft" onClick={() => setDel({ id: r.id, label: r.desc, kind: r.kind })}><Trash2 size={14} /></IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pagamento" size="sm"
        footer={<><Button variant="ghost" onClick={() => setPaying(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!paying) return;
            update((d) => paying.kind === "payable" ? settlePayable(d, paying.id, payMethod) : settleExpense(d, paying.id, payMethod));
            toast.push("success", "Pagamento registrado — caixa atualizado.");
            setPaying(null);
          }}>Confirmar</Button></>}>
        <p className="text-[13.5px] text-ink-soft">Pagar <strong className="text-ink">{paying?.label}</strong> de <Money value={paying?.amount ?? 0} className="font-bold" />?</p>
        <div className="mt-4">
          <Field label="Forma de pagamento">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {(db?.settings.methods ?? []).filter((m) => m !== "Fiado").map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title="Excluir conta?"
        msg={`“${del?.label}” será removida. Se for uma despesa, ela sai também do módulo de despesas.`}
        onYes={() => {
          if (!del) return;
          update((d) => {
            if (del.kind === "payable") d.payables = d.payables.filter((p) => p.id !== del.id);
            else d.expenses = d.expenses.filter((e) => e.id !== del.id);
          });
          toast.push("info", "Conta excluída.");
        }} />
    </div>
  );
}

/* ---------------- Fiado / Dívidas ---------------- */

export function DebtsPage() {
  const { db, update } = useApp();
  const toast = useToast();
  const [flt, setFlt] = useState<"abertos" | "vencidos" | "pagos">("abertos");
  const [receiving, setReceiving] = useState<Receivable | null>(null);

  const fiados = useMemo(() => {
    if (!db) return [];
    return db.receivables
      .filter((r) => r.origin === "venda" && r.status !== "cancelado")
      .filter((r) => {
        const st = receivableStatus(r);
        if (flt === "abertos") return st === "pendente" || st === "vencido";
        if (flt === "vencidos") return st === "vencido";
        return st === "pago";
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [db, flt]);

  if (!db) return null;
  const openTotal = R(db.receivables.filter((r) => r.origin === "venda" && r.status === "pendente").reduce((s, r) => s + r.amount - r.paid, 0));

  const charge = (r: Receivable) => {
    const biz = db.business?.name ?? "nossa loja";
    const msg = [
      `Olá, ${r.customerName.split(" ")[0]}! Tudo bem? 🙂`,
      `Aqui é do(a) ${biz}. Passando para lembrar do fiado de *${brl(r.amount - r.paid)}* (${r.description}), com vencimento em ${fmtDate(r.dueDate)}.`,
      `Pode pagar por PIX quando ficar melhor para você. Qualquer coisa é só chamar!`,
    ].join("\n");
    const customer = db.customers.find((c) => c.id === r.customerId);
    window.open(waLink(customer?.phone ?? "", msg), "_blank");
    toast.push("success", "Cobrança amigável gerada no WhatsApp.");
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Fiado e dívidas" desc="O caderninho digital: controle quem deve, quanto e desde quando.">
        <Card className="px-4 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Total em fiado</p><p className="tnum font-display text-[19px] font-bold text-danger">{brl(openTotal)}</p></Card>
      </PageHead>

      <div className="mb-4">
        <Seg options={[{ id: "abertos" as const, label: "Em aberto" }, { id: "vencidos" as const, label: "Vencidos" }, { id: "pagos" as const, label: "Quitados" }]} value={flt} onChange={setFlt} />
      </div>

      {fiados.length === 0 ? (
        <Empty icon={<Coins size={26} />} title={flt === "pagos" ? "Nenhum fiado quitado ainda." : "Nenhum fiado em aberto."}
          desc="Quando você registrar uma venda com pagamento “Fiado”, a dívida aparece aqui para acompanhar." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fiados.map((r) => {
            const st = receivableStatus(r);
            const remaining = R(r.amount - r.paid);
            const pct = r.amount > 0 ? Math.min(100, (r.paid / r.amount) * 100) : 0;
            const customer = db.customers.find((c) => c.id === r.customerId);
            return (
              <div key={r.id} className={cx("animate-fade-up rounded-xl border bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5", st === "vencido" ? "border-danger/30" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 font-display text-[13px] font-bold text-pine-700">{r.customerName.slice(0, 1)}</span>
                    <div>
                      <p className="text-[14px] font-bold leading-tight">{r.customerName}</p>
                      <p className="text-[11.5px] text-ink-faint">{r.description}</p>
                    </div>
                  </div>
                  {st === "pago" ? <Badge tone="green">Quitado</Badge> : st === "vencido" ? <Badge tone="red">Vencido</Badge> : <Badge tone="amber">Em aberto</Badge>}
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-paper px-1 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Original</p><p className="tnum text-[13px] font-bold">{brl(r.amount)}</p></div>
                  <div className="rounded-lg bg-paper px-1 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Pago</p><p className="tnum text-[13px] font-bold text-pine-600">{brl(r.paid)}</p></div>
                  <div className="rounded-lg bg-paper px-1 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Restante</p><p className="tnum text-[13px] font-bold text-danger">{brl(remaining)}</p></div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-ink-faint"><span>Vencimento: <strong className={cx(st === "vencido" && "text-danger")}>{fmtDate(r.dueDate)}</strong></span><span className="tnum">{pct.toFixed(0)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper"><div className={cx("h-full rounded-full transition-all duration-500", st === "pago" ? "bg-pine-500" : "bg-leaf-600")} style={{ width: `${pct}%` }} /></div>
                </div>

                {st !== "pago" && (
                  <div className="mt-3.5 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setReceiving(r)}><CreditCard size={14} /> Registrar pagamento</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => charge(r)}><MessageCircle size={14} /> Cobrar no WhatsApp</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <PayReceiveModal target={receiving} onClose={() => setReceiving(null)} />
    </div>
  );
}
