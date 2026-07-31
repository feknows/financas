import { useMemo } from 'react';
import { useDataStore } from '../store/data';
import { patrimonio, saldoConta, faturaMes, calcularProgresso, depositoSugerido } from '../lib/finance';
import { brl, nomeMes, hojeISO } from '../lib/format';
import BarraProgresso from '../components/BarraProgresso';

export default function VisaoGeral() {
  const contas = useDataStore((s) => s.contas);
  const lancamentos = useDataStore((s) => s.lancamentos);
  const metas = useDataStore((s) => s.metas);
  const limites = useDataStore((s) => s.limites);
  const categorias = useDataStore((s) => s.categorias);

  const agora = new Date();
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const nomeMesAtual = nomeMes(agora.getFullYear(), agora.getMonth() + 1);

  const dados = useMemo(() => {
    const doMes = lancamentos.filter((l) => l.data.startsWith(mes));
    const receitas = doMes.filter((l) => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0);
    const despesas = doMes.filter((l) => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0);
    const cartoes = contas.filter((c) => c.tipo === 'cartao');
    const fatura = cartoes.reduce((a, c) => a + faturaMes(c.id, lancamentos, mes).fatura, 0);
    return { receitas, despesas, fatura };
  }, [lancamentos, contas, mes]);

  const patrim = patrimonio(contas, lancamentos);
  const cartoes = contas.filter((c) => c.tipo === 'cartao');
  const demais = contas.filter((c) => c.tipo !== 'cartao');
  const hoje = hojeISO();

  const metasEmAndamento = metas.filter((m) => {
    const conta = contas.find((c) => c.id === m.conta_id);
    const atual = conta ? saldoConta(conta, lancamentos) : 0;
    return atual < m.valor_alvo;
  });

  const alertas = limites
    .map((lim) => {
      const total = lancamentos
        .filter((l) => l.tipo === 'despesa' && l.categoria_id === lim.categoria_id && l.data.startsWith(mes))
        .reduce((a, l) => a + l.valor, 0);
      const p = calcularProgresso(total, lim.valor_mensal);
      const cat = categorias.find((c) => c.id === lim.categoria_id);
      return { lim, p, cat };
    })
    .filter((x) => x.p.percentual >= 0.8);

  return (
    <div className="mx-auto max-w-lg p-5">
      <h1 className="font-display text-2xl font-bold">Visão Geral</h1>
      <p className="text-sm capitalize text-ink-muted">{nomeMesAtual}</p>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Patrimônio</p>
        <p className="num text-4xl font-bold text-primary">{brl(patrim)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-ink-muted">Receitas</p>
            <p className="num text-lg font-semibold text-primary">+{brl(dados.receitas)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Despesas</p>
            <p className="num text-lg font-semibold text-danger">−{brl(dados.despesas)}</p>
          </div>
        </div>
        {dados.fatura > 0 && (
          <p className="num mt-2 text-xs text-ink-muted">Fatura do cartão no mês: {brl(dados.fatura)}</p>
        )}
      </div>

      {demais.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Contas</h2>
          <div className="mt-2 flex flex-col gap-2">
            {demais.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                <span className="text-sm font-medium">{c.nome}</span>
                <span className="num text-sm font-semibold">{brl(saldoConta(c, lancamentos))}</span>
              </div>
            ))}
            {cartoes.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
                <span className="text-sm font-medium">{c.nome}</span>
                <span className="num text-sm font-semibold text-danger">{brl(faturaMes(c.id, lancamentos, mes).fatura)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Alertas de limite</h2>
          <div className="mt-2 flex flex-col gap-3">
            {alertas.map(({ lim, p, cat }) => (
              <div key={lim.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat?.nome ?? '?'}</span>
                  <span className="num text-sm font-semibold">{Math.round(p.percentual * 100)}%</span>
                </div>
                <div className="mt-1.5">
                  <BarraProgresso percentual={p.percentual} cor={p.estourou ? '#c0392b' : '#c8792a'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metasEmAndamento.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Metas</h2>
          <div className="mt-2 flex flex-col gap-3">
            {metasEmAndamento.map((m) => {
              const conta = contas.find((c) => c.id === m.conta_id);
              const atual = conta ? saldoConta(conta, lancamentos) : 0;
              const progresso = m.valor_alvo > 0 ? atual / m.valor_alvo : 0;
              const sugerido = depositoSugerido(m.valor_alvo, atual, m.data_alvo, hoje);
              return (
                <div key={m.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.nome}</span>
                    <span className="num text-sm font-semibold">{brl(atual)} / {brl(m.valor_alvo)}</span>
                  </div>
                  <div className="mt-1.5">
                    <BarraProgresso percentual={progresso} cor={m.cor} />
                  </div>
                  {m.data_alvo && (
                    <p className="num mt-1 text-xs text-ink-muted">Depósito sugerido: {brl(sugerido)}/mês</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
