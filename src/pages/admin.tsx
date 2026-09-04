/* ============================================================
 * Fluxo — Painel do Sistema (acesso do Administrador)
 * Altera o "esquema" do app: nome, logo, favicon, tema, sidebar.
 * ============================================================ */
import { useMemo, useRef, useState } from "react";
import {
  PenLine, Palette, Building2, ShieldCheck, Database, LogOut, ExternalLink,
  Upload, Trash2, RotateCcw, Check, Image as ImageIcon, KeyRound, Download,
  AlertTriangle, Save,
} from "lucide-react";
import { useApp } from "../store";
import { useBranding, setBranding, resetBranding, PRESETS, DEFAULT_BRANDING } from "../lib/branding";
import type { Branding } from "../lib/branding";
import { cx, brl, hashPass, download } from "../lib/utils";
import { ROLE_LABEL } from "../lib/types";
import { Button, Badge, Card, Confirm, Field, Input, Seg, Select, useToast, TableWrap, Th, Td, Spinner } from "../components/ui";
import { Logo } from "../components/layout";

type TabId = "identidade" | "aparencia" | "negocio" | "seguranca" | "dados";

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "identidade", label: "Identidade", icon: <PenLine size={16} />, desc: "Nome, slogan, logo e favicon do aplicativo" },
  { id: "aparencia", label: "Aparência", icon: <Palette size={16} />, desc: "Tema de cores e estilo da barra lateral" },
  { id: "negocio", label: "Negócios e usuários", icon: <Building2 size={16} />, desc: "Visão geral do que está cadastrado" },
  { id: "seguranca", label: "Segurança", icon: <ShieldCheck size={16} />, desc: "Credenciais de acesso do sistema" },
  { id: "dados", label: "Dados e backup", icon: <Database size={16} />, desc: "Exportar, importar, restaurar e limpar" },
];

function readImage(file: File, ok: (url: string) => void, fail: (msg: string) => void) {
  if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return fail("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
  if (file.size > 400 * 1024) return fail("Imagem muito grande — o limite é 400 KB.");
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => fail("Não foi possível ler o arquivo.");
  r.readAsDataURL(file);
}

/* ---------------- Identidade ---------------- */

function IdentityTab() {
  const b = useBranding();
  const toast = useToast();
  const logoInput = useRef<HTMLInputElement>(null);
  const favInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      <Card title="Nome e slogan" action={<Badge tone="blue">aplicado em todo o app</Badge>}>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="Nome do aplicativo" hint="Aparece na aba do navegador, no login e no menu.">
            <Input value={b.appName} maxLength={24} onChange={(e) => setBranding({ appName: e.target.value || DEFAULT_BRANDING.appName })} />
          </Field>
          <Field label="Slogan (abaixo do logo)" hint="Texto curto em maiúsculas, com espaçamento.">
            <Input value={b.tagline} maxLength={32} onChange={(e) => setBranding({ tagline: e.target.value.toUpperCase() })} />
          </Field>
          <div className="sm:col-span-2 rounded-xl bg-pine-900 px-5 py-4">
            <p className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-pine-300">Pré-visualização</p>
            <Logo />
          </div>
        </div>
      </Card>

      <Card title="Logo do aplicativo" action={b.logoDataUrl ? <Badge tone="green">personalizado</Badge> : <Badge tone="gray">padrão</Badge>}>
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
          <div>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              Envie um <strong className="text-ink">PNG</strong> (ou SVG/WebP) com fundo transparente — de preferência em cor clara,
              pois o fundo do menu é escuro. Ele substitui o nome e o slogan no topo do menu.
            </p>
            <p className="mt-2 text-[12px] text-ink-faint">Dica: um arquivo chamado <code className="rounded bg-paper px-1 py-0.5">public/logo.png</code> também funciona, mas o upload daqui tem prioridade.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-lg bg-pine-900 px-3 ring-1 ring-line">
                {b.logoDataUrl ? (
                  <img src={b.logoDataUrl} alt="Logo atual" className="max-h-12 max-w-full object-contain" />
                ) : (
                  <span className="flex items-center gap-2 text-pine-300"><ImageIcon size={16} /> <span className="text-[11.5px]">sem logo enviado</span></span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => logoInput.current?.click()}><Upload size={14} /> Enviar logo</Button>
              {b.logoDataUrl && (
                <Button size="sm" variant="danger" onClick={() => { setBranding({ logoDataUrl: null }); toast.push("info", "Logo removido — marca padrão restaurada."); }}>
                  <Trash2 size={14} /> Remover
                </Button>
              )}
            </div>
          </div>
        </div>
        <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" aria-label="Enviar logo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) readImage(file, (url) => { setBranding({ logoDataUrl: url }); toast.push("success", "Logo atualizado em todo o aplicativo."); }, (m) => toast.push("danger", m));
          }} />
      </Card>

      <Card title="Favicon (ícone da aba do navegador)">
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper">
            {b.faviconDataUrl ? <img src={b.faviconDataUrl} alt="Favicon atual" className="h-9 w-9 object-contain" /> : <ImageIcon size={18} className="text-ink-faint" />}
          </span>
          <p className="flex-1 text-[13px] text-ink-soft">Sem upload, o favicon acompanha automaticamente as cores do tema escolhido.</p>
          <Button size="sm" variant="outline" onClick={() => favInput.current?.click()}><Upload size={14} /> Enviar favicon</Button>
          {b.faviconDataUrl && <Button size="sm" variant="ghost" onClick={() => setBranding({ faviconDataUrl: null })}>Usar o do tema</Button>}
        </div>
        <input ref={favInput} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" aria-label="Enviar favicon"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) readImage(file, (url) => { setBranding({ faviconDataUrl: url }); toast.push("success", "Favicon atualizado."); }, (m) => toast.push("danger", m));
          }} />
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => { resetBranding(); toast.push("info", "Identidade e aparência restauradas para o padrão."); }}>
          <RotateCcw size={15} /> Restaurar padrão de fábrica
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Aparência ---------------- */

