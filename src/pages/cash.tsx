/* ============================================================
 * Fluxo — Caixa, Fluxo de caixa e Lucro
 * ============================================================ */
import { useMemo, useState } from "react";
import { Lock, Unlock, Wallet, ArrowDownToLine, ArrowUpFromLine, PiggyBank, TrendingUp } from "lucide-react";
import { useApp } from "../store";
import { brl, cx, fmtDate, numParse, todayISO, presetRange, RANGE_PRESETS } from "../lib/utils";
import { openCash, closeCash, cashflowSeries, profitSeries, dashStats, openSession, R } from "../lib/services";
import type { Granularity } from "../lib/services";
import { Button, Badge, Card, Empty, Field, Input, Modal, Seg, Select, TableWrap, Th, Td, useToast, PageHead, Money, Textarea } from "../components/ui";
import { FluxoChart, LucroChart, MarginLine } from "../components/charts";

/* ---------------- Caixa ---------------- */

export function CashPage() {
  const { db, update } = useApp();
  const toast = useToast();
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [moveModal, setMoveModal] = useState<null | "in" | "out">(null);
  const [opening, setOpening] = useState("200,00");
  const [counted, setCounted] = useState("");
  const [mv, setMv] = useState({ desc: "", amount: "", method: "Dinheiro" });
  const [dirFlt, setDirFlt] = useState<"todas" | "in" | "out">("todas");

  if (!db) return null;
  const session = openSession(db);
  const moves = db.cashMoves.filter((m) => m.sessionId === (session?.id ?? "—") && (dirFlt === "todas" || m.dir === dirFlt));
  const totalIn = R(moves.filter((m) => m.dir === "in").reduce((s, m) => s + m.amount, 0));
  const totalOut = R(moves.filter((m) => m.dir === "out").reduce((s, m) => s + m.amount, 0));
  const expected = session ? R(session.opening + totalIn - totalOut) : 0;
  const byMethod: Record<string, number> = {};
  for (const m of db.cashMoves.filter((m) => m.sessionId === session?.id && m.dir === "in")) {
    byMethod[m.method] = R((byMethod[m.method] ?? 0) + m.amount);
  }
  const countedVal = counted ? numParse(counted) : expected;
  const diff = R(countedVal - expected);

  return (
    <div className="animate-fade-up">
      <PageHead title="Caixa" desc="Abra o caixa, acompanhe o dia e feche com o resumo completo." />

      {!session ? (
        <Empty icon={<Wallet size={26} />} title="O caixa está fechado."
          desc="Abra o caixa informando o saldo inicial para registrar as movimentações do dia."
          action={<Button size="lg" onClick={() => setOpenModal(true)}><Unlock size={16} /> Abrir caixa</Button>} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="col-span-2 rounded-xl bg-pine-900 p-5 text-leaf-200 shadow-card lg:col-span-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-pine-300"><span className="animate-pulse-dot h-2 w-2 rounded-full bg-leaf-400" /> Caixa aberto</p>
              <p className="mt-2 font-display text-[15px] font-bold text-leaf-300">{fmtDate(session.openDate)}</p>
              <p className="text-[11.5px] text-pine-300">desde {new Date(session.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="dark" className="bg-leaf-400 text-pine-950 hover:bg-leaf-500" onClick={() => { setCounted(String(expected).replace(".", ",")); setCloseModal(true); }}>
                  <Lock size={13} /> Fechar caixa
                </Button>
              </div>
            </div>
            {[
              { l: "Saldo inicial", v: brl(session.opening) },
              { l: "Entradas", v: brl(totalIn), cls: "text-pine-600" },
              { l: "Saídas", v: brl(totalOut), cls: "text-danger" },
              { l: "Saldo esperado", v: brl(expected), cls: "font-display" },
            ].map((s) => (
              <Card key={s.l} className="p-4">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">{s.l}</p>
                <p className={cx("tnum mt-1.5 font-display text-[20px] font-bold", s.cls)}>{s.v}</p>
              </Card>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Seg options={[{ id: "todas" as const, label: "Todas" }, { id: "in" as const, label: "Entradas" }, { id: "out" as const, label: "Saídas" }]} value={dirFlt} onChange={setDirFlt} />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setMoveModal("out"); setMv({ desc: "", amount: "", method: "Dinheiro" }); }}><ArrowUpFromLine size={14} /> Retirada</Button>
              <Button variant="outline" size="sm" onClick={() => { setMoveModal("in"); setMv({ desc: "", amount: "", method: "Dinheiro" }); }}><ArrowDownToLine size={14} /> Reforço</Button>
            </div>
          </div>

          {moves.length === 0 ? (
            <Empty title="Nenhuma movimentação ainda" desc="Vendas, pagamentos e despesas do dia aparecem aqui automaticamente." />
          ) : (
            <TableWrap>
              <thead><tr><Th>Horário</Th><Th>Descrição</Th><Th>Forma</Th><Th right>Valor</Th></tr></thead>
              <tbody>
                {moves.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-pine-50/40">
                    <Td className="text-[12px] text-ink-faint">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Td>
                    <Td className="font-semibold">{m.description}</Td>
                    <Td><Badge tone="gray">{m.method}</Badge></Td>
                    <Td right>
                      <Money value={m.dir === "in" ? m.amount : -m.amount} className={cx("font-bold", m.dir === "in" ? "text-pine-600" : "text-danger")} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir caixa" size="sm"
        footer={<><Button variant="ghost" onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={() => { update((d) => openCash(d, numParse(opening))); toast.push("success", "Caixa aberto. Boas vendas!"); setOpenModal(false); }}><Unlock size={15} /> Abrir caixa</Button></>}>
        <Field label="Saldo inicial (R$)" hint="Dinheiro em caixa para começar o dia (troco)">
          <Input autoFocus inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Fechar caixa — resumo do dia" size="md"
        footer={<><Button variant="ghost" onClick={() => setCloseModal(false)}>Cancelar</Button>
          <Button onClick={() => { update((d) => closeCash(d, countedVal)); toast.push("success", "Caixa fechado com resumo salvo."); setCloseModal(false); }}><Lock size={15} /> Confirmar fechamento</Button></>}>
        {session && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: "Saldo inicial", v: brl(session.opening) },
                { l: "Total de entradas", v: brl(totalIn) },
                ...Object.entries(byMethod).map(([m, v]) => ({ l: `· ${m}`, v: brl(v) })),
                { l: "Despesas e retiradas", v: brl(totalOut) },
                { l: "Saldo final esperado", v: brl(expected) },
              ].map((s, i) => (
                <div key={i} className="rounded-lg bg-paper px-3 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">{s.l}</p>
                  <p className="tnum text-[14px] font-bold">{s.v}</p>
                </div>
              ))}
            </div>
            <Field label="Valor contado em caixa (R$)">
              <Input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} />
            </Field>
            <div className={cx("rounded-lg px-3.5 py-2.5 text-[13.5px] font-bold", Math.abs(diff) < 0.01 ? "bg-pine-50 text-pine-700" : diff < 0 ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}>
              Diferença de caixa: {brl(diff)} {Math.abs(diff) < 0.01 ? "— conferido!" : diff < 0 ? "(faltou dinheiro)" : "(sobrou dinheiro)"}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!moveModal} onClose={() => setMoveModal(null)} title={moveModal === "in" ? "Reforço de caixa" : "Retirada de caixa"} size="sm"
        footer={<><Button variant="ghost" onClick={() => setMoveModal(null)}>Cancelar</Button>
          <Button onClick={() => {
            const amount = numParse(mv.amount);
            if (amount <= 0) return toast.push("danger", "Informe um valor válido.");
            if (!mv.desc.trim()) return toast.push("danger", "Descreva a movimentação.");
            update((d) => {
              d.cashMoves.unshift({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), sessionId: session?.id ?? "avulso",
                dir: moveModal === "in" ? "in" : "out", description: mv.desc.trim(), amount: R(amount),
                method: mv.method, date: todayISO(), refType: "manual", createdAt: new Date().toISOString(),
              });
            });
            toast.push("success", "Movimentação registrada.");
            setMoveModal(null);
          }}>Registrar</Button></>}>
        <div className="space-y-4">
          <Field label="Descrição"><Input autoFocus value={mv.desc} onChange={(e) => setMv({ ...mv, desc: e.target.value })} placeholder={moveModal === "in" ? "Ex.: troco extra" : "Ex.: pagamento de motoboy"} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor (R$)"><Input inputMode="decimal" value={mv.amount} onChange={(e) => setMv({ ...mv, amount: e.target.value })} placeholder="0,00" /></Field>
            <Field label="Forma">
              <Select value={mv.method} onChange={(e) => setMv({ ...mv, method: e.target.value })}>
                {(db?.settings.methods ?? []).filter((m) => m !== "Fiado").map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Fluxo de caixa ---------------- */

export function CashflowPage() {
  const { db } = useApp();
  const [gran, setGran] = useState<Granularity>("diario");
  const data = useMemo(() => (db ? cashflowSeries(db, gran, gran === "diario" ? 30 : gran === "semanal" ? 84 : gran === "mensal" ? 365 : 1500) : []), [db, gran]);
  if (!db) return null;
  const totalIn = R(data.reduce((s, x) => s + x.in, 0));
  const totalOut = R(data.reduce((s, x) => s + x.out, 0));
  const prevIn = R(data.reduce((s, x) => s + x.pIn, 0));
  const prevOut = R(data.reduce((s, x) => s + x.pOut, 0));

  return (
    <div className="animate-fade-up">
      <PageHead title="Fluxo de caixa" desc="Entradas, saídas e saldo — com previsão baseada nas contas futuras.">
        <Seg options={[{ id: "diario" as const, label: "Diário" }, { id: "semanal" as const, label: "Semanal" }, { id: "mensal" as const, label: "Mensal" }, { id: "anual" as const, label: "Anual" }]} value={gran} onChange={setGran} />
      </PageHead>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Entradas no período</p><p className="tnum mt-1 font-display text-[20px] font-bold text-pine-600">{brl(totalIn)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Saídas no período</p><p className="tnum mt-1 font-display text-[20px] font-bold text-danger">{brl(totalOut)}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Saldo do período</p><p className="tnum mt-1 font-display text-[20px] font-bold">{brl(R(totalIn - totalOut))}</p></Card>
        <Card className="p-4"><p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">Previsão futura</p>
          <p className="tnum mt-1 font-display text-[20px] font-bold text-info">{brl(R(prevIn - prevOut))}</p>
          <p className="text-[11px] text-ink-faint">a receber {brl(prevIn)} · a pagar {brl(prevOut)}</p>
        </Card>
      </div>
      <Card title="Movimentações e previsão">
        <div className="p-4"><FluxoChart data={data} /></div>
        <p className="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
          Barras claras são a <strong>previsão financeira</strong>: contas a receber e a pagar com vencimento futuro.
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Lucro ---------------- */

export function ProfitPage() {
  const { db } = useApp();
  const [preset, setPreset] = useState("mes");
  const range = useMemo(() => presetRange(preset), [preset]);
  const stats = useMemo(() => (db ? dashStats(db, range) : null), [db, range]);
  const series = useMemo(() => (db ? profitSeries(db, 6) : []), [db]);
  if (!db || !stats) return null;

  return (
    <div className="animate-fade-up">
      <PageHead title="Lucro" desc="Faturamento − custo dos produtos − despesas = lucro líquido estimado.">
        <Seg options={RANGE_PRESETS.slice(0, 5).map((p) => ({ id: p.id, label: p.label }))} value={preset as never} onChange={(v) => setPreset(v as string)} />
      </PageHead>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: "Faturamento", v: brl(stats.faturamento), cls: "" },
          { l: "Custo dos produtos (CMV)", v: brl(stats.cmv), cls: "text-danger" },
          { l: "Despesas pagas", v: brl(stats.despesas), cls: "text-danger" },
          { l: "Lucro líquido estimado", v: brl(stats.lucro), cls: stats.lucro >= 0 ? "text-pine-600" : "text-danger" },
          { l: "Margem de lucro", v: `${stats.margem.toFixed(1).replace(".", ",")}%`, cls: stats.margem >= 20 ? "text-pine-600" : "text-warn" },
        ].map((s) => (
          <Card key={s.l} className="p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">{s.l}</p>
            <p className={cx("tnum mt-1.5 font-display text-[19px] font-bold", s.cls)}>{s.v}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Evolução — faturamento × lucro (6 meses)">
          <div className="p-4"><LucroChart data={series} /></div>
        </Card>
        <Card title="Evolução da margem de lucro">
          <div className="p-4"><MarginLine data={series} /></div>
          <p className="border-t border-line px-4 py-3 text-[12px] text-ink-faint">
            Margem saudável costuma ficar acima de 20%. Abaixo disso, reveja preços e custos.
          </p>
        </Card>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-pine-900 px-5 py-4 text-leaf-200 shadow-card">
        <PiggyBank size={22} className="shrink-0 text-leaf-400" />
        <p className="text-[13.5px]">
          {stats.lucro >= 0
            ? <>Seu negócio gerou <strong className="text-leaf-300">{brl(stats.lucro)}</strong> de lucro estimado no período — {stats.margem.toFixed(1).replace(".", ",")}% de cada R$ 100 vendidos viraram lucro.</>
            : <>Atenção: o resultado do período está negativo em <strong className="text-danger">{brl(Math.abs(stats.lucro))}</strong>. Vale revisar preços, custos e despesas fixas.</>}
        </p>
        <TrendingUp size={20} className="ml-auto hidden shrink-0 text-leaf-400 sm:block" />
      </div>
    </div>
  );
}
