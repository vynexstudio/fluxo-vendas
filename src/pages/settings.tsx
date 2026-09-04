/* ============================================================
 * Fluxo — Configurações
 * ============================================================ */
import { useRef, useState } from "react";
import { Download, Upload, Trash2, RefreshCw, ShieldCheck, Bell, Building2, Tag, CreditCard, User as UserIcon, Database, Plus, X, Smartphone } from "lucide-react";
import { useApp } from "../store";
import { SEGMENTS, SELL_TYPES, PAY_METHODS } from "../lib/types";
import { download, slugify } from "../lib/utils";
import { backupJSON, parseBackup } from "../lib/services";
import { Button, Badge, Card, Confirm, Field, Input, Select, useToast, PageHead, IconBtn } from "../components/ui";

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[13.5px] font-semibold">{label}</span>
        {desc && <span className="block text-[12px] text-ink-faint">{desc}</span>}
      </span>
      <span className="relative inline-flex shrink-0 items-center pt-0.5">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-pine-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { db, user, update, resetDemo, clearDemo, importDB } = useApp();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [newMethod, setNewMethod] = useState("");
  const restoreRef = useRef<HTMLInputElement>(null);

  if (!db || !user) return null;
  const biz = db.business;

  const exportBackup = () => {
    download(`fluxo-backup-${new Date().toISOString().slice(0, 10)}.json`, backupJSON(db), "application/json");
    toast.push("success", "Backup exportado — guarde o arquivo em local seguro.");
  };

  const onRestore = async (file: File) => {
    const text = await file.text();
    const data = parseBackup(text);
    if (!data) return toast.push("danger", "Arquivo de backup inválido.");
    importDB(data);
    toast.push("success", "Backup restaurado com sucesso.");
  };

  return (
    <div className="animate-fade-up">
      <PageHead title="Configurações" desc="Perfil, negócio, preferências e segurança dos seus dados." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Perfil */}
        <Card title={<span className="flex items-center gap-2"><UserIcon size={15} className="text-pine-600" /> Perfil</span>}>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine-900 font-display text-[18px] font-bold text-leaf-300">{user.name.slice(0, 1)}</span>
              <div>
                <p className="font-display text-[15px] font-bold">{user.name}</p>
                <p className="text-[12.5px] text-ink-soft">{user.email}</p>
                <Badge tone="pine" className="mt-1">Administrador</Badge>
              </div>
            </div>
            <Field label="Seu nome">
              <Input defaultValue={user.name} onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== user.name) {
                  update((d) => { const u = d.users.find((x) => x.id === user.id); if (u) u.name = name; });
                  toast.push("success", "Nome atualizado.");
                }
              }} />
            </Field>
            <p className="rounded-lg bg-paper px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-faint">
              <ShieldCheck size={13} className="mr-1 inline text-pine-600" />
              Sua senha é armazenada com hash criptográfico (SHA-256) — nunca em texto puro. A arquitetura já prevê autenticação real via backend.
            </p>
          </div>
        </Card>

        {/* Negócio */}
        <Card title={<span className="flex items-center gap-2"><Building2 size={15} className="text-pine-600" /> Negócio</span>}>
          {biz && (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Nome do negócio">
                <Input defaultValue={biz.name} onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name) update((d) => { if (d.business) { d.business.name = name; d.business.slug = slugify(name); } });
                }} />
              </Field>
              <Field label="Link do catálogo">
                <Input value={`#/catalogo/${biz.slug}`} readOnly className="bg-paper text-[12.5px]" />
              </Field>
              <Field label="Segmento">
                <Select value={biz.segment} onChange={(e) => update((d) => { if (d.business) d.business.segment = e.target.value; })}>
                  {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Vende">
                <Select value={biz.sells} onChange={(e) => update((d) => { if (d.business) d.business.sells = e.target.value; })}>
                  {SELL_TYPES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Telefone">
                <Input defaultValue={biz.phone} placeholder="(11) 99999-0000" onBlur={(e) => update((d) => { if (d.business) d.business.phone = e.target.value.trim(); })} />
              </Field>
              <Field label="Endereço">
                <Input defaultValue={biz.address} placeholder="Rua, número — cidade/UF" onBlur={(e) => update((d) => { if (d.business) d.business.address = e.target.value.trim(); })} />
              </Field>
            </div>
          )}
        </Card>

        {/* Categorias */}
        <Card title={<span className="flex items-center gap-2"><Tag size={15} className="text-pine-600" /> Categorias de produtos</span>}>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {db.settings.categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[13px] font-semibold">
                  {c}
                  <button aria-label={`Remover categoria ${c}`} className="text-ink-faint hover:text-danger"
                    onClick={() => { update((d) => { d.settings.categories = d.settings.categories.filter((x) => x !== c); }); toast.push("info", `Categoria “${c}” removida.`); }}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria…" className="h-9.5 text-[13px]" />
              <Button variant="soft" onClick={() => {
                const c = newCat.trim();
                if (!c) return;
                if (db.settings.categories.includes(c)) return toast.push("danger", "Essa categoria já existe.");
                update((d) => d.settings.categories.push(c));
                setNewCat(""); toast.push("success", `Categoria “${c}” criada.`);
              }}><Plus size={15} /> Adicionar</Button>
            </div>
          </div>
        </Card>

        {/* Formas de pagamento */}
        <Card title={<span className="flex items-center gap-2"><CreditCard size={15} className="text-pine-600" /> Formas de pagamento</span>}>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {db.settings.methods.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[13px] font-semibold">
                  {m}
                  {db.settings.methods.length > 2 && (
                    <button aria-label={`Remover ${m}`} className="text-ink-faint hover:text-danger"
                      onClick={() => update((d) => { d.settings.methods = d.settings.methods.filter((x) => x !== m); })}>
                      <X size={13} />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newMethod} onChange={(e) => setNewMethod(e.target.value)} placeholder="Ex.: Vale, Crédito loja…" className="h-9.5 text-[13px]" />
              <Button variant="soft" onClick={() => {
                const m = newMethod.trim();
                if (!m) return;
                if (db.settings.methods.includes(m)) return toast.push("danger", "Já existe essa forma.");
                update((d) => d.settings.methods.push(m));
                setNewMethod(""); toast.push("success", "Forma de pagamento adicionada.");
              }}><Plus size={15} /> Adicionar</Button>
            </div>
          </div>
        </Card>

        {/* Notificações */}
        <Card title={<span className="flex items-center gap-2"><Bell size={15} className="text-pine-600" /> Notificações</span>}>
          <div className="divide-y divide-line/70 px-4">
            <Toggle checked={db.settings.notifyLowStock} label="Alerta de estoque baixo" desc="Avisa quando um produto chega no estoque mínimo" onChange={(v) => update((d) => { d.settings.notifyLowStock = v; })} />
            <Toggle checked={db.settings.notifyDue} label="Contas vencendo e atrasadas" desc="Lembretes de pagamentos a receber e a pagar" onChange={(v) => update((d) => { d.settings.notifyDue = v; })} />
          </div>
        </Card>

        {/* Dados */}
        <Card title={<span className="flex items-center gap-2"><Database size={15} className="text-pine-600" /> Backup e dados</span>}>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportBackup}><Download size={15} /> Exportar backup (JSON)</Button>
              <input ref={restoreRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onRestore(e.target.files[0])} />
              <Button variant="outline" onClick={() => restoreRef.current?.click()}><Upload size={15} /> Restaurar backup</Button>
            </div>
            <p className="rounded-lg bg-paper px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-faint">
              O backup inclui produtos, clientes, fornecedores, vendas, compras, despesas, contas e configurações.
              A importação de produtos por CSV fica em <strong>Produtos → Importar</strong>.
            </p>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button variant="outline" onClick={() => setConfirmReset(true)}><RefreshCw size={15} /> Recarregar demonstração</Button>
              <Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Limpar dados de demonstração</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-5 py-4 shadow-card">
        <Smartphone size={20} className="text-pine-600" />
        <div className="flex-1">
          <p className="text-[13.5px] font-bold">Instale o Fluxo no seu celular</p>
          <p className="text-[12px] text-ink-soft">Este app é um PWA: no navegador do celular, use “Adicionar à tela inicial” para ter um aplicativo com acesso offline.</p>
        </div>
        <Badge tone="lime">PWA ready</Badge>
      </div>

      <Confirm open={confirmClear} onClose={() => setConfirmClear(false)} danger yesLabel="Limpar tudo"
        title="Limpar dados de demonstração?"
        msg="Todas as vendas, produtos, clientes e registros serão apagados deste dispositivo. Sua conta e o nome do negócio permanecem. Considere exportar um backup antes."
        onYes={() => { clearDemo(); toast.push("info", "Dados de demonstração removidos. Comece do zero!"); }} />
      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} yesLabel="Recarregar"
        title="Recarregar dados de demonstração?"
        msg="Os dados atuais serão substituídos pelo cenário de demonstração completo (Aurora Store)."
        onYes={async () => { await resetDemo(); toast.push("success", "Demonstração recarregada."); }} />
    </div>
  );
}
