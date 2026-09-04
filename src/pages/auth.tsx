/* ============================================================
 * Fluxo — Login, cadastro e onboarding
 * ============================================================ */
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, Rocket, Sparkles, Store } from "lucide-react";
import { useApp } from "../store";
import { Button, Field, Input, Select, Spinner, useToast } from "../components/ui";
import { Logo } from "../components/layout";
import { SEGMENTS, SELL_TYPES } from "../lib/types";
import { brl } from "../lib/utils";

function AuthFrame({ children, side }: { children: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="brand-grad relative hidden w-[46%] flex-col justify-between overflow-hidden p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #4fc8ff 1px, transparent 0)", backgroundSize: "26px 26px" }}
        />
        <div className="relative"><Logo /></div>
        <div className="relative">{side}</div>
        <p className="relative text-[12px] text-pine-400">Dados armazenados localmente no seu dispositivo · Pronto para evoluir para nuvem</p>
      </aside>
      <main className="flex flex-1 items-center justify-center bg-paper px-4 py-10">
        <div className="animate-fade-up w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

function AuthSide() {
  const { db } = useApp();
  const todaySales = db?.sales.filter((s) => s.status !== "cancelada" && s.date === new Date().toISOString().slice(0, 10)) ?? [];
  const total = todaySales.reduce((s, v) => s + v.total, 0);
  return (
    <div>
      <h1 className="font-display text-[34px] font-bold leading-tight text-leaf-200">
        Administre seu negócio <span className="text-leaf-400">sem complicação.</span>
      </h1>
      <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-pine-200">
        Vendas, estoque, fiado, caixa e lucro em um só lugar — feito para quem não tem tempo a perder com planilha.
      </p>
      <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
        <div className="rounded-xl bg-pine-800/80 p-4 ring-1 ring-pine-700">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-pine-300">Vendas hoje</p>
          <p className="tnum mt-1.5 font-display text-[19px] font-bold text-leaf-300">{brl(total)}</p>
        </div>
        <div className="rounded-xl bg-pine-800/80 p-4 ring-1 ring-pine-700">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-pine-300">Produtos</p>
          <p className="tnum mt-1.5 font-display text-[19px] font-bold text-leaf-300">{db?.products.length ?? 0}</p>
        </div>
        <div className="rounded-xl bg-pine-800/80 p-4 ring-1 ring-pine-700">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-pine-300">Pedidos novos</p>
          <p className="tnum mt-1.5 font-display text-[19px] font-bold text-leaf-300">{db?.orders.filter((o) => o.status === "novo").length ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, loginDemo, navigate } = useApp();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [f, setF] = useState({ name: "", email: "", pass: "", business: "", segment: SEGMENTS[0], sells: SELL_TYPES[0] });
  const [err, setErr] = useState<Record<string, string>>({});

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr({});
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setErr({ email: "E-mail inválido." });
    if (!f.pass) return setErr({ pass: "Informe a senha." });
    setBusy(true);
    const error = await login(f.email, f.pass);
    setBusy(false);
    if (error) return setErr({ form: error });
    toast.push("success", "Bem-vindo de volta!");
    navigate("/dashboard");
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr({});
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Informe seu nome.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) errs.email = "E-mail inválido.";
    if (f.pass.length < 6) errs.pass = "Mínimo de 6 caracteres.";
    if (!f.business.trim()) errs.business = "Informe o nome do negócio.";
    if (Object.keys(errs).length) return setErr(errs);
    setBusy(true);
    const error = await signupSafe();
    setBusy(false);
    if (error) return setErr({ form: error });
    toast.push("success", "Conta criada! Vamos configurar seu negócio.");
    navigate("/onboarding");
  };

  const app = useApp();
  const signupSafe = () => app.signup({ name: f.name, email: f.email, pass: f.pass, business: f.business, segment: f.segment, sells: f.sells });

  return (
    <AuthFrame side={<AuthSide />}>
      <div className="mb-7 lg:hidden"><Logo tone="light" /></div>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        {mode === "forgot" ? (
          <>
            <h2 className="font-display text-[22px] font-bold">Recuperar senha</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              Nesta versão os dados ficam no seu dispositivo, então não há envio de e-mail ainda.
              Use a <strong>conta de demonstração</strong> abaixo ou crie uma nova conta.
            </p>
            <div className="mt-5 rounded-lg bg-pine-50 p-4 text-[13px] text-pine-800">
              <p className="font-bold">Conta demo</p>
              <p className="tnum mt-1">demo@fluxo.app · demo123</p>
            </div>
            <Button variant="outline" className="mt-5 w-full" onClick={() => setMode("login")}>
              <ArrowLeft size={15} /> Voltar para o login
            </Button>
          </>
        ) : (
          <>
            <div className="mb-6 flex rounded-lg border border-line bg-paper p-1">
              {(["login", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setErr({}); }}
                  className={`flex-1 rounded-md py-2 text-[13px] font-bold transition-all ${mode === m ? "bg-pine-900 text-leaf-300 shadow-sm" : "text-ink-soft hover:text-ink"}`}>
                  {m === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            <h2 className="font-display text-[22px] font-bold">{mode === "login" ? "Que bom te ver de novo" : "Comece em menos de 1 minuto"}</h2>
            <p className="mt-1 text-[13.5px] text-ink-soft">{mode === "login" ? "Acesse o painel do seu negócio." : "Crie sua conta e o espaço do seu negócio."}</p>

            {err.form && <p className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13px] font-semibold text-danger">{err.form}</p>}

            <form onSubmit={mode === "login" ? doLogin : doSignup} className="mt-5 space-y-4" noValidate>
              {mode === "signup" && (
                <Field label="Seu nome" error={err.name}>
                  <Input value={f.name} invalid={!!err.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Como devemos te chamar?" autoComplete="name" />
                </Field>
              )}
              <Field label="E-mail" error={err.email}>
                <Input type="email" value={f.email} invalid={!!err.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="voce@negocio.com" autoComplete="email" />
              </Field>
              <Field label="Senha" error={err.pass}>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} value={f.pass} invalid={!!err.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"} autoComplete={mode === "login" ? "current-password" : "new-password"} className="pr-10" />
                  <button type="button" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {mode === "signup" && (
                <>
                  <Field label="Nome do negócio" error={err.business}>
                    <Input value={f.business} invalid={!!err.business} onChange={(e) => setF({ ...f, business: e.target.value })} placeholder="Ex.: Aurora Store" />
                  </Field>
                  <Field label="Tipo de negócio">
                    <Select value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })}>
                      {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
                    </Select>
                  </Field>
                </>
              )}
              <Button size="lg" className="w-full" disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : mode === "login" ? <ArrowRight size={16} /> : <Sparkles size={16} />}
                {mode === "login" ? "Entrar no painel" : "Criar conta grátis"}
              </Button>
            </form>

            {mode === "login" && (
              <>
                <button className="mt-3 w-full text-center text-[12.5px] font-semibold text-ink-soft hover:text-pine-700" onClick={() => setMode("forgot")}>
                  <KeyRound size={12} className="mr-1 inline" /> Esqueci minha senha
                </button>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" /><span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">ou</span><span className="h-px flex-1 bg-line" />
                </div>
                <Button variant="soft" className="w-full" disabled={busy} onClick={async () => { await loginDemo(); toast.push("success", "Você entrou no negócio de demonstração."); navigate("/dashboard"); }}>
                  <Store size={16} /> Explorar com dados de demonstração
                </Button>
              </>
            )}
          </>
        )}
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-faint">Suas senhas nunca são armazenadas em texto puro.</p>
    </AuthFrame>
  );
}

