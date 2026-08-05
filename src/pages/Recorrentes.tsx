import { useState } from 'react';
import Modal from '../components/Modal';
import { useDataStore } from '../store/data';
import { statusRecorrente } from '../lib/finance';
import { brl, dataBonita, hojeISO } from '../lib/format';
import type { Recorrente, TipoCategoria } from '../types';

export default function Recorrentes() {
  const recorrentes = useDataStore((s) => s.recorrentes);
  const contas = useDataStore((s) => s.contas);
  const categorias = useDataStore((s) => s.categorias);
  const adicionarRecorrente = useDataStore((s) => s.adicionarRecorrente);
  const atualizarRecorrente = useDataStore((s) => s.atualizarRecorrente);
  const excluirRecorrente = useDataStore((s) => s.excluirRecorrente);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Recorrente | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>('despesa');
  const [contaId, setContaId] = useState(0);
  const [categoriaId, setCategoriaId] = useState(0);
  const [valor, setValor] = useState('');
  const [frequencia, setFrequencia] = useState<'mensal' | 'semanal'>('mensal');
  const [dia, setDia] = useState(1);
  const [msg, setMsg] = useState('');

  const nomeConta = (id: number) => contas.find((c) => c.id === id)?.nome ?? '?';
  const hoje = hojeISO();

  const statusLinha = (r: Recorrente) => {
    const s = statusRecorrente(r, hoje);
    if (s.tipo === 'atrasado') return <p className="text-xs text-danger">Pendente desde {dataBonita(s.data)}</p>;
    if (s.tipo === 'hoje') return <p className="text-xs font-semibold text-primary">Vence hoje</p>;
    if (s.tipo === 'amanha') return <p className="text-xs font-semibold text-primary">Vence amanhã</p>;
    const dias = Math.round((new Date(s.data + 'T00:00:00').getTime() - new Date(hoje + 'T00:00:00').getTime()) / 86400000);
    return <p className="text-xs text-ink-muted">Em {dias} dias ({dataBonita(s.data)})</p>;
  };

  const abrir = (r: Recorrente | null) => {
    setEditando(r);
    setNome(r?.nome ?? '');
    setTipo(r?.tipo ?? 'despesa');
    setContaId(r?.conta_id ?? 0);
    setCategoriaId(r?.categoria_id ?? 0);
    setValor(r ? String(r.valor) : '');
    setFrequencia(r?.frequencia ?? 'mensal');
    setDia(r?.dia ?? 1);
    setMsg('');
    setAberto(true);
  };

  const salvar = async () => {
    const v = parseFloat(valor.replace(',', '.'));
    if (!nome.trim()) { setMsg('Informe um nome.'); return; }
    if (!v || v <= 0) { setMsg('Informe um valor maior que zero.'); return; }
    if (!contaId) { setMsg('Selecione uma conta.'); return; }
    if (!categoriaId) { setMsg('Selecione uma categoria.'); return; }
    try {
      if (editando) {
        await atualizarRecorrente({ ...editando, nome: nome.trim(), tipo, conta_id: contaId, categoria_id: categoriaId, valor: v, frequencia, dia });
      } else {
        await adicionarRecorrente({ nome: nome.trim(), tipo, conta_id: contaId, categoria_id: categoriaId, valor: v, frequencia, dia, ativo: true });
      }
      setAberto(false);
    } catch { setMsg('Erro ao salvar.'); }
  };

  const alternarAtivo = async (r: Recorrente) => {
    try { await atualizarRecorrente({ ...r, ativo: !r.ativo }); } catch { /* silencioso */ }
  };

  const excluir = (r: Recorrente) => {
    excluirRecorrente(r.id);
  };

  return (
    <div className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Recorrentes</h1>
        <button onClick={() => abrir(null)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">+ Nova</button>
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Lançamentos são gerados automaticamente no vencimento. Recorrentes geram tanto lançamentos reais quanto entram na projeção.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {recorrentes.length === 0 && <p className="text-sm text-ink-muted">Nenhuma recorrente ainda.</p>}
        {recorrentes.map((r) => (
          <div key={r.id} className={`rounded-xl border border-line bg-surface p-4 ${!r.ativo ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold">{r.nome}</p>
                <p className="num text-sm text-ink-muted">{r.tipo === 'receita' ? '+' : '−'}{brl(r.valor)} · {nomeConta(r.conta_id)}</p>
                {statusLinha(r)}
              </div>
              <button onClick={() => alternarAtivo(r)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${r.ativo ? 'bg-primary-soft text-primary' : 'bg-raised text-ink-muted'}`}>
                {r.ativo ? 'Ativa' : 'Pausada'}
              </button>
            </div>
            <div className="mt-2 flex justify-end gap-3 text-sm">
              <button onClick={() => abrir(r)} className="text-ink-muted">Editar</button>
              <button onClick={() => excluir(r)} className="text-danger">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      <Modal aberto={aberto} titulo={editando ? 'Editar recorrente' : 'Nova recorrente'} onFechar={() => setAberto(false)}>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Aluguel"
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Tipo</label>
        <div className="mb-4 flex gap-2">
          <button onClick={() => setTipo('despesa')}
            className={`flex-1 rounded-xl border px-3 py-2 ${tipo === 'despesa' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Despesa</button>
          <button onClick={() => setTipo('receita')}
            className={`flex-1 rounded-xl border px-3 py-2 ${tipo === 'receita' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Receita</button>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Valor (R$)</label>
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal"
          className="num mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Conta</label>
        <select value={contaId} onChange={(e) => setContaId(Number(e.target.value))}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
          <option value={0}>Selecione...</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Categoria</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
          <option value={0}>Selecione...</option>
          {categorias.filter((c) => c.tipo === tipo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Frequência</label>
        <div className="mb-4 flex gap-2">
          <button onClick={() => setFrequencia('mensal')}
            className={`flex-1 rounded-xl border px-3 py-2 ${frequencia === 'mensal' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Mensal</button>
          <button onClick={() => setFrequencia('semanal')}
            className={`flex-1 rounded-xl border px-3 py-2 ${frequencia === 'semanal' ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>Semanal</button>
        </div>

        {frequencia === 'mensal' ? (
          <>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Dia do mês</label>
            <input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(Number(e.target.value))}
              className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Dia da semana</label>
            <select value={dia} onChange={(e) => setDia(Number(e.target.value))}
              className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </>
        )}

        {msg && <p className="mb-3 text-sm text-danger">{msg}</p>}
        <button onClick={salvar} className="w-full rounded-xl bg-primary py-3 font-semibold text-white">Salvar</button>
      </Modal>
    </div>
  );
}
