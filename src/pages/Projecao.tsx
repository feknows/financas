import { useMemo } from 'react';
import {
  BarChart, Bar, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useDataStore } from '../store/data';
import { projetar6meses, patrimonio } from '../lib/finance';
import { brl, hojeISO } from '../lib/format';

export default function Projecao() {
  const contas = useDataStore((s) => s.contas);
  const lancamentos = useDataStore((s) => s.lancamentos);
  const recorrentes = useDataStore((s) => s.recorrentes);

  const dados = useMemo(() => {
    const proj = projetar6meses(contas, lancamentos, recorrentes, hojeISO());
    return proj.map((p) => ({ mes: p.mes.slice(5).replace('-', '/'), saldo: p.saldo }));
  }, [contas, lancamentos, recorrentes]);

  const atual = patrimonio(contas, lancamentos);

  return (
    <div className="mx-auto max-w-lg p-5">
      <h1 className="font-display text-2xl font-bold">Projeção</h1>
      <p className="mt-1 text-sm text-ink-muted">Saldo projetado considerando suas recorrentes.</p>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Patrimônio atual</p>
        <p className="num text-3xl font-bold text-primary">{brl(atual)}</p>
      </div>

      <div className="mt-4 h-64 rounded-2xl border border-line bg-surface p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#d8cfbe" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6f675c' }} axisLine={{ stroke: '#d8cfbe' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6f675c' }} tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(1)}k`} axisLine={false} tickLine={false} width={56} />
            <Tooltip formatter={(v: number) => [brl(v), 'Saldo']} />
            <ReferenceLine y={atual} stroke="#c8792a" strokeDasharray="4 4" />
            <Bar dataKey="saldo" fill="#12805d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {dados.map((d) => (
          <div key={d.mes} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5">
            <span className="text-sm font-medium">{d.mes}</span>
            <span className="num text-sm font-semibold">{brl(d.saldo)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