/* ---------------- Onboarding ---------------- */

export function OnboardingPage() {
  const { db, finishOnboarding, navigate } = useApp();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    name: db?.business?.name ?? "",
    segment: db?.business?.segment ?? SEGMENTS[0],
    sells: db?.business?.sells ?? SELL_TYPES[0],
    addProducts: "yes",
  });
  const [done, setDone] = useState(false);

  const steps = ["Seu negócio", "Segmento", "O que você vende", "Produtos"];

  const next = () => {
    if (step === 0 && !f.name.trim()) { toast.push("danger", "Digite o nome do seu negócio."); return; }
    if (step < 3) setStep(step + 1);
    else {
      finishOnboarding({ name: f.name.trim(), segment: f.segment, sells: f.sells });
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-pine-900 px-4">
        <div className="animate-scale-in w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-pop">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf-400 text-pine-950">
            <Check size={30} strokeWidth={3} />
          </span>
          <h1 className="mt-5 font-display text-[26px] font-bold">Seu negócio está pronto.</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            O painel de <strong>{f.name}</strong> foi configurado. Agora é só registrar a primeira venda.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => navigate(f.addProducts === "yes" ? "/produtos?novo=1" : "/dashboard")}>
            <Rocket size={17} /> {f.addProducts === "yes" ? "Cadastrar produtos agora" : "Ir para o Dashboard"}
          </Button>
          {f.addProducts === "yes" && (
            <button className="mt-3 text-[13px] font-semibold text-ink-soft hover:text-pine-700" onClick={() => navigate("/dashboard")}>
              Deixar para depois
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex h-16 items-center justify-between border-b border-line px-5">
        <Logo />
        <span className="text-[12.5px] font-semibold text-ink-soft">Passo {step + 1} de 4</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10">
        <div className="animate-fade-up" key={step}>
          <div className="mb-7 flex gap-1.5">
            {steps.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-pine-600" : "bg-line"}`} />
            ))}
          </div>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-pine-600">{steps[step]}</p>
          <h1 className="mt-1 font-display text-[26px] font-bold sm:text-[30px]">
            {step === 0 && "Qual o nome do seu negócio?"}
            {step === 1 && "Qual o segmento?"}
            {step === 2 && "Você vende produtos, serviços ou ambos?"}
            {step === 3 && "Deseja cadastrar produtos agora?"}
          </h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            {step === 0 && "É assim que ele vai aparecer no painel e no catálogo online."}
            {step === 1 && "Isso nos ajuda a deixar tudo com a sua cara."}
            {step === 2 && "Você pode alterar isso quando quiser."}
            {step === 3 && "Você pode importar por CSV depois, se preferir."}
          </p>

          <div className="mt-7">
            {step === 0 && (
              <Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Aurora Store" className="h-13 text-[17px]" onKeyDown={(e) => e.key === "Enter" && next()} />
            )}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {SEGMENTS.map((s) => (
                  <button key={s} onClick={() => setF({ ...f, segment: s })}
                    className={`rounded-xl border px-3 py-3.5 text-[13.5px] font-semibold transition-all ${f.segment === s ? "border-pine-600 bg-pine-50 text-pine-800 shadow-sm" : "border-line bg-surface text-ink-soft hover:border-pine-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-2.5 sm:grid-cols-3">
                {SELL_TYPES.map((s) => (
                  <button key={s} onClick={() => setF({ ...f, sells: s })}
                    className={`rounded-xl border px-3 py-5 text-[14.5px] font-bold transition-all ${f.sells === s ? "border-pine-600 bg-pine-50 text-pine-800 shadow-sm" : "border-line bg-surface text-ink-soft hover:border-pine-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[{ id: "yes", t: "Sim, quero cadastrar", d: "Vou direto para a tela de produtos." }, { id: "no", t: "Agora não", d: "Quero ver o painel primeiro." }].map((o) => (
                  <button key={o.id} onClick={() => setF({ ...f, addProducts: o.id })}
                    className={`rounded-xl border p-5 text-left transition-all ${f.addProducts === o.id ? "border-pine-600 bg-pine-50 shadow-sm" : "border-line bg-surface hover:border-pine-300"}`}>
                    <span className={`block text-[15px] font-bold ${f.addProducts === o.id ? "text-pine-800" : "text-ink"}`}>{o.t}</span>
                    <span className="mt-1 block text-[12.5px] text-ink-soft">{o.d}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-9 flex items-center justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate("/login") : setStep(step - 1))}>
            <ArrowLeft size={15} /> Voltar
          </Button>
          <Button size="lg" onClick={next}>
            {step === 3 ? "Concluir" : "Continuar"} <ArrowRight size={16} />
          </Button>
        </div>
      </main>
    </div>
  );
}
