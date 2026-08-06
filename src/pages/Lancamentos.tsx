import { useMemo, useState } from 'react';
import LancamentoForm from '../components/LancamentoForm';
import { useDataStore } from '../store/data';
import { brl, dataBonita } from '../lib/format';
import type { Lancamento } from '../types';

export default function Lancamentos() {
  const lancamentos = useDataStore((s) => s.lancamentos);
  const contas = useDataStore((s) => s.contas);
  const categorias = useDataStore((s) => s.categorias);
  const excluirLancamento = useDataStore((s) => s.excluirLancamento);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [filtroConta, setFiltroConta] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState(0);
  const [busca, setBusca] = useState('');

  const nomeConta = (id: number) => contas.find((c) => c.id === id)?.nome ?? '?';
  const nomeCategoria = (id: number | null) => (id ? categorias.find((c) => c.id === id)?.nome : null);

  const filtrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroConta && l.conta_id !== filtroConta && l.conta_destino_id !== filtroConta) return false;
      if (filtroCategoria && l.categoria_id !== filtroCategoria) return false;
      if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [lancamentos, filtroConta, filtroCategoria, busca]);

  const porMes = useMemo(() => {
    const mapa = new Map<string, Lancamento[]>();
    for (const l of [...filtrados].sort((a, b) => b.data.localeCompare(a.data))) {
      const chave = l.data.slice(0, 7);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(l);
    }
    return [...mapa.entries()];
  }, [filtrados]);

  const sinal = (l: Lancamento) =>
    l.tipo === 'receita' ? '+' : l.tipo === 'transferencia' ? '⇄' : '−';

  const corValor = (l: Lancamento) =>
    l.tipo === 'receita' ? 'text-primary' : l.tipo === 'despesa' ? 'text-danger' : 'text-ink-muted';

  const excluir = (l: Lancamento) => {
    excluirLancamento(l.id);
  };

  return (
    <div className="mx-auto max-w-lg p-5">
      <h1 className="font-display text-2xl font-bold">Lançamentos</h1>

      <div className="mt-4 flex flex-col gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição..."
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-primary" />
        <div className="flex gap-2">
          <select value={filtroConta} onChange={(e) => setFiltroConta(Number(e.target.value))}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 outline-none">
            <option value={0}>Todas as contas</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(Number(e.target.value))}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 outline-none">
            <option value={0}>Todas as categorias</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-6">
        {porMes.length === 0 && <p className="text-sm text-ink-muted">Nenhum lançamento encontrado.</p>}
        {porMes.map(([mes, lista]) => {
          const total = lista.reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
          return (
            <div key={mes}>
              <div className="flex items-baseline justify-between border-b border-line pb-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{mes}</h2>
                <span className="num text-sm font-semibold">{brl(total)}</span>
              </div>
              <div className="mt-1 flex flex-col">
                {lista.map((l) => {
                  const cat = nomeCategoria(l.categoria_id);
                  return (
                    <div key={l.id} className="flex items-center gap-3 border-b border-line/50 py-2.5">
                      <span className={`w-5 text-center ${corValor(l)}`}>{sinal(l)}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{l.descricao || nomeConta(l.conta_id)}</p>
                        <p className="text-xs text-ink-muted">
                          {dataBonita(l.data)} · {nomeConta(l.conta_id)}
                          {l.tipo === 'transferencia' && ` → ${nomeConta(l.conta_destino_id!)}`}
                          {cat && ` · ${cat}`}
                        </p>
                      </div>
                      <span className={`num text-sm font-semibold ${corValor(l)}`}>{sinal(l)}{brl(l.valor)}</span>
                      <button onClick={() => { setEditando(l); setAberto(true); }} className="text-xs text-ink-muted">✎</button>
                      <button onClick={() => excluir(l)} className="text-xs text-danger">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => { setEditando(null); setAberto(true); }}
        className="fixed bottom-[calc(5rem_+_env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-lg"
      >
        +
      </button>

      <LancamentoForm aberto={aberto} onFechar={() => setAberto(false)} lancamento={editando} onSalvo={() => setEditando(null)} />
    </div>
  );
}
