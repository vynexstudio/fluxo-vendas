/* ============================================================
 * Fluxo — Pedidos (Kanban) e Catálogo online (público)
 * ============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  Plus, ChevronRight, ChevronLeft, Ban, Copy, ExternalLink, ShoppingBag, Trash2,
  Check, Globe, ClipboardList, MessageCircle, ShoppingCart, Phone, MapPin, User,
} from "lucide-react";
import { useApp } from "../store";
import type { Order, OrderStatus } from "../lib/types";
import { ORDER_FLOW } from "../lib/types";
import { brl, timeAgo, waLink, todayISO } from "../lib/utils";
import { setOrderStatus, convertOrderToSale, chargeOrder, placeOrder, addDaysISO } from "../lib/services";
import {
  Button, Badge, Card, Confirm, Empty, Field, Input, Modal, Select, useToast,
  PageHead, Money, IconBtn, ProductThumb, Textarea, Drawer, Stepper,
} from "../components/ui";

/* ---------------- Kanban de Pedidos ---------------- */

export default function OrdersPage() {
  const { db, update, navigate } = useApp();
  const toast = useToast();
  const [detail, setDetail] = useState<Order | null>(null);
  const [cancel, setCancel] = useState<Order | null>(null);
  const [convert, setConvert] = useState<Order | null>(null);
  const [convertMethod, setConvertMethod] = useState("PIX");
  const [charge, setCharge] = useState<Order | null>(null);
  const [chargeDue, setChargeDue] = useState(addDaysISO(todayISO(), 7));

  if (!db) return null;

  const flowIdx = (s: OrderStatus) => ORDER_FLOW.findIndex((f) => f.id === s);

  const move = (o: Order, dir: 1 | -1) => {
    const idx = flowIdx(o.status);
    const next = ORDER_FLOW[idx + dir];
    if (!next) return;
    update((d) => setOrderStatus(d, o.id, next.id));
    toast.push("info", `Pedido ${o.number} → ${next.label}.`);
    if (next.id === "concluido") setConvert(o);
  };

  const orderTone = (s: OrderStatus) =>
    s === "novo" ? "lime" : s === "confirmado" ? "blue" : s === "preparacao" ? "amber" : s === "pronto" ? "green" : s === "enviado" ? "blue" : "green";

  return (
    <div className="animate-fade-up">
      <PageHead title="Pedidos" desc="Pedidos do catálogo online — arraste-os pelo funil até a conclusão.">
        <Button variant="outline" onClick={() => navigate("/catalogo")}><Globe size={15} /> Gerenciar catálogo</Button>
      </PageHead>

      {db.orders.length === 0 ? (
        <Empty icon={<ClipboardList size={26} />} title="Nenhum pedido ainda."
          desc="Compartilhe o link do seu catálogo online — cada pedido cai direto neste funil."
          action={<Button onClick={() => navigate("/catalogo")}><Globe size={15} /> Ver catálogo</Button>} />
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {ORDER_FLOW.map((col) => {
              const items = db.orders.filter((o) => o.status === col.id);
              return (
                <div key={col.id} className="w-[268px] shrink-0">
                  <div className="mb-2 flex items-center justify-between rounded-lg bg-pine-900/90 px-3 py-2">
                    <p className="font-display text-[12.5px] font-bold text-leaf-200">{col.label}</p>
                    <span className="tnum rounded-md bg-pine-800 px-1.5 py-0.5 text-[11px] font-bold text-leaf-300">{items.length}</span>
                  </div>
                  <div className="space-y-2.5 rounded-xl border border-dashed border-line bg-paper/60 p-2 min-h-[120px]">
                    {items.length === 0 && <p className="py-6 text-center text-[11.5px] text-ink-faint">Vazio</p>}
                    {items.map((o) => (
                      <div key={o.id} className="animate-fade-up rounded-xl border border-line bg-surface p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
                        <div className="flex items-center justify-between gap-2">
                          <button className="font-display text-[13px] font-bold text-pine-700 hover:underline" onClick={() => setDetail(o)}>{o.number}</button>
                          <Badge tone={orderTone(o.status) as never}>{ORDER_FLOW[flowIdx(o.status)].label}</Badge>
                        </div>
                        <p className="mt-1 truncate text-[13px] font-semibold">{o.customerName}</p>
                        <p className="truncate text-[11.5px] text-ink-faint">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <Money value={o.total} className="font-display text-[14.5px] font-bold" />
                          <span className="text-[10.5px] text-ink-faint">{timeAgo(o.createdAt)}</span>
                        </div>
                        <div className="mt-2.5 flex gap-1 border-t border-line pt-2.5">
                          <IconBtn label="Voltar etapa" className="h-7 w-7" disabled={flowIdx(o.status) === 0} onClick={() => move(o, -1)}><ChevronLeft size={15} /></IconBtn>
                          <IconBtn label="Avançar etapa" className="h-7 w-7 text-pine-600" disabled={flowIdx(o.status) === ORDER_FLOW.length - 1} onClick={() => move(o, 1)}><ChevronRight size={15} /></IconBtn>
                          <IconBtn label="Detalhes" className="h-7 w-7" onClick={() => setDetail(o)}><ShoppingBag size={14} /></IconBtn>
                          <IconBtn label="Cancelar pedido" className="h-7 w-7 ml-auto text-danger hover:bg-danger-soft" onClick={() => setCancel(o)}><Ban size={14} /></IconBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Cancelados */}
            <div className="w-[240px] shrink-0 opacity-80">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-line px-3 py-2">
                <p className="font-display text-[12.5px] font-bold text-ink-soft">Cancelados</p>
                <span className="tnum rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink-soft">{db.orders.filter((o) => o.status === "cancelado").length}</span>
              </div>
              <div className="space-y-2 rounded-xl border border-dashed border-line p-2">
                {db.orders.filter((o) => o.status === "cancelado").map((o) => (
                  <button key={o.id} onClick={() => setDetail(o)} className="w-full rounded-lg border border-line bg-surface p-2.5 text-left opacity-70 hover:opacity-100">
                    <p className="text-[12.5px] font-bold">{o.number} · {o.customerName}</p>
                    <p className="tnum text-[11.5px] text-ink-faint">{brl(o.total)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <Drawer open onClose={() => setDetail(null)} title={`Pedido ${detail.number}`}>
          <div className="space-y-1.5 rounded-lg border border-line bg-paper p-3 text-[12.5px]">
            <p className="flex items-center gap-2 font-semibold"><User size={13} /> {detail.customerName}</p>
            <p className="flex items-center gap-2 text-ink-soft"><Phone size={13} /> {detail.phone || "—"}</p>
            <p className="flex items-start gap-2 text-ink-soft"><MapPin size={13} /> {detail.address || "—"}</p>
            {detail.notes && <p className="flex items-start gap-2 text-ink-soft"><MessageCircle size={13} /> {detail.notes}</p>}
          </div>
          <h4 className="mt-4 mb-2 font-display text-[13px] font-bold">Itens</h4>
          <ul className="divide-y divide-line/70 rounded-lg border border-line">
            {detail.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-2.5 px-3 py-2">
                <ProductThumb name={i.name} size={30} />
                <span className="flex-1 text-[13px] font-semibold">{i.qty}× {i.name}</span>
                <Money value={i.qty * i.price} className="text-[13px] font-bold" />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-pine-900 px-4 py-3">
            <span className="text-[12px] font-bold uppercase tracking-wider text-pine-300">Total · {detail.method}</span>
            <Money value={detail.total} className="font-display text-[17px] font-bold text-leaf-300" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {detail.status !== "concluido" && detail.status !== "cancelado" && (
              <Button size="sm" onClick={() => { setConvert(detail); setDetail(null); }}><ShoppingCart size={14} /> Converter em venda</Button>
            )}
            {detail.status !== "cancelado" && (
              <Button size="sm" variant="outline" onClick={() => { setCharge(detail); setChargeDue(addDaysISO(todayISO(), 7)); setDetail(null); }}><MessageCircle size={14} /> Lançar cobrança</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => window.open(waLink(detail.phone, `Olá, ${detail.customerName.split(" ")[0]}! Seu pedido ${detail.number} está "${ORDER_FLOW.find((f) => f.id === detail.status)?.label ?? detail.status}" em ${db.business?.name ?? "nossa loja"}. 🙂`), "_blank")}>
              <MessageCircle size={14} /> Avisar cliente
            </Button>
          </div>
        </Drawer>
      )}

      <Modal open={!!convert} onClose={() => setConvert(null)} title={`Converter ${convert?.number} em venda`} size="sm"
        footer={<><Button variant="ghost" onClick={() => setConvert(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!convert) return;
            update((d) => convertOrderToSale(d, convert.id, convertMethod, ""));
            toast.push("success", "Pedido convertido em venda — estoque e caixa atualizados.");
            setConvert(null);
          }}>Converter</Button></>}>
        <p className="text-[13.5px] text-ink-soft">O pedido vira uma venda registrada (baixa estoque e alimenta o caixa).</p>
        <div className="mt-4">
          <Field label="Forma de pagamento">
            <Select value={convertMethod} onChange={(e) => setConvertMethod(e.target.value)}>
              {(db?.settings.methods ?? []).map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal open={!!charge} onClose={() => setCharge(null)} title="Lançar cobrança do pedido" size="sm"
        footer={<><Button variant="ghost" onClick={() => setCharge(null)}>Cancelar</Button>
          <Button onClick={() => {
            if (!charge) return;
            update((d) => chargeOrder(d, charge.id, chargeDue));
            toast.push("success", "Cobrança lançada em Contas a Receber.");
            setCharge(null);
          }}>Lançar</Button></>}>
        <Field label="Vencimento da cobrança">
          <Input type="date" value={chargeDue} min={todayISO()} onChange={(e) => setChargeDue(e.target.value)} />
        </Field>
      </Modal>

      <Confirm open={!!cancel} onClose={() => setCancel(null)} danger yesLabel="Cancelar pedido" title={`Cancelar ${cancel?.number}?`}
        msg="O cliente será marcado como pedido cancelado."
        onYes={() => { if (cancel) { update((d) => setOrderStatus(d, cancel.id, "cancelado")); toast.push("info", "Pedido cancelado."); } }} />
    </div>
  );
}

/* ---------------- Catálogo: gestão ---------------- */

export function CatalogManagerPage() {
  const { db, update } = useApp();
  const toast = useToast();
  if (!db) return null;
  const slug = db.business?.slug ?? "meu-negocio";
  const publicUrl = `${window.location.origin}${window.location.pathname}#/catalogo/${slug}`;
  const inCatalog = db.products.filter((p) => p.inCatalog && p.active);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.push("success", "Link do catálogo copiado!");
    } catch {
      toast.push("info", `Copie manualmente: ${publicUrl}`);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Catálogo online" desc="Seu negócio na internet — sem precisar de site." />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft">Link público do catálogo</p>
          <p className="mt-1 text-[13px] text-ink-soft">Qualquer pessoa com o link pode ver os produtos e enviar pedidos — sem login. Os pedidos chegam no funil de Pedidos.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="tnum flex-1 truncate rounded-lg border border-line bg-paper px-3 py-2.5 text-[12.5px] text-pine-700">{publicUrl}</code>
            <Button variant="outline" onClick={copy}><Copy size={15} /> Copiar</Button>
            <Button onClick={() => window.open(`#/catalogo/${slug}`, "_blank")}><ExternalLink size={15} /> Abrir</Button>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft">Resumo</p>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-[13.5px]"><span className="text-ink-soft">Produtos no catálogo</span><strong>{inCatalog.length}</strong></div>
            <div className="flex items-center justify-between text-[13.5px]"><span className="text-ink-soft">Pedidos recebidos</span><strong>{db.orders.length}</strong></div>
            <div className="flex items-center justify-between text-[13.5px]"><span className="text-ink-soft">Pedidos novos</span><strong className="text-pine-600">{db.orders.filter((o) => o.status === "novo").length}</strong></div>
          </div>
        </Card>
      </div>

      <Card title="Produtos visíveis no catálogo" action={<Button size="sm" variant="ghost" onClick={() => update((d) => d.products.forEach((p) => { p.inCatalog = p.active; }))}>Publicar todos ativos</Button>}>
        {db.products.length === 0 ? (
          <div className="p-4"><Empty title="Nenhum produto cadastrado" desc="Cadastre produtos para montar seu catálogo." /></div>
        ) : (
          <ul className="divide-y divide-line/70">
            {db.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <ProductThumb name={p.name} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                  <span className="text-[11.5px] text-ink-faint">{p.category} · {brl(p.price)} · estoque {p.stock}</span>
                </span>
                {!p.active && <Badge tone="gray">inativo</Badge>}
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={p.inCatalog && p.active} disabled={!p.active}
                    onChange={(e) => { update((d) => { const x = d.products.find((y) => y.id === p.id); if (x) x.inCatalog = e.target.checked; }); toast.push("info", e.target.checked ? `${p.name} publicado no catálogo.` : `${p.name} removido do catálogo.`); }} />
                  <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-pine-600 peer-disabled:opacity-40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
                  <span className="sr-only">Publicar no catálogo</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Catálogo: loja pública ---------------- */

export function CatalogPublicPage({ slug }: { slug: string }) {
  const { db, update, navigate } = useApp();
  const toast = useToast();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", phone: "", address: "", notes: "", method: "PIX" });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`fluxo.cart.${slug}`);
      if (saved) setCart(JSON.parse(saved));
    } catch { /* vazio */ }
  }, [slug]);

  useEffect(() => {
    sessionStorage.setItem(`fluxo.cart.${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  const biz = db?.business;
  const valid = !!biz && biz.slug === slug;
  const products = useMemo(() => {
    if (!db || !valid) return [];
    const t = q.trim().toLowerCase();
    return db.products.filter((p) => p.inCatalog && p.active && p.stock > 0
      && (!cat || p.category === cat)
      && (!t || p.name.toLowerCase().includes(t)));
  }, [db, valid, q, cat]);

  if (!db) return null;

  if (!valid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
        <Empty title="Catálogo não encontrado" desc={`Nenhum negócio com o endereço “${slug}”.`}
          action={<Button onClick={() => navigate("/login")}>Ir para o Fluxo</Button>} />
      </div>
    );
  }

  const items = Object.entries(cart).map(([id, qty]) => ({ p: db.products.find((x) => x.id === id), qty })).filter((x) => x.p);
  const total = items.reduce((s, x) => s + (x.p?.price ?? 0) * x.qty, 0);
  const count = items.reduce((s, x) => s + x.qty, 0);
  const cats = [...new Set(db.products.filter((p) => p.inCatalog && p.active).map((p) => p.category))];

  const add = (id: string, delta: number) => {
    setCart((c) => {
      const next = { ...c };
      const prod = db.products.find((p) => p.id === id);
      const max = prod?.stock ?? 99;
      next[id] = Math.min(max, Math.max(0, (next[id] ?? 0) + delta));
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  const finalize = () => {
    if (!f.name.trim()) return toast.push("danger", "Informe seu nome.");
    if (!f.phone.trim()) return toast.push("danger", "Informe seu telefone para contato.");
    let number = "";
    update((d) => {
      const order = placeOrder(d, {
        customerName: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(),
        items: items.map((x) => ({ productId: x.p!.id, name: x.p!.name, qty: x.qty, price: x.p!.price, cost: x.p!.cost })),
        method: f.method, notes: f.notes.trim(),
      });
      number = order.number;
    });
    setDone(number);
    setCart({});
    setCheckout(false);
    toast.push("success", `Pedido ${number} enviado para a loja!`);
  };

  return (
    <div className="min-h-dvh bg-paper pb-24">
      {/* Header da loja */}
      <header className="bg-pine-900 text-leaf-200">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-leaf-400 font-display text-[20px] font-bold text-pine-950">{biz.name.slice(0, 1)}</span>
            <div>
              <h1 className="font-display text-[22px] font-bold text-leaf-200 sm:text-[26px]">{biz.name}</h1>
              <p className="text-[12.5px] text-pine-300">{biz.segment} · {biz.phone || "pedidos pelo catálogo"}</p>
            </div>
            <button onClick={() => navigate("/login")} className="ml-auto text-[11.5px] font-semibold text-pine-300 hover:text-leaf-300">Área do lojista</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" aria-label="Buscar no catálogo"
                className="h-10 w-full rounded-lg border border-pine-700 bg-pine-800/70 px-3.5 text-[13.5px] text-leaf-200 placeholder:text-pine-400 focus:border-leaf-400 focus:outline-none" />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrar por categoria"
              className="h-10 rounded-lg border border-pine-700 bg-pine-800/70 px-3 text-[13px] text-leaf-200 focus:outline-none">
              <option value="">Todas as categorias</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {products.length === 0 ? (
          <Empty icon={<ShoppingBag size={26} />} title="Nenhum produto disponível" desc={q || cat ? "Tente outra busca ou categoria." : "A loja ainda está montando a vitrine. Volte em breve!"} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <article key={p.id} className="animate-fade-up group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card transition-all hover:-translate-y-1 hover:shadow-pop">
                <div className="relative flex h-28 items-center justify-center sm:h-32" style={{ background: `linear-gradient(135deg, #14684a18, #3f759c18)` }}>
                  <ProductThumb name={p.name} size={56} />
                  {p.stock <= p.minStock && <Badge tone="amber" className="absolute right-2 top-2">últimas unidades</Badge>}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{p.category}</p>
                  <h3 className="mt-0.5 text-[13.5px] font-bold leading-snug">{p.name}</h3>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-soft">{p.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-2.5">
                    <span className="tnum font-display text-[16px] font-bold text-pine-700">{brl(p.price)}</span>
                    <Button size="sm" variant={cart[p.id] ? "soft" : "primary"} onClick={() => { add(p.id, 1); if (!cart[p.id]) toast.push("success", `${p.name} adicionado à sacola.`); }}>
                      {cart[p.id] ? `Na sacola (${cart[p.id]})` : <><Plus size={13} /> Adicionar</>}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Barra do carrinho */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur-md">
          <button onClick={() => setCartOpen(true)} className="mx-auto flex w-full max-w-lg items-center justify-between rounded-xl bg-pine-900 px-5 py-3.5 text-leaf-200 shadow-pop transition-transform hover:scale-[1.01]">
            <span className="flex items-center gap-2 text-[14px] font-bold"><ShoppingBag size={17} /> Ver sacola ({count})</span>
            <span className="tnum font-display text-[16px] font-bold text-leaf-300">{brl(total)}</span>
          </button>
        </div>
      )}

      {/* Carrinho */}
      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title="Sua sacola">
        {items.length === 0 ? (
          <Empty icon={<ShoppingBag size={24} />} title="Sacola vazia" desc="Adicione produtos do catálogo." />
        ) : (
          <>
            <ul className="divide-y divide-line/70 rounded-xl border border-line">
              {items.map(({ p, qty }) => (
                <li key={p!.id} className="flex items-center gap-2.5 px-3 py-2.5">
                  <ProductThumb name={p!.name} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{p!.name}</span>
                    <span className="tnum text-[11.5px] text-ink-faint">{brl(p!.price)} cada</span>
                  </span>
                  <Stepper value={qty} onChange={(n) => setCart((c) => { const next = { ...c }; if (n <= 0) delete next[p!.id]; else next[p!.id] = n; return next; })} />
                  <Money value={qty * p!.price} className="w-20 text-right text-[13px] font-bold" />
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-paper px-4 py-3">
              <span className="text-[13px] font-semibold text-ink-soft">Total</span>
              <span className="tnum font-display text-[20px] font-bold text-pine-700">{brl(total)}</span>
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={() => { setCartOpen(false); setCheckout(true); }}>Finalizar pedido</Button>
          </>
        )}
      </Drawer>

      {/* Checkout */}
      <Modal open={checkout} onClose={() => setCheckout(false)} title="Finalizar pedido" size="md"
        footer={<><Button variant="ghost" onClick={() => setCheckout(false)}>Voltar</Button><Button size="lg" onClick={finalize}><Check size={16} /> Enviar pedido · {brl(total)}</Button></>}>
        <p className="text-[13px] text-ink-soft">A loja recebe seu pedido na hora e entra em contato para combinar pagamento e entrega.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome"><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome completo" /></Field>
          <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(11) 99999-0000" /></Field>
          <Field label="Endereço de entrega" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Rua, número, bairro" /></Field>
          <Field label="Como prefere pagar?">
            <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Observação"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Ex.: entregar à tarde" /></Field>
        </div>
      </Modal>

      {/* Sucesso */}
      <Modal open={!!done} onClose={() => setDone(null)} title="Pedido enviado!" size="sm"
        footer={<Button className="w-full" onClick={() => setDone(null)}>Continuar navegando</Button>}>
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-400 text-pine-950"><Check size={26} strokeWidth={3} /></span>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
            Seu pedido <strong className="text-pine-700">{done}</strong> foi enviado para <strong>{biz.name}</strong>.
            A loja vai te chamar no telefone informado para combinar tudo. 🙂
          </p>
        </div>
      </Modal>
    </div>
  );
}