function AppearanceTab() {
  const b = useBranding();
  const toast = useToast();

  return (
    <div className="space-y-5">
      <Card title="Tema de cores" action={<Badge tone="blue">muda o app inteiro</Badge>}>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
          {PRESETS.map((p) => {
            const active = b.presetId === p.id && !b.customPrimary;
            return (
              <button key={p.id} onClick={() => { setBranding({ presetId: p.id, customPrimary: null }); toast.push("success", `Tema “${p.label}” aplicado.`); }}
                className={cx("group rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5", active ? "border-pine-600 bg-pine-50 shadow-card" : "border-line bg-surface hover:border-pine-300")}
                aria-pressed={active}>
                <div className="flex gap-1.5">
                  {p.swatches.map((c) => <span key={c} className="h-7 flex-1 rounded-md" style={{ background: c }} />)}
                </div>
                <p className="mt-2.5 flex items-center justify-between text-[12.5px] font-bold text-ink">
                  {p.label}
                  {active && <Check size={14} className="text-pine-600" />}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Cor personalizada">
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 transition-colors hover:border-pine-400">
            <input type="color" value={b.customPrimary ?? "#0066ff"} aria-label="Escolher cor personalizada"
              onChange={(e) => setBranding({ customPrimary: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border-0 bg-transparent p-0" />
            <span className="text-[13px] font-semibold text-ink">{b.customPrimary ? b.customPrimary.toUpperCase() : "Escolha uma cor…"}</span>
          </label>
          <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">
            O sistema gera toda a escala de tons (botões, menu, gráficos, destaques) a partir da cor escolhida.
          </p>
          {b.customPrimary && (
            <Button size="sm" variant="outline" onClick={() => { setBranding({ customPrimary: null }); toast.push("info", "Voltando ao tema predefinido."); }}>
              <RotateCcw size={14} /> Usar tema predefinido
            </Button>
          )}
        </div>
      </Card>

      <Card title="Barra lateral">
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <Seg
            options={[{ id: "navy", label: "Azul escuro sólido" }, { id: "grad", label: "Gradiente da marca" }]}
            value={b.sidebarGradient ? "grad" : "navy"}
            onChange={(v) => { setBranding({ sidebarGradient: v === "grad" }); toast.push("success", v === "grad" ? "Sidebar com gradiente da marca." : "Sidebar sólida."); }}
          />
          <p className="text-[12.5px] text-ink-soft">O gradiente usa as três cores da marca (do tema atual).</p>
        </div>
      </Card>

      {/* Pré-visualização ao vivo */}
      <Card title="Pré-visualização ao vivo">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[220px_1fr]">
          <div className={cx("rounded-xl p-4", b.sidebarGradient ? "brand-grad" : "bg-pine-900")}>
            <Logo />
            <div className="mt-4 space-y-1">
              <p className="rounded-lg bg-leaf-400/15 px-3 py-1.5 text-[12px] font-semibold text-leaf-300 shadow-[inset_2px_0_0_0_var(--color-leaf-400)]">Dashboard</p>
              <p className="px-3 py-1.5 text-[12px] font-medium text-[#d9e8fb]">Vendas</p>
              <p className="px-3 py-1.5 text-[12px] font-medium text-[#d9e8fb]">Estoque</p>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-paper p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm"><Save size={13} /> Botão principal</Button>
              <Button size="sm" variant="outline">Secundário</Button>
              <Button size="sm" variant="soft">Suave</Button>
              <Badge tone="lime">Destaque</Badge>
              <Badge tone="green">Pago</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-surface p-3 shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Vendas hoje</p>
                <p className="tnum mt-1 font-display text-[18px] font-bold text-ink">{brl(1240.5)}</p>
              </div>
              <div className="rounded-lg bg-pine-900 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-pine-300">Lucro</p>
                <p className="tnum mt-1 font-display text-[18px] font-bold text-leaf-300">{brl(486.2)}</p>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] text-ink-faint">Tudo acima reage instantaneamente às suas escolhas — e já está valendo no app inteiro.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Negócios e usuários ---------------- */

function BusinessTab() {
  const { db } = useApp();
  if (!db) return null;
  const biz = db.business;
  const counts = [
    { l: "Produtos", v: db.products.length },
    { l: "Clientes", v: db.customers.length },
    { l: "Vendas", v: db.sales.length },
    { l: "Pedidos", v: db.orders.length },
    { l: "Despesas", v: db.expenses.length },
    { l: "Fornecedores", v: db.suppliers.length },
  ];
  return (
    <div className="space-y-5">
      <Card title="Negócio ativo neste dispositivo">
        {biz ? (
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-pine-900 font-display text-[22px] font-bold text-leaf-300">{biz.name.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[18px] font-bold text-ink">{biz.name}</p>
                <p className="text-[13px] text-ink-soft">{biz.segment} · vende {biz.sells.toLowerCase()} · catálogo em <code className="rounded bg-paper px-1.5 py-0.5 text-[12px] text-pine-700">/catalogo/{biz.slug}</code></p>
              </div>
              <Badge tone="green">{biz.onboarded ? "Configurado" : "Onboarding pendente"}</Badge>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {counts.map((c) => (
                <div key={c.l} className="rounded-xl border border-line bg-paper px-3 py-3 text-center">
                  <p className="tnum font-display text-[20px] font-bold text-ink">{c.v}</p>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{c.l}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="p-5 text-[13.5px] text-ink-soft">Nenhum negócio criado ainda neste dispositivo.</p>
        )}
      </Card>

      <Card title="Contas de acesso">
        <TableWrap className="rounded-none border-0 shadow-none">
          <thead><tr><Th>Nome</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Tipo</Th></tr></thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.id} className="hover:bg-pine-50/50">
                <Td className="font-semibold">{u.name}</Td>
                <Td className="text-ink-soft">{u.email}</Td>
                <Td>{ROLE_LABEL[u.role]}</Td>
                <Td>{u.super ? <Badge tone="pine"><ShieldCheck size={11} /> Sistema</Badge> : <Badge tone="gray">Negócio</Badge>}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ---------------- Segurança ---------------- */

function SecurityTab() {
  const { user, db, update } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!f.current || !f.next) return toast.push("danger", "Preencha todos os campos.");
    if (f.next.length < 6) return toast.push("danger", "A nova senha precisa de ao menos 6 caracteres.");
    if (f.next !== f.confirm) return toast.push("danger", "A confirmação não confere com a nova senha.");
    setBusy(true);
    const curHash = await hashPass(f.current);
    if (curHash !== user.passHash) { setBusy(false); return toast.push("danger", "Senha atual incorreta."); }
    const nextHash = await hashPass(f.next);
    update((d) => {
      const u = d.users.find((x) => x.id === user.id);
      if (u) u.passHash = nextHash;
    });
    setBusy(false);
    setF({ current: "", next: "", confirm: "" });
    toast.push("success", "Senha do administrador alterada com sucesso.");
  };

  return (
    <div className="space-y-5">
      <Card title="Acesso do sistema">
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="rounded-xl bg-pine-50 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-pine-800"><ShieldCheck size={14} /> Painel do Sistema</p>
            <p className="tnum mt-1.5 text-[13px] text-pine-700">admin@fluxo.app</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-pine-600/80">Este acesso controla o “esquema” do app (marca e tema) e tem visão total do negócio.</p>
          </div>
          <div className="rounded-xl bg-paper p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink"><KeyRound size={14} /> Boas práticas</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-[12px] text-ink-soft">
              <li>Senhas nunca são guardadas em texto puro (hash SHA-256).</li>
              <li>Troque a senha padrão após a implantação.</li>
              <li>Compartilhe o acesso do negócio, não o do sistema.</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Alterar senha do administrador">
        <form onSubmit={submit} className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <Field label="Senha atual"><Input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" /></Field>
          <Field label="Nova senha"><Input type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Confirmar nova senha"><Input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" /></Field>
          <div className="sm:col-span-3">
            <Button disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Save size={15} />} Salvar nova senha</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Dados e backup ---------------- */

function DataTab() {
  const { db, resetDemo, wipeAll, importDB } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportAll = () => {
    if (!db) return;
    download(`fluxo-backup-completo.json`, JSON.stringify(db, null, 2), "application/json");
    toast.push("success", "Backup completo exportado.");
  };

  const onImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (!data || !Array.isArray(data.products) || !Array.isArray(data.users)) throw new Error("inválido");
        importDB(data);
        toast.push("success", "Backup importado — dados substituídos com sucesso.");
      } catch {
        toast.push("danger", "Arquivo inválido. Use um backup JSON exportado pelo sistema.");
      }
    };
    r.readAsText(file);
  };

  return (
    <div className="space-y-5">
      <Card title="Backup completo">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <Button onClick={exportAll}><Download size={15} /> Exportar backup (JSON)</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> Importar backup</Button>
          <p className="w-full text-[12px] text-ink-faint sm:w-auto sm:flex-1">Inclui produtos, clientes, vendas, contas, configurações e identidade do app.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Importar backup"
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onImport(file); }} />
        </div>
      </Card>

      <Card title="Dados de demonstração">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <Button variant="soft" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Recarregar dados demo</Button>
          <p className="text-[12.5px] text-ink-soft">Restaura produtos, vendas e clientes de exemplo (mantém as contas de acesso).</p>
        </div>
      </Card>

      <Card title="Zona de perigo">
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <Button variant="danger" onClick={() => setConfirmWipe(true)}><AlertTriangle size={15} /> Apagar tudo e recomeçar</Button>
          <p className="text-[12.5px] text-ink-soft">Remove todos os dados e a personalização deste dispositivo. As contas padrão são recriadas.</p>
        </div>
      </Card>

      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} title="Recarregar demonstração?"
        msg="Os dados atuais do negócio serão substituídos pelos dados de exemplo. Esta ação não pode ser desfeita."
        yesLabel="Recarregar" onYes={() => { resetDemo(); toast.push("success", "Dados de demonstração recarregados."); }} />

      <Confirm open={confirmWipe} onClose={() => setConfirmWipe(false)} danger title="Apagar absolutamente tudo?"
        msg="Todos os negócios, usuários adicionais, dados e a personalização visual serão removidos deste dispositivo. O sistema voltará ao estado de fábrica."
        yesLabel="Apagar tudo" onYes={wipeAll} />
    </div>
  );
}

/* ---------------- Console ---------------- */

export default function AdminConsolePage() {
  const { navigate, logout, user } = useApp();
  const b = useBranding();
  const [tab, setTab] = useState<TabId>("identidade");
  const active = useMemo(() => TABS.find((t) => t.id === tab)!, [tab]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row">
      {/* Rail lateral do console */}
      <aside className="flex shrink-0 flex-col border-b border-pine-800 bg-pine-950 lg:w-[248px] lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between border-b border-pine-800/70 px-5">
          <Logo />
          <Badge tone="lime" className="hidden lg:inline-flex">SISTEMA</Badge>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2.5 lg:flex-1 lg:flex-col lg:gap-0.5 lg:py-4" aria-label="Seções do painel do sistema">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all lg:w-full",
                tab === t.id ? "bg-leaf-400/15 text-leaf-300 shadow-[inset_2px_0_0_0_var(--color-leaf-400)]" : "text-[#c7d8ee] hover:bg-pine-900 hover:text-white",
              )}
              aria-current={tab === t.id ? "page" : undefined}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-pine-800/70 p-3 lg:block">
          <p className="truncate px-2 text-[12px] font-semibold text-leaf-200">{user?.name}</p>
          <p className="px-2 text-[11px] text-pine-300">Administrador do Sistema</p>
          <div className="mt-2.5 flex gap-1.5">
            <button onClick={() => navigate("/dashboard")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-pine-900 px-2 py-2 text-[12px] font-bold text-leaf-300 transition-colors hover:bg-pine-800">
              <ExternalLink size={13} /> Abrir o app
            </button>
            <button onClick={logout} aria-label="Sair"
              className="flex items-center justify-center rounded-lg bg-pine-900 px-3 py-2 text-leaf-300 transition-colors hover:bg-danger hover:text-white">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">Painel do Sistema · {b.appName}</p>
              <h1 className="font-display text-[17px] font-bold leading-tight text-ink">{active.label}</h1>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}><ExternalLink size={13} /> App</Button>
              <Button size="sm" variant="ghost" onClick={logout} aria-label="Sair"><LogOut size={15} /></Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="animate-fade-up mb-5 text-[13.5px] text-ink-soft">{active.desc}. As alterações são <strong className="text-ink">salvas e aplicadas automaticamente</strong>.</p>
          <div key={tab} className="animate-fade-up">
            {tab === "identidade" && <IdentityTab />}
            {tab === "aparencia" && <AppearanceTab />}
            {tab === "negocio" && <BusinessTab />}
            {tab === "seguranca" && <SecurityTab />}
            {tab === "dados" && <DataTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
