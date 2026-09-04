/* ============================================================
 * Fluxo — Módulo de Despesas
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useApp } from "../store";
import type { Expense } from "../lib/types";
import { EXPENSE_CATS } from "../lib/types";
import { brl, cx, fmtDate, numParse, todayISO, presetRange, RANGE_PRESETS } from "../lib/utils";
import { settleExpense, R } from "../lib/services";
import {
  Button, Badge, Card, Confirm, Empty, Field, Input, Modal, Seg, Select,
  TableWrap, Th, Td, Textarea, useToast, PageHead, Money, IconBtn,
} from "../components/ui";

function ExpenseForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Expense | null }) {
  const { db, update } = useApp();
  const toast = useToast();
  const [f, setF] = useState({
    description: "", category: EXPENSE_CATS[0], amount: "", date: todayISO(),
    dueDate: todayISO(), method: "PIX", status: "pendente" as "pago" | "pendente", notes: "",
  });
  useEffect(() => {
    if (open) setF(editing
      ? { description: editing.description, category: editing.category, amount: String(editing.amount).replace(".", ","), date: editing.date, dueDate: editing.dueDate, method: editing.method, status: editing.status, notes: editing.notes }
      : { description: "", category: EXPENSE_CATS[0], amount: "", date: todayISO(), dueDate: todayISO(), method: "PIX", status: "pendente", notes: "" });
  }, [open, editing]);

  if (!db) return null;

  const save = () => {
    if (!f.description.trim()) return toast.push("danger", "Descreva a despesa.");
    const amount = numParse(f.amount);
    if (amount <= 0) return toast.push("danger", "Informe um valor válido.");
    update((d) => {
      if (editing) {
        const i = d.expenses.findIndex((e) => e.id === editing.id);
        if (i >= 0) d.expenses[i] = { ...d.expenses[i], ...f, amount };
      } else {
        d.expenses.unshift({ ...f, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), amount, createdAt: new Date().toISOString() });
        if (f.status === "pago") {
          const s = d.sessions.find((x) => !x.closedAt);
          d.cashMoves.unshift({
            id: String(Date.now() + 1), sessionId: s?.id ?? "avulso", dir: "out",
            description: `Despesa: ${f.description}`, amount: R(amount), method: f.method,
            date: f.date, refType: "despesa", createdAt: new Date().toISOString(),
          });
        }
      }
    });
    toast.push("success", editing ? "Despesa atualizada." : "Despesa registrada.");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar despesa" : "Nova despesa"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar" : "Registrar despesa"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <Input autoFocus value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ex.: Conta de energia" />
        </Field>
        <Field label="Categoria">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Valor (R$)">
          <Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0,00" />
        </Field>
        <Field label="Data"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Vencimento"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <Field label="Forma de pagamento">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            {db.settings.methods.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "pago" | "pendente" })}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </Select>
        </Field>
        <Field label="Observação" className="sm:col-span-2">
          <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-[64px]" />
        </Field>
      </div>
    </Modal>
  );
}

export default function ExpensesPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [del, setDel] = useState<Expense | null>(null);
  const [paying, setPaying] = useState<Expense | null>(null);
  const [payMethod, setPayMethod] = useState("PIX");
  const [flt, setFlt] = useState({ q: "", cat: "", status: "" });
  const [preset, setPreset] = useState("mes");

  useEffect(() => {
    if (query.get("nova")) setShow(true);
    const q = query.get("q");
    if (q) setFlt((f) => ({ ...f, q }));
  }, [query]);

  const range = useMemo(() => presetRange(preset), [preset]);

  const list = useMemo(() => {
    if (!db) return [];
    const today = todayISO();
    return db.expenses
      .filter((e) => {
        if (flt.q && !e.description.toLowerCase().includes(flt.q.toLowerCase())) return false;
        if (flt.cat && e.category !== flt.cat) return false;
        const st = e.status === "pendente" && e.dueDate < today ? "vencido" : e.status;
        if (flt.status && st !== flt.status) return false;
        if (e.date < range.start || e.date > range.end) return false;
        return true;
      })
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [db, flt, range]);

  if (!db) return null;
  const today = todayISO();
  const total = R(list.reduce((s, e) => s + e.amount, 0));
  const pendente = R(list.filter((e) => e.status === "pendente").reduce((s, e) => s + e.amount, 0));

  const statusOf = (e: Expense) => e.status === "pago" ? "pago" : e.dueDate < today ? "vencido" : e.dueDate === today ? "hoje" : "pendente";

  return (
    <div className="animate-fade-up">
      <PageHead title="Despesas" desc="Tudo o que sai do caixa — aluguel, energia, salários e mais.">
        <Button size="lg" onClick={() => { setEditing(null); setShow(true); }}><Plus size={17} /> Nova despesa</Button>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Total no período</p><p className="tnum mt-1 font-display text-[20px] font-bold">{brl(total)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Pagas</p><p className="tnum mt-1 font-display text-[20px] font-bold text-pine-600">{brl(total - pendente)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Pendentes / vencidas</p><p className="tnum mt-1 font-display text-[20px] font-bold text-danger">{brl(pendente)}</p></Card>
        <div className="flex items-center"><Seg options={RANGE_PRESETS.slice(0, 4).map((p) => ({ id: p.id, label: p.label }))} value={preset as never} onChange={(v) => setPreset(v as string)} /></div>
      </div>

      <Card className="mb-4">
        <div className="grid gap-2.5 p-3.5 sm:grid-cols-3">
          <Input placeholder="Buscar despesa…" value={flt.q} onChange={(e) => setFlt({ ...flt, q: e.target.value })} className="h-9.5 text-[13px]" aria-label="Buscar despesas" />
          <Select value={flt.cat} onChange={(e) => setFlt({ ...flt, cat: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todas as categorias</option>
            {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select value={flt.status} onChange={(e) => setFlt({ ...flt, status: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
          </Select>
        </div>
      </Card>

      {list.length === 0 ? (
        <Empty icon={<Receipt size={26} />} title="Nenhuma despesa no período."
          desc="Registre os custos fixos e variáveis para enxergar o lucro real do negócio."
          action={<Button onClick={() => setShow(true)}><Plus size={15} /> Nova despesa</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Descrição</Th><Th>Categoria</Th><Th>Vencimento</Th><Th className="hidden md:table-cell">Pagamento</Th><Th>Status</Th><Th right>Valor</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((e) => {
              const st = statusOf(e);
              return (
                <tr key={e.id} className="transition-colors hover:bg-pine-50/50">
                  <Td>
                    <span className="font-semibold">{e.description}</span>
                    {e.notes && <span className="block text-[11px] text-ink-faint">{e.notes}</span>}
                  </Td>
                  <Td><Badge tone="blue">{e.category}</Badge></Td>
                  <Td className={cx(st === "vencido" && "font-bold text-danger")}>{fmtDate(e.dueDate)}</Td>
                  <Td className="hidden text-[12.5px] text-ink-soft md:table-cell">{e.method}</Td>
                  <Td>
                    {st === "pago" ? <Badge tone="green">Pago</Badge>
                      : st === "vencido" ? <Badge tone="red">Vencido</Badge>
                      : st === "hoje" ? <Badge tone="amber">Vence hoje</Badge>
                      : <Badge tone="amber">Pendente</Badge>}
                  </Td>
                  <Td right><Money value={e.amount} className="font-bold" /></Td>
                  <Td right>
                    <div className="flex justify-end gap-0.5">
                      {e.status === "pendente" && (
                        <IconBtn label="Marcar como paga" className="text-pine-600" onClick={() => { setPaying(e); setPayMethod(e.method); }}><CheckCircle2 size={16} /></IconBtn>
                      )}
                      <IconBtn label="Editar" onClick={() => { setEditing(e); setShow(true); }}><Pencil size={15} /></IconBtn>
                      <IconBtn label="Excluir" className="text-danger hover:bg-danger-soft" onClick={() => setDel(e)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <ExpenseForm open={show} editing={editing} onClose={() => { setShow(false); if (query.get("nova")) navigate("/despesas"); }} />

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pagamento" size="sm"
        footer={<><Button variant="ghost" onClick={() => setPaying(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!paying) return;
            update((d) => settleExpense(d, paying.id, payMethod));
            toast.push("success", `“${paying.description}” marcada como paga — caixa atualizado.`);
            setPaying(null);
          }}>Confirmar pagamento</Button></>}>
        <p className="text-[13.5px] text-ink-soft">Pagar <strong className="text-ink">{paying?.description}</strong> de <Money value={paying?.amount ?? 0} className="font-bold" />?</p>
        <div className="mt-4">
          <Field label="Forma de pagamento">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {db.settings.methods.filter((m) => m !== "Fiado").map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
        <p className="mt-3 rounded-lg bg-pine-50 px-3 py-2 text-[12px] text-pine-700">A saída será registrada no caixa aberto.</p>
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title="Excluir despesa?"
        msg={`“${del?.description}” será removida permanentemente.`}
        onYes={() => { if (del) { update((d) => { d.expenses = d.expenses.filter((e) => e.id !== del.id); }); toast.push("info", "Despesa excluída."); } }} />
    </div>
  );
}
