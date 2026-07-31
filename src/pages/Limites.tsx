import { useState } from 'react';
import Modal from '../components/Modal';
import BarraProgresso from '../components/BarraProgresso';
import { useDataStore } from '../store/data';
import { calcularProgresso } from '../lib/finance';
import { brl, nomeMes } from '../lib/format';

export default function Limites() {
  const limites = useDataStore((s) => s.limites);
  const categorias = useDataStore((s) => s.categorias);
  const lancamentos = useDataStore((s) => s.lancamentos);
  const salvarLimite = useDataStore((s) => s.salvarLimite);
  const excluirLimite = useDataStore((s) => s.excluirLimite);

  const [aberto, setAberto] = useState(false);
  const [categoriaId, setCategoriaId] = useState(0);
  const [valor, setValor] = useState('');
  const [msg, setMsg] = useState('');

  const agora = new Date();
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const categoriasDespesa = categorias.filter((c) => c.tipo === 'despesa');

  const gastoDoMes = (catId: number) =>
    lancamentos
      .filter((l) => l.tipo === 'despesa' && l.categoria_id === catId && l.data.startsWith(mes))
      .reduce((acc, l) => acc + l.valor, 0);

  const salvar = async () => {
    const v = parseFloat(valor.replace(',', '.'));
    if (!categoriaId) { setMsg('Selecione uma categoria.'); return; }
    if (!v || v <= 0) { setMsg('Informe um valor maior que zero.'); return; }
    try {
      await salvarLimite({ categoria_id: categoriaId, valor_mensal: v });
      setAberto(false);
    } catch { setMsg('Erro ao salvar.'); }
  };

  return (
    <div className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Limites</h1>
        <button onClick={() => { setCategoriaId(0); setValor(''); setMsg(''); setAberto(true); }}
          className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">+ Limite</button>
      </div>

      <p className="mt-2 text-sm text-ink-muted">Limite mensal por categoria — {nomeMes(agora.getFullYear(), agora.getMonth() + 1)}.</p>

      <div className="mt-5 flex flex-col gap-3">
        {limites.length === 0 && <p className="text-sm text-ink-muted">Nenhum limite definido.</p>}
        {limites.map((lim) => {
          const cat = categorias.find((c) => c.id === lim.categoria_id);
          const total = gastoDoMes(lim.categoria_id);
          const p = calcularProgresso(total, lim.valor_mensal);
          const cor = p.estourou ? '#c0392b' : p.percentual >= 0.8 ? '#c8792a' : '#12805d';
          return (
            <div key={lim.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                {cat && <span className="h-3 w-3 rounded-full" style={{ background: cat.cor }} />}
                <p className="flex-1 font-semibold">{cat?.nome ?? '?'}</p>
                <p className="num text-sm font-semibold">{brl(total)} / {brl(lim.valor_mensal)}</p>
              </div>
              <div className="mt-2">
                <BarraProgresso percentual={p.percentual} cor={cor} />
              </div>
              <p className="mt-1 text-xs text-ink-muted" style={{ color: cor }}>
                {p.estourou ? 'Limite estourado' : p.percentual >= 0.8 ? 'Atenção: perto do limite' : 'Dentro do limite'}
              </p>
              <div className="mt-2 flex justify-end">
                <button onClick={() => excluirLimite(lim.id)} className="text-sm text-danger">Remover</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal aberto={aberto} titulo="Novo limite" onFechar={() => setAberto(false)}>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Categoria</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
          <option value={0}>Selecione...</option>
          {categoriasDespesa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Valor mensal (R$)</label>
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal"
          className="num mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />
        {msg && <p className="mb-3 text-sm text-danger">{msg}</p>}
        <button onClick={salvar} className="w-full rounded-xl bg-primary py-3 font-semibold text-white">Salvar</button>
      </Modal>
    </div>
  );
}
