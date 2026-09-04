/* ============================================================
 * Fluxo — Clientes, Fornecedores e Funcionários
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, MessageCircle, ShoppingCart, Phone, Mail, MapPin, FileText, Truck, Check, X as XIcon } from "lucide-react";
import { useApp } from "../store";
import type { Customer, Supplier, Employee } from "../lib/types";
import { PERMISSIONS, ROLE_LABEL } from "../lib/types";
import type { Role } from "../lib/types";
import { brl, cx, fmtDate, uid, waLink } from "../lib/utils";
import { customerStats, receivableStatus, R } from "../lib/services";
import {
  Button, Badge, Confirm, Drawer, Empty, Field, Input, TableWrap, Th, Td,
  Textarea, useToast, PageHead, Modal, IconBtn, Money, Card,
} from "../components/ui";

/* ---------------- Formulário compartilhado ---------------- */

function PersonForm({ open, onClose, editing, title }: {
  open: boolean; onClose: () => void; editing: Customer | null; title: string;
}) {
  const { update } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ name: "", doc: "", phone: "", email: "", address: "", notes: "" });
  useEffect(() => {
    if (open) setF(editing ? { name: editing.name, doc: editing.doc, phone: editing.phone, email: editing.email, address: editing.address, notes: editing.notes } : { name: "", doc: "", phone: "", email: "", address: "", notes: "" });
  }, [open, editing]);

  const save = () => {
    if (!f.name.trim()) return toast.push("danger", "Informe o nome.");
    update((d) => {
      if (editing) {
        const key = title.includes("Fornecedor") ? "suppliers" : "customers";
        const list = d[key] as Customer[];
        const i = list.findIndex((c) => c.id === editing.id);
        if (i >= 0) list[i] = { ...list[i], ...f };
      } else {
        const key = title.includes("Fornecedor") ? "suppliers" : "customers";
        (d[key] as Customer[]).unshift({ ...f, id: uid(), createdAt: new Date().toISOString() });
      }
    });
    toast.push("success", editing ? "Dados atualizados." : `${title} cadastrado(a).`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar — ${editing.name}` : `Novo ${title.toLowerCase()}`} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>{editing ? "Salvar" : "Cadastrar"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={title.includes("Fornecedor") ? "Ex.: Distribuidora Beta" : "Ex.: João Silva"} />
        </Field>
        <Field label="CPF / CNPJ"><Input value={f.doc} onChange={(e) => setF({ ...f, doc: e.target.value })} placeholder="000.000.000-00" /></Field>
        <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(11) 99999-0000" /></Field>
        <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="contato@email.com" /></Field>
        <Field label="Endereço" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Rua, número — cidade/UF" /></Field>
        <Field label="Observações" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Preferências, combinados…" /></Field>
      </div>
    </Modal>
  );
}

/* ---------------- Clientes ---------------- */

export function CustomersPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [del, setDel] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (query.get("novo")) { setEditing(null); setShowForm(true); }
    const qq = query.get("q");
    if (qq) setQ(qq);
  }, [query]);

  const list = useMemo(() => {
    if (!db) return [];
    const t = q.trim().toLowerCase();
    return db.customers.filter((c) => !t || `${c.name} ${c.doc} ${c.phone}`.toLowerCase().includes(t));
  }, [db, q]);

  if (!db) return null;

  const sendCharge = (c: Customer) => {
    const open = db.receivables.filter((r) => r.customerId === c.id && (receivableStatus(r) === "pendente" || receivableStatus(r) === "vencido"));
    const total = R(open.reduce((s, r) => s + r.amount - r.paid, 0));
    const biz = db.business?.name ?? "nosso negócio";
    const lines = [
      `Olá, ${c.name.split(" ")[0]}! Tudo bem? 🙂`,
      `Aqui é do(a) ${biz}. Passando para lembrar do valor em aberto de *${brl(total)}*.`,
      ...open.slice(0, 3).map((r) => `• ${r.description} — ${brl(r.amount - r.paid)} (venc. ${fmtDate(r.dueDate)})`),
      `Qualquer coisa é só chamar por aqui. Obrigado!`,
    ];
    window.open(waLink(c.phone, lines.join("\n")), "_blank");
    toast.push("success", "Mensagem de cobrança gerada no WhatsApp.");
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Clientes" desc={`${db.customers.length} cliente(s) · histórico de compras e valores em aberto.`}>
        <Button size="lg" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Novo cliente</Button>
      </PageHead>

      <div className="mb-4">
        <Input placeholder="Buscar por nome, documento ou telefone…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 max-w-md text-[13.5px]" aria-label="Buscar clientes" />
      </div>

      {db.customers.length === 0 ? (
        <Empty title="Você ainda não possui clientes." desc="Cadastre quem compra de você — inclusive quem compra fiado."
          action={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Cadastrar cliente</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Cliente</Th><Th className="hidden lg:table-cell">Contato</Th><Th right>Compras</Th><Th right>Total comprado</Th><Th right className="hidden sm:table-cell">Última</Th><Th right>Em aberto</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((c) => {
              const st = customerStats(db, c.id);
              return (
                <tr key={c.id} className="transition-colors hover:bg-pine-50/50">
                  <Td>
                    <button className="flex items-center gap-2.5 text-left" onClick={() => setDetail(c)}>
                      <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-pine-100 font-display text-[13px] font-bold text-pine-700">{c.name.slice(0, 1)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:text-pine-700">{c.name}</span>
                        <span className="text-[11px] text-ink-faint">{c.doc || "sem documento"}</span>
                      </span>
                    </button>
                  </Td>
                  <Td className="hidden text-[12.5px] text-ink-soft lg:table-cell">{c.phone}</Td>
                  <Td right className="tnum">{st.count}</Td>
                  <Td right><Money value={st.total} className="font-bold" /></Td>
                  <Td right className="hidden text-[12.5px] text-ink-soft sm:table-cell">{st.last ? fmtDate(st.last) : "—"}</Td>
                  <Td right>{st.open > 0 ? <Money value={st.open} className="font-bold text-danger" /> : <Badge tone="green">em dia</Badge>}</Td>
                  <Td right>
                    <div className="flex justify-end gap-0.5">
                      <IconBtn label="Nova venda para este cliente" className="text-pine-600" onClick={() => navigate(`/vendas?nova=1&cliente=${c.id}`)}><ShoppingCart size={15} /></IconBtn>
                      <IconBtn label="Enviar cobrança pelo WhatsApp" className="text-[#1a8a5c]" onClick={() => sendCharge(c)}><MessageCircle size={15} /></IconBtn>
                      <IconBtn label="Editar" onClick={() => { setEditing(c); setShowForm(true); }}><Pencil size={15} /></IconBtn>
                      <IconBtn label="Excluir" className="text-danger hover:bg-danger-soft" onClick={() => setDel(c)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {detail && (() => {
        const st = customerStats(db, detail.id);
        const sales = db.sales.filter((s) => s.customerId === detail.id && s.status !== "cancelada");
        const open = db.receivables.filter((r) => r.customerId === detail.id && r.status === "pendente");
        return (
          <Drawer open onClose={() => setDetail(null)} title={detail.name}>
            <div className="grid grid-cols-2 gap-2.5">
              {[{ l: "Total comprado", v: brl(st.total) }, { l: "Compras", v: String(st.count) }, { l: "Última compra", v: st.last ? fmtDate(st.last) : "—" }, { l: "Em aberto", v: brl(st.open) }].map((x) => (
                <div key={x.l} className="rounded-lg border border-line bg-paper p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{x.l}</p>
                  <p className="tnum mt-1 font-display text-[16px] font-bold">{x.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 rounded-lg border border-line bg-paper p-3 text-[12.5px] text-ink-soft">
              {detail.phone && <p className="flex items-center gap-2"><Phone size={13} /> {detail.phone}</p>}
              {detail.email && <p className="flex items-center gap-2"><Mail size={13} /> {detail.email}</p>}
              {detail.address && <p className="flex items-center gap-2"><MapPin size={13} /> {detail.address}</p>}
              {detail.notes && <p className="flex items-start gap-2"><FileText size={13} /> {detail.notes}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => { navigate(`/vendas?nova=1&cliente=${detail.id}`); }}><ShoppingCart size={14} /> Nova venda</Button>
              <Button size="sm" variant="outline" onClick={() => sendCharge(detail)}><MessageCircle size={14} /> Enviar cobrança</Button>
            </div>
            <h4 className="mt-5 mb-2 font-display text-[13px] font-bold">Histórico de compras ({sales.length})</h4>
            {sales.length === 0 ? <p className="rounded-lg bg-paper p-4 text-center text-[12.5px] text-ink-faint">Nenhuma compra registrada.</p> : (
              <ul className="divide-y divide-line/70 rounded-lg border border-line">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                    <span><span className="font-bold text-pine-700">{s.number}</span> · {fmtDate(s.date)} · {s.items.reduce((a, i) => a + i.qty, 0)} un</span>
                    <Money value={s.total} className="font-bold" />
                  </li>
                ))}
              </ul>
            )}
            {open.length > 0 && (
              <>
                <h4 className="mt-5 mb-2 font-display text-[13px] font-bold">Em aberto ({open.length})</h4>
                <ul className="divide-y divide-line/70 rounded-lg border border-warn/30 bg-warn-soft/40">
                  {open.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                      <span>{r.description} · venc. {fmtDate(r.dueDate)}</span>
                      <Money value={r.amount - r.paid} className="font-bold text-danger" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Drawer>
        );
      })()}

      <PersonForm open={showForm} editing={editing} onClose={() => { setShowForm(false); if (query.get("novo")) navigate("/clientes"); }} title="Cliente" />
      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title={`Excluir ${del?.name}?`}
        msg="O cadastro será removido. O histórico de vendas permanece."
        onYes={() => { if (del) { update((d) => { d.customers = d.customers.filter((c) => c.id !== del.id); }); toast.push("info", "Cliente excluído."); } }} />
    </div>
  );
}

/* ---------------- Fornecedores ---------------- */

export function SuppliersPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [del, setDel] = useState<Supplier | null>(null);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (query.get("novo")) setShowForm(true);
    const qq = query.get("q");
    if (qq) setQ(qq);
  }, [query]);

  const list = useMemo(() => {
    if (!db) return [];
    const t = q.trim().toLowerCase();
    return db.suppliers.filter((s) => !t || `${s.name} ${s.doc}`.toLowerCase().includes(t));
  }, [db, q]);

  if (!db) return null;

  return (
    <div className="animate-fade-up">
      <PageHead title="Fornecedores" desc="Quem abastece seu estoque — com histórico de compras.">
        <Button size="lg" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Novo fornecedor</Button>
      </PageHead>

      <div className="mb-4">
        <Input placeholder="Buscar fornecedor…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 max-w-md text-[13.5px]" aria-label="Buscar fornecedores" />
      </div>

      {db.suppliers.length === 0 ? (
        <Empty title="Nenhum fornecedor cadastrado." desc="Cadastre quem fornece seus produtos para registrar compras."
          action={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Cadastrar fornecedor</Button>} />
      ) : (
        <TableWrap>
          <thead><tr><Th>Fornecedor</Th><Th className="hidden md:table-cell">Contato</Th><Th right>Compras</Th><Th right>Total</Th><Th right>Em aberto</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {list.map((s) => {
              const buys = db.purchases.filter((p) => p.supplierId === s.id && p.status !== "cancelada");
              const open = R(db.payables.filter((p) => p.supplierId === s.id && p.status === "pendente").reduce((a, p) => a + p.amount, 0));
              return (
                <tr key={s.id} className="transition-colors hover:bg-pine-50/50">
                  <Td>
                    <button className="flex items-center gap-2.5 text-left" onClick={() => setDetail(s)}>
                      <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-info-soft font-display text-[13px] font-bold text-info">{s.name.slice(0, 1)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:text-pine-700">{s.name}</span>
                        <span className="text-[11px] text-ink-faint">{s.doc || "sem documento"}</span>
                      </span>
                    </button>
                  </Td>
                  <Td className="hidden text-[12.5px] text-ink-soft md:table-cell">{s.phone || s.email}</Td>
                  <Td right className="tnum">{buys.length}</Td>
                  <Td right><Money value={R(buys.reduce((a, p) => a + p.total, 0))} className="font-bold" /></Td>
                  <Td right>{open > 0 ? <Money value={open} className="font-bold text-danger" /> : <Badge tone="green">em dia</Badge>}</Td>
                  <Td right>
                    <div className="flex justify-end gap-0.5">
                      <IconBtn label="Nova compra" className="text-pine-600" onClick={() => navigate(`/compras?nova=1&fornecedor=${s.id}`)}><Truck size={15} /></IconBtn>
                      <IconBtn label="Editar" onClick={() => { setEditing(s); setShowForm(true); }}><Pencil size={15} /></IconBtn>
                      <IconBtn label="Excluir" className="text-danger hover:bg-danger-soft" onClick={() => setDel(s)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {detail && (() => {
        const buys = db.purchases.filter((p) => p.supplierId === detail.id && p.status !== "cancelada");
        return (
          <Drawer open onClose={() => setDetail(null)} title={detail.name}>
            <div className="space-y-1.5 rounded-lg border border-line bg-paper p-3 text-[12.5px] text-ink-soft">
              {detail.phone && <p className="flex items-center gap-2"><Phone size={13} /> {detail.phone}</p>}
              {detail.email && <p className="flex items-center gap-2"><Mail size={13} /> {detail.email}</p>}
              {detail.address && <p className="flex items-center gap-2"><MapPin size={13} /> {detail.address}</p>}
              {detail.notes && <p className="flex items-start gap-2"><FileText size={13} /> {detail.notes}</p>}
            </div>
            <h4 className="mt-5 mb-2 font-display text-[13px] font-bold">Histórico de compras ({buys.length})</h4>
            {buys.length === 0 ? <p className="rounded-lg bg-paper p-4 text-center text-[12.5px] text-ink-faint">Nenhuma compra registrada.</p> : (
              <ul className="divide-y divide-line/70 rounded-lg border border-line">
                {buys.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
                    <span><span className="font-bold text-pine-700">{p.number}</span> · {fmtDate(p.date)} · {p.items.length} item(ns)</span>
                    <Money value={p.total} className="font-bold" />
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" className="mt-4" onClick={() => navigate(`/compras?nova=1&fornecedor=${detail.id}`)}><Truck size={14} /> Nova compra</Button>
          </Drawer>
        );
      })()}

      <PersonForm open={showForm} editing={editing} onClose={() => { setShowForm(false); if (query.get("novo")) navigate("/fornecedores"); }} title="Fornecedor" />
      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title={`Excluir ${del?.name}?`}
        msg="O cadastro será removido. O histórico de compras permanece."
        onYes={() => { if (del) { update((d) => { d.suppliers = d.suppliers.filter((c) => c.id !== del.id); }); toast.push("info", "Fornecedor excluído."); } }} />
    </div>
  );
}

/* ---------------- Funcionários ---------------- */

const ROLE_IDS: Role[] = ["admin", "vendedor", "estoquista", "financeiro"];

export function EmployeesPage() {
  const { db, update, user } = useApp();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [del, setDel] = useState<Employee | null>(null);
  const [f, setF] = useState({ name: "", phone: "", email: "", role: "vendedor" as Role, status: "ativo" as "ativo" | "inativo" });

  useEffect(() => {
    if (showForm) setF(editing ? { name: editing.name, phone: editing.phone, email: editing.email, role: editing.role, status: editing.status } : { name: "", phone: "", email: "", role: "vendedor", status: "ativo" });
  }, [showForm, editing]);

  if (!db) return null;

  const save = () => {
    if (!f.name.trim()) return toast.push("danger", "Informe o nome.");
    update((d) => {
      if (editing) {
        const i = d.employees.findIndex((e) => e.id === editing.id);
        if (i >= 0) d.employees[i] = { ...d.employees[i], ...f };
      } else {
        d.employees.unshift({ ...f, id: uid(), createdAt: new Date().toISOString() });
      }
    });
    toast.push("success", editing ? "Funcionário atualizado." : "Funcionário cadastrado.");
    setShowForm(false);
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Funcionários" desc="Equipe do negócio e permissões por função.">
        <Button size="lg" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Novo funcionário</Button>
      </PageHead>

      {db.employees.length === 0 ? (
        <Empty title="Nenhum funcionário cadastrado." action={<Button onClick={() => setShowForm(true)}><Plus size={15} /> Cadastrar funcionário</Button>} />
      ) : (
        <TableWrap className="mb-6">
          <thead><tr><Th>Funcionário</Th><Th className="hidden md:table-cell">Telefone</Th><Th>Função</Th><Th>Status</Th><Th right>Ações</Th></tr></thead>
          <tbody>
            {db.employees.map((e) => (
              <tr key={e.id} className={cx("transition-colors hover:bg-pine-50/50", e.status === "inativo" && "opacity-55")}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-pine-900 font-display text-[13px] font-bold text-leaf-300">{e.name.slice(0, 1)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.name} {user && e.email === user.email && <Badge tone="lime" className="ml-1">você</Badge>}</span>
                      <span className="text-[11px] text-ink-faint">{e.email}</span>
                    </span>
                  </span>
                </Td>
                <Td className="hidden text-[12.5px] text-ink-soft md:table-cell">{e.phone || "—"}</Td>
                <Td><Badge tone={e.role === "admin" ? "pine" : "blue"}>{ROLE_LABEL[e.role]}</Badge></Td>
                <Td>{e.status === "ativo" ? <Badge tone="green">Ativo</Badge> : <Badge tone="gray">Inativo</Badge>}</Td>
                <Td right>
                  <div className="flex justify-end gap-0.5">
                    <IconBtn label="Editar" onClick={() => { setEditing(e); setShowForm(true); }}><Pencil size={15} /></IconBtn>
                    <IconBtn label="Excluir" className="text-danger hover:bg-danger-soft" onClick={() => setDel(e)}><Trash2 size={15} /></IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <Card title="Permissões por função">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Módulo</Th>
                {ROLE_IDS.map((r) => <Th key={r} className="text-center">{ROLE_LABEL[r]}</Th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMISSIONS).map(([key, p]) => (
                <tr key={key}>
                  <Td className="font-semibold">{p.label}</Td>
                  {ROLE_IDS.map((r) => (
                    <Td key={r} className="text-center">
                      {p.roles.includes(r)
                        ? <Check size={15} className="inline text-pine-600" aria-label="Permitido" />
                        : <XIcon size={15} className="inline text-line-strong" aria-label="Negado" />}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
          A arquitetura já separa autenticação da interface — pronta para login real por funcionário quando houver backend.
        </p>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Editar — ${editing.name}` : "Novo funcionário"}
        footer={<><Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Função">
            <select className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px]" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {ROLE_IDS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px]" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "ativo" | "inativo" })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
        </div>
      </Modal>

      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title={`Excluir ${del?.name}?`}
        msg="O cadastro do funcionário será removido."
        onYes={() => { if (del) { update((d) => { d.employees = d.employees.filter((c) => c.id !== del.id); }); toast.push("info", "Funcionário excluído."); } }} />
    </div>
  );
}
