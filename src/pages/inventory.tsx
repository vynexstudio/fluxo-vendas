/* ============================================================
 * Fluxo — Módulo de Estoque e movimentações
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, History, PackageX, Boxes, Settings2, AlertTriangle } from "lucide-react";
import { useApp } from "../store";
import type { MoveType, Product } from "../lib/types";
import { MOVE_TYPES } from "../lib/types";
import { brl, cx, fmtDate, todayISO } from "../lib/utils";
import { moveStock, lowStock, R } from "../lib/services";
import {
  Button, Badge, Card, Empty, Field, Input, Modal, SearchSelect, Seg, Select,
  TableWrap, Th, Td, useToast, PageHead, ProductThumb, Money, Textarea,
} from "../components/ui";

function MoveModal({ open, onClose, presetType }: { open: boolean; onClose: () => void; presetType: MoveType }) {
  const { db, update } = useApp();
  const toast = useToast();
  const [type, setType] = useState<MoveType>(presetType);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) { setType(presetType); setProductId(""); setQty("1"); setNote(""); }
  }, [open, presetType]);

  if (!db) return null;
  const product = db.products.find((p) => p.id === productId);
  const n = Math.abs(Math.round(Number(qty) || 0));

  const labels: Record<MoveType, { title: string; verb: string; hint: string }> = {
    entrada: { title: "Entrada de estoque", verb: "adicionados", hint: "Reposição, devolução de cliente ou acerto." },
    saida: { title: "Saída de estoque", verb: "removidos", hint: "Uso interno, brinde ou consumo." },
    ajuste: { title: "Ajuste de inventário", verb: "definido", hint: "Informe o estoque real contado." },
    compra: { title: "Entrada por compra", verb: "adicionados", hint: "Prefira o módulo Compras para registrar com fornecedor." },
    perda: { title: "Registrar perda", verb: "removidos", hint: "Quebra, validade vencida ou extravio." },
    devolucao: { title: "Devolução", verb: "adicionados", hint: "Mercadoria que volta ao estoque." },
    venda: { title: "Saída por venda", verb: "removidos", hint: "Prefira registrar pelo módulo Vendas." },
  };

  const save = () => {
    if (!product) return toast.push("danger", "Selecione um produto.");
    if (type !== "ajuste" && n <= 0) return toast.push("danger", "Informe uma quantidade válida.");
    update((d) => {
      if (type === "ajuste") {
        const delta = n - product.stock;
        if (delta !== 0) moveStock(d, product.id, "ajuste", delta, note.trim() || `Ajuste de inventário (contado: ${n})`);
      } else {
        const sign: 1 | -1 = ["entrada", "compra", "devolucao"].includes(type) ? 1 : -1;
        moveStock(d, product.id, type, sign * n, note.trim() || labels[type].title);
      }
    });
    toast.push("success", "Movimentação registrada.");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={labels[type].title} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save}>Registrar movimentação</Button></>}>
      <div className="space-y-4">
        <Field label="Tipo de movimentação">
          <Select value={type} onChange={(e) => setType(e.target.value as MoveType)}>
            {MOVE_TYPES.filter((t) => t.id !== "venda").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Produto" hint={product ? `Estoque atual: ${product.stock} ${product.unit}` : labels[type].hint}>
          <SearchSelect
            options={db.products.map((p) => ({ id: p.id, label: p.name, sub: `SKU ${p.sku} · em estoque ${p.stock}`, right: brl(p.cost) }))}
            value={productId} onChange={setProductId} placeholder="Buscar produto…"
          />
        </Field>
        <Field label={type === "ajuste" ? "Quantidade contada (novo estoque)" : "Quantidade"}>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className="w-36" />
        </Field>
        <Field label="Observação (opcional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo, nº da nota, etc." className="min-h-[64px]" />
        </Field>
      </div>
    </Modal>
  );
}

export default function InventoryPage() {
  const { db, query } = useApp();
  const [view, setView] = useState<"estoque" | "historico">("estoque");
  const [move, setMove] = useState<{ open: boolean; type: MoveType }>({ open: false, type: "entrada" });
  const [flt, setFlt] = useState({ q: "", only: "" });

  useEffect(() => {
    const m = query.get("mov");
    if (m === "entrada" || m === "saida") setMove({ open: true, type: m });
  }, [query]);

  const products = useMemo(() => {
    if (!db) return [];
    const t = flt.q.trim().toLowerCase();
    return db.products
      .filter((p) => (!t || `${p.name} ${p.sku}`.toLowerCase().includes(t)) && (flt.only !== "low" || p.stock <= p.minStock))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db, flt]);

  if (!db) return null;
  const low = lowStock(db);
  const totalValue = R(db.products.reduce((s, p) => s + p.stock * p.cost, 0));
  const lastMove = (id: string) => db.moves.find((m) => m.productId === id);

  return (
    <div className="animate-fade-up">
      <PageHead title="Estoque" desc="Controle entradas, saídas, ajustes e perdas em tempo real.">
        <Button variant="outline" onClick={() => setMove({ open: true, type: "saida" })}><ArrowUpFromLine size={15} /> Saída rápida</Button>
        <Button size="lg" onClick={() => setMove({ open: true, type: "entrada" })}><ArrowDownToLine size={16} /> Entrada rápida</Button>
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Produtos", v: String(db.products.length) },
          { l: "Unidades em estoque", v: String(db.products.reduce((s, p) => s + p.stock, 0)) },
          { l: "Valor imobilizado", v: brl(totalValue) },
          { l: "Estoque baixo", v: String(low.length), warn: low.length > 0 },
        ].map((s) => (
          <div key={s.l} className={cx("rounded-xl border p-4 shadow-card", s.warn ? "border-danger/25 bg-danger-soft" : "border-line bg-surface")}>
            <p className={cx("flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider", s.warn ? "text-danger" : "text-ink-soft")}>
              {s.warn && <AlertTriangle size={12} />} {s.l}
            </p>
            <p className={cx("tnum mt-1.5 font-display text-[20px] font-bold", s.warn ? "text-danger" : "text-ink")}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Seg options={[{ id: "estoque" as const, label: "Posição atual" }, { id: "historico" as const, label: "Histórico de movimentações" }]} value={view} onChange={setView} />
        {view === "estoque" && (
          <>
            <Input placeholder="Buscar produto…" value={flt.q} onChange={(e) => setFlt({ ...flt, q: e.target.value })} className="h-9.5 w-56 text-[13px]" aria-label="Buscar no estoque" />
            <Select value={flt.only} onChange={(e) => setFlt({ ...flt, only: e.target.value })} className="h-9.5 w-44 text-[13px]">
              <option value="">Todos os produtos</option>
              <option value="low">Somente estoque baixo</option>
            </Select>
          </>
        )}
      </div>

      {view === "estoque" ? (
        products.length === 0 ? (
          <Empty icon={<Boxes size={26} />} title="Nenhum produto no estoque" desc="Cadastre produtos para começar a controlar o estoque." />
        ) : (
          <TableWrap>
            <thead>
              <tr><Th>Produto</Th><Th right>Estoque</Th><Th right className="hidden sm:table-cell">Mínimo</Th><Th right className="hidden md:table-cell">Custo</Th><Th right>Valor em estoque</Th><Th className="hidden lg:table-cell">Última movimentação</Th><Th right>Ações</Th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const lm = lastMove(p.id);
                const lowP = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-pine-50/50">
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <ProductThumb name={p.name} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="text-[11px] text-ink-faint">{p.sku}</span>
                        </span>
                      </span>
                    </Td>
                    <Td right>
                      <span className={cx("tnum text-[15px] font-bold", lowP && "text-danger")}>{p.stock}</span>
                      <span className="text-[11px] text-ink-faint"> {p.unit}</span>
                      {lowP && <Badge tone="red" className="ml-1.5">baixo</Badge>}
                    </Td>
                    <Td right className="hidden text-ink-soft sm:table-cell">{p.minStock}</Td>
                    <Td right className="hidden text-ink-soft md:table-cell">{brl(p.cost)}</Td>
                    <Td right><Money value={p.stock * p.cost} className="font-bold" /></Td>
                    <Td className="hidden text-[12px] text-ink-soft lg:table-cell">
                      {lm ? <>{fmtDate(lm.date)} · <Badge tone={lm.qty >= 0 ? "green" : "amber"}>{lm.type}</Badge> {lm.qty > 0 ? `+${lm.qty}` : lm.qty}</> : "—"}
                    </Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="soft" onClick={() => setMove({ open: true, type: "entrada" })} title="Entrada">+ Entr.</Button>
                        <Button size="sm" variant="outline" onClick={() => setMove({ open: true, type: "ajuste" })} title="Ajuste"><Settings2 size={13} /></Button>
                        <Button size="sm" variant="outline" onClick={() => setMove({ open: true, type: "perda" })} title="Perda"><PackageX size={13} /></Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )
      ) : db.moves.length === 0 ? (
        <Empty icon={<History size={26} />} title="Nenhuma movimentação registrada" desc="Entradas, saídas, vendas e compras aparecem aqui." />
      ) : (
        <TableWrap>
          <thead><tr><Th>Data</Th><Th>Produto</Th><Th>Tipo</Th><Th right>Qtd</Th><Th className="hidden md:table-cell">Observação</Th></tr></thead>
          <tbody>
            {db.moves.slice(0, 80).map((m) => {
              const p = db.products.find((x) => x.id === m.productId);
              const positive = m.qty >= 0;
              return (
                <tr key={m.id} className="transition-colors hover:bg-pine-50/40">
                  <Td className="text-ink-soft">{fmtDate(m.date)}</Td>
                  <Td className="font-semibold">{p?.name ?? "Produto removido"}</Td>
                  <Td><Badge tone={positive ? "green" : m.type === "venda" ? "blue" : "amber"}>{MOVE_TYPES.find((t) => t.id === m.type)?.label ?? m.type}</Badge></Td>
                  <Td right className={cx("tnum font-bold", positive ? "text-pine-600" : "text-danger")}>{positive ? `+${m.qty}` : m.qty}</Td>
                  <Td className="hidden text-[12.5px] text-ink-soft md:table-cell">{m.note}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <MoveModal open={move.open} presetType={move.type} onClose={() => setMove({ ...move, open: false })} />
    </div>
  );
}
