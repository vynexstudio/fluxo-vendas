/* ============================================================
 * Fluxo — Módulo de Produtos (CRUD + CSV)
 * ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Download, Upload, Package, FileSpreadsheet, ArrowUpDown } from "lucide-react";
import { useApp } from "../store";
import type { Product } from "../lib/types";
import { UNITS } from "../lib/types";
import { brl, cx, download, numParse, parseCSV, toCSV, uid } from "../lib/utils";
import {
  Button, Badge, Card, Confirm, Empty, Field, Input, Modal, SearchSelect, Select,
  TableWrap, Th, Td, Textarea, useToast, PageHead, ProductThumb, IconBtn, Money,
} from "../components/ui";

const emptyProduct = (category: string): Product => ({
  id: "", name: "", sku: "", code: "", barcode: "", category, description: "",
  cost: 0, price: 0, stock: 0, minStock: 5, unit: "un", supplierId: "", active: true, inCatalog: true,
  createdAt: new Date().toISOString(),
});

function ProductForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Product | null }) {
  const { db, update } = useApp();
  const toast = useToast();
  const [f, setF] = useState<Product>(emptyProduct("Geral"));
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    if (open) setF(editing ? { ...editing } : emptyProduct(db?.settings.categories[0] ?? "Geral"));
  }, [open, editing, db]);

  if (!db) return null;
  const margin = f.price > 0 ? ((f.price - f.cost) / f.price) * 100 : 0;
  const gross = f.price - f.cost;

  const save = () => {
    if (!f.name.trim()) return toast.push("danger", "Informe o nome do produto.");
    if (f.price <= 0) return toast.push("danger", "Informe o preço de venda.");
    const sku = f.sku.trim() || f.name.slice(0, 3).toUpperCase().replace(/\s/g, "") + String(db.products.length + 1).padStart(3, "0");
    update((d) => {
      const cat = newCat.trim() || f.category;
      if (newCat.trim() && !d.settings.categories.includes(newCat.trim())) d.settings.categories.push(newCat.trim());
      const data: Product = { ...f, sku, category: cat };
      if (editing) {
        const i = d.products.findIndex((p) => p.id === editing.id);
        if (i >= 0) d.products[i] = { ...data, id: editing.id };
      } else {
        d.products.unshift({ ...data, id: uid() });
        d.moves.unshift({ id: uid(), productId: data.id, type: "entrada", qty: data.stock, date: new Date().toISOString().slice(0, 10), note: "Cadastro do produto", ref: "" });
      }
    });
    toast.push("success", editing ? "Produto atualizado." : "Produto cadastrado.");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar — ${editing.name}` : "Novo produto"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button size="lg" onClick={save}>{editing ? "Salvar alterações" : "Cadastrar produto"}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Camiseta Básica" />
        </Field>
        <Field label="SKU" hint="Gerado automaticamente se vazio">
          <Input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="CAM001" />
        </Field>
        <Field label="Código de barras">
          <Input value={f.barcode} onChange={(e) => setF({ ...f, barcode: e.target.value })} placeholder="789…" />
        </Field>
        <Field label="Categoria">
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {db.settings.categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Nova categoria (opcional)">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Criar categoria…" />
        </Field>
        <Field label="Preço de custo (R$)">
          <Input inputMode="decimal" value={f.cost ? String(f.cost).replace(".", ",") : ""} onChange={(e) => setF({ ...f, cost: numParse(e.target.value) })} placeholder="0,00" />
        </Field>
        <Field label="Preço de venda (R$)">
          <Input inputMode="decimal" value={f.price ? String(f.price).replace(".", ",") : ""} onChange={(e) => setF({ ...f, price: numParse(e.target.value) })} placeholder="0,00" />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl bg-paper px-4 py-3 text-[13px]">
        <span className="text-ink-soft">Lucro bruto: <Money value={gross} className="font-bold" /></span>
        <span className="text-ink-soft">Margem: <span className={cx("font-bold", margin >= 40 ? "text-pine-600" : margin >= 20 ? "text-warn" : "text-danger")}>{margin.toFixed(1).replace(".", ",")}%</span></span>
        <span className="text-[11.5px] text-ink-faint">Ex.: custo R$ 30 · venda R$ 50 → margem 40%</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="Estoque atual">
          <Input type="number" min={0} value={String(f.stock)} onChange={(e) => setF({ ...f, stock: Math.max(0, Number(e.target.value)) })} />
        </Field>
        <Field label="Estoque mínimo">
          <Input type="number" min={0} value={String(f.minStock)} onChange={(e) => setF({ ...f, minStock: Math.max(0, Number(e.target.value)) })} />
        </Field>
        <Field label="Unidade">
          <Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Fornecedor">
          <Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>
            <option value="">Sem fornecedor</option>
            {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Descrição">
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Detalhes que ajudam na venda…" />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-4.5 w-4.5 accent-pine-600" />
          Produto ativo
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold">
          <input type="checkbox" checked={f.inCatalog} onChange={(e) => setF({ ...f, inCatalog: e.target.checked })} className="h-4.5 w-4.5 accent-pine-600" />
          Exibir no catálogo online
        </label>
      </div>
    </Modal>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, update } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => { if (open) { setRows([]); setFileName(""); } }, [open]);

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) return toast.push("danger", "Arquivo vazio ou inválido.");
    setRows(parsed);
    setFileName(file.name);
  };

  const importRows = () => {
    const header = rows[0].map((h) => h.toLowerCase());
    const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
    const map = {
      name: idx(["nome", "name", "produto"]),
      sku: idx(["sku"]),
      code: idx(["código", "codigo", "code"]),
      category: idx(["categoria", "categ"]),
      cost: idx(["custo", "cost"]),
      price: idx(["preço", "preco", "price", "venda"]),
      stock: idx(["estoque", "stock", "qtd"]),
      min: idx(["mínimo", "minimo", "min"]),
      supplier: idx(["fornecedor", "supplier"]),
    };
    if (map.name < 0) return toast.push("danger", "O CSV precisa de uma coluna “Nome”.");
    const data = rows.slice(1);
    update((d) => {
      for (const r of data) {
        const name = r[map.name]?.trim();
        if (!name) continue;
        const supName = map.supplier >= 0 ? r[map.supplier]?.trim() : "";
        const sup = d.suppliers.find((s) => s.name.toLowerCase() === (supName ?? "").toLowerCase());
        const cat = map.category >= 0 && r[map.category]?.trim() ? r[map.category].trim() : "Geral";
        if (!d.settings.categories.includes(cat)) d.settings.categories.push(cat);
        const p: Product = {
          id: uid(), name,
          sku: map.sku >= 0 && r[map.sku]?.trim() ? r[map.sku].trim() : name.slice(0, 3).toUpperCase() + String(d.products.length + 1).padStart(3, "0"),
          code: map.code >= 0 ? r[map.code]?.trim() ?? "" : "", barcode: "",
          category: cat, description: "",
          cost: map.cost >= 0 ? numParse(r[map.cost]) : 0,
          price: map.price >= 0 ? numParse(r[map.price]) : 0,
          stock: map.stock >= 0 ? numParse(r[map.stock]) : 0,
          minStock: map.min >= 0 ? numParse(r[map.min]) : 5,
          unit: "un", supplierId: sup?.id ?? "", active: true, inCatalog: true,
          createdAt: new Date().toISOString(),
        };
        d.products.unshift(p);
        if (p.stock > 0) d.moves.unshift({ id: uid(), productId: p.id, type: "entrada", qty: p.stock, date: new Date().toISOString().slice(0, 10), note: `Importação CSV (${fileName})`, ref: "" });
      }
    });
    toast.push("success", `${data.length} produto(s) importado(s) com sucesso.`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Importar produtos (CSV)" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={rows.length < 2} onClick={importRows}><Upload size={15} /> Importar {rows.length > 1 ? `${rows.length - 1} linhas` : ""}</Button>
        </>
      }>
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Colunas aceitas: <strong>Nome, SKU, Código, Categoria, Custo, Preço, Estoque, Estoque mínimo, Fornecedor</strong> — separadas por <code className="rounded bg-paper px-1">;</code> ou <code className="rounded bg-paper px-1">,</code>.
        (Arquivos XLSX serão suportados em uma próxima versão — exporte como CSV no Excel.)
      </p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button onClick={() => fileRef.current?.click()}
        className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-paper px-4 py-8 transition-colors hover:border-pine-400 hover:bg-pine-50/50">
        <FileSpreadsheet size={26} className="text-pine-500" />
        <span className="text-[13.5px] font-semibold">{fileName || "Clique para escolher o arquivo CSV"}</span>
        <span className="text-[12px] text-ink-faint">{rows.length > 1 ? `${rows.length - 1} produtos detectados` : "Formato: .csv"}</span>
      </button>
      {rows.length > 1 && (
        <div className="mt-4 max-h-52 overflow-auto rounded-lg border border-line">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-paper"><tr>{rows[0].map((h, i) => <th key={i} className="px-2.5 py-1.5 text-left font-bold uppercase text-ink-faint">{h}</th>)}</tr></thead>
            <tbody>{rows.slice(1, 8).map((r, i) => <tr key={i} className="border-t border-line/60">{r.map((c, j) => <td key={j} className="px-2.5 py-1.5">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default function ProductsPage() {
  const { db, update, query, navigate } = useApp();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const [flt, setFlt] = useState({ q: "", cat: "", sort: "name" });

  useEffect(() => {
    if (query.get("novo")) { setEditing(null); setShowForm(true); }
    const q = query.get("q");
    if (q) setFlt((f) => ({ ...f, q }));
  }, [query]);

  const list = useMemo(() => {
    if (!db) return [];
    const t = flt.q.trim().toLowerCase();
    const arr = db.products.filter((p) => {
      if (t && !(`${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(t))) return false;
      if (flt.cat && p.category !== flt.cat) return false;
      return true;
    });
    arr.sort((a, b) => flt.sort === "price" ? b.price - a.price : flt.sort === "stock" ? a.stock - b.stock : a.name.localeCompare(b.name));
    return arr;
  }, [db, flt]);

  if (!db) return null;

  const exportCSV = () => {
    const rows = [
      ["Nome", "SKU", "Código", "Categoria", "Custo", "Preço", "Estoque", "Estoque mínimo", "Fornecedor"],
      ...db.products.map((p) => [
        p.name, p.sku, p.code, p.category, p.cost.toFixed(2).replace(".", ","), p.price.toFixed(2).replace(".", ","),
        String(p.stock), String(p.minStock), db.suppliers.find((s) => s.id === p.supplierId)?.name ?? "",
      ]),
    ];
    download("fluxo-produtos.csv", toCSV(rows), "text/csv");
    toast.push("success", "Produtos exportados em CSV.");
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Produtos" desc={`${db.products.length} produto(s) cadastrado(s) · margem calculada automaticamente.`}>
        <Button variant="outline" onClick={() => setShowImport(true)}><Upload size={15} /> Importar</Button>
        <Button variant="outline" onClick={exportCSV}><Download size={15} /> Exportar</Button>
        <Button size="lg" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={17} /> Novo produto</Button>
      </PageHead>

      <Card className="mb-4">
        <div className="grid gap-2.5 p-3.5 sm:grid-cols-4">
          <Input placeholder="Buscar por nome, SKU ou código…" value={flt.q} onChange={(e) => setFlt({ ...flt, q: e.target.value })} className="h-9.5 text-[13px] sm:col-span-2" aria-label="Buscar produtos" />
          <Select value={flt.cat} onChange={(e) => setFlt({ ...flt, cat: e.target.value })} className="h-9.5 text-[13px]">
            <option value="">Todas as categorias</option>
            {db.settings.categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <div className="relative">
            <ArrowUpDown size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Select value={flt.sort} onChange={(e) => setFlt({ ...flt, sort: e.target.value })} className="h-9.5 pl-8 text-[13px]">
              <option value="name">Ordenar: nome</option>
              <option value="price">Ordenar: preço</option>
              <option value="stock">Ordenar: estoque</option>
            </Select>
          </div>
        </div>
      </Card>

      {db.products.length === 0 ? (
        <Empty icon={<Package size={26} />} title="Você ainda não possui produtos."
          desc="Cadastre manualmente ou importe uma planilha CSV — o estoque já sai preenchido."
          action={<div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setShowForm(true)}><Plus size={15} /> Cadastrar produto</Button>
            <Button variant="outline" onClick={() => setShowImport(true)}><Upload size={15} /> Importar CSV</Button>
          </div>} />
      ) : list.length === 0 ? (
        <Empty title="Nenhum produto encontrado" desc={`Nada corresponde a “${flt.q}”. Tente outro termo ou limpe os filtros.`} />
      ) : (
        <TableWrap>
          <thead>
            <tr><Th>Produto</Th><Th className="hidden lg:table-cell">SKU</Th><Th className="hidden md:table-cell">Categoria</Th><Th right>Custo</Th><Th right>Venda</Th><Th right className="hidden sm:table-cell">Margem</Th><Th right>Estoque</Th><Th>Status</Th><Th right>Ações</Th></tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
              const low = p.stock <= p.minStock;
              return (
                <tr key={p.id} className={cx("transition-colors hover:bg-pine-50/50", !p.active && "opacity-55")}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <ProductThumb name={p.name} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{p.name}</span>
                        <span className="text-[11px] text-ink-faint lg:hidden">{p.sku}</span>
                        {p.inCatalog && <Badge tone="lime" className="ml-1 hidden lg:inline-flex">catálogo</Badge>}
                      </span>
                    </span>
                  </Td>
                  <Td className="hidden lg:table-cell text-ink-soft">{p.sku}</Td>
                  <Td className="hidden md:table-cell"><Badge tone="blue">{p.category}</Badge></Td>
                  <Td right className="text-ink-soft">{brl(p.cost)}</Td>
                  <Td right><Money value={p.price} className="font-bold" /></Td>
                  <Td right className={cx("hidden font-bold sm:table-cell", margin >= 40 ? "text-pine-600" : margin >= 20 ? "text-warn" : "text-danger")}>
                    {margin.toFixed(0)}%
                  </Td>
                  <Td right>
                    <span className={cx("tnum font-bold", low && "text-danger")}>{p.stock}</span>
                    <span className="text-[11px] text-ink-faint"> /{p.minStock}</span>
                  </Td>
                  <Td>
                    {!p.active ? <Badge tone="gray">Inativo</Badge> : low ? <Badge tone="red">Estoque baixo</Badge> : <Badge tone="green">Ativo</Badge>}
                  </Td>
                  <Td right>
                    <div className="flex justify-end gap-0.5">
                      <IconBtn label="Editar produto" onClick={() => { setEditing(p); setShowForm(true); }}><Pencil size={15} /></IconBtn>
                      <IconBtn label="Excluir produto" className="text-danger hover:bg-danger-soft" onClick={() => setDel(p)}><Trash2 size={15} /></IconBtn>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      <ProductForm open={showForm} editing={editing} onClose={() => { setShowForm(false); if (query.get("novo")) navigate("/produtos"); }} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
      <Confirm open={!!del} onClose={() => setDel(null)} danger yesLabel="Excluir" title={`Excluir “${del?.name}”?`}
        msg="O produto e o histórico de movimentações dele serão removidos. Vendas antigas permanecem no histórico."
        onYes={() => {
          if (!del) return;
          update((d) => { d.products = d.products.filter((p) => p.id !== del.id); });
          toast.push("info", `“${del.name}” excluído.`);
        }} />
    </div>
  );
}
