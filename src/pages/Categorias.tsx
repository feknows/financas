import { useState } from 'react';
import Modal from '../components/Modal';
import { useDataStore } from '../store/data';
import type { Categoria, TipoCategoria } from '../types';

const CORES = ['#12805d', '#b28a4b', '#c8792a', '#c0392b', '#3b6ea5', '#7a4fa3', '#8a6d3b', '#556b57'];

export default function Categorias() {
  const categorias = useDataStore((s) => s.categorias);
  const adicionarCategoria = useDataStore((s) => s.adicionarCategoria);
  const atualizarCategoria = useDataStore((s) => s.atualizarCategoria);
  const excluirCategoria = useDataStore((s) => s.excluirCategoria);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>('despesa');
  const [cor, setCor] = useState(CORES[0]);
  const [msg, setMsg] = useState('');

  const abrir = (cat: Categoria | null) => {
    setEditando(cat);
    setNome(cat?.nome ?? '');
    setTipo(cat?.tipo ?? 'despesa');
    setCor(cat?.cor ?? CORES[0]);
    setMsg('');
    setAberto(true);
  };

  const salvar = async () => {
    if (!nome.trim()) { setMsg('Informe um nome.'); return; }
    try {
      if (editando) {
        await atualizarCategoria({ ...editando, nome: nome.trim(), tipo, cor });
      } else {
        await adicionarCategoria({ nome: nome.trim(), tipo, cor, ordem: categorias.length });
      }
      setAberto(false);
    } catch {
      setMsg('Erro ao salvar.');
    }
  };

  const excluir = (cat: Categoria) => {
    excluirCategoria(cat.id);
  };

  const porTipo = (t: TipoCategoria) => categorias.filter((c) => c.tipo === t);

  return (
    <div className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Categorias</h1>
        <button onClick={() => abrir(null)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">+ Nova</button>
      </div>

      {(['despesa', 'receita'] as TipoCategoria[]).map((t) => (
        <div key={t} className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t === 'despesa' ? 'Despesas' : 'Receitas'}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {porTipo(t).length === 0 && (
              <p className="text-sm text-ink-muted">Nenhuma ainda — crie a primeira.</p>
            )}
            {porTipo(t).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <span className="h-4 w-4 rounded-full" style={{ background: c.cor }} />
                <span className="flex-1 font-medium">{c.nome}</span>
                <button onClick={() => abrir(c)} className="text-sm text-ink-muted">Editar</button>
                <button onClick={() => excluir(c)} className="text-sm text-danger">Excluir</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal aberto={aberto} titulo={editando ? 'Editar categoria' : 'Nova categoria'} onFechar={() => setAberto(false)}>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mercado"
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Tipo</label>
        <div className="mb-4 flex gap-2">
          <button onClick={() => setTipo('despesa')}
            className={`flex-1 rounded-xl border px-3 py-2 ${tipo === 'despesa' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Despesa</button>
          <button onClick={() => setTipo('receita')}
            className={`flex-1 rounded-xl border px-3 py-2 ${tipo === 'receita' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Receita</button>
        </div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Cor</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {CORES.map((c) => (
            <button key={c} onClick={() => setCor(c)}
              className={`h-7 w-7 rounded-full ${cor === c ? 'ring-2 ring-ink ring-offset-2' : ''}`}
              style={{ background: c }} />
          ))}
        </div>
        {msg && <p className="mb-3 text-sm text-danger">{msg}</p>}
        <button onClick={salvar} className="w-full rounded-xl bg-primary py-3 font-semibold text-white">Salvar</button>
      </Modal>
    </div>
  );
}
