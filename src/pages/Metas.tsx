import { useState } from 'react';
import Modal from '../components/Modal';
import BarraProgresso from '../components/BarraProgresso';
import { useDataStore } from '../store/data';
import { saldoConta, depositoSugerido } from '../lib/finance';
import { brl, hojeISO } from '../lib/format';
import type { Meta } from '../types';

const CORES = ['#12805d', '#b28a4b', '#3b6ea5', '#7a4fa3', '#c8792a'];

export default function Metas() {
  const metas = useDataStore((s) => s.metas);
  const contas = useDataStore((s) => s.contas);
  const lancamentos = useDataStore((s) => s.lancamentos);
  const adicionarMeta = useDataStore((s) => s.adicionarMeta);
  const atualizarMeta = useDataStore((s) => s.atualizarMeta);
  const excluirMeta = useDataStore((s) => s.excluirMeta);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Meta | null>(null);
  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [contaId, setContaId] = useState(0);
  const [dataAlvo, setDataAlvo] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [msg, setMsg] = useState('');

  const hoje = hojeISO();

  const abrir = (m: Meta | null) => {
    setEditando(m);
    setNome(m?.nome ?? '');
    setValorAlvo(m ? String(m.valor_alvo) : '');
    setContaId(m?.conta_id ?? 0);
    setDataAlvo(m?.data_alvo ?? '');
    setCor(m?.cor ?? CORES[0]);
    setMsg('');
    setAberto(true);
  };

  const salvar = async () => {
    const v = parseFloat(valorAlvo.replace(',', '.'));
    if (!nome.trim()) { setMsg('Informe um nome.'); return; }
    if (!v || v <= 0) { setMsg('Informe o valor alvo.'); return; }
    if (!contaId) { setMsg('Selecione a conta.'); return; }
    try {
      if (editando) {
        await atualizarMeta({ ...editando, nome: nome.trim(), valor_alvo: v, conta_id: contaId, data_alvo: dataAlvo || null, cor });
      } else {
        await adicionarMeta({ nome: nome.trim(), valor_alvo: v, conta_id: contaId, data_alvo: dataAlvo || null, cor });
      }
      setAberto(false);
    } catch { setMsg('Erro ao salvar.'); }
  };

  const excluir = async (m: Meta) => {
    if (!confirm(`Excluir a meta "${m.nome}"?`)) return;
    try { await excluirMeta(m.id); } catch { /* silencioso */ }
  };

  return (
    <div className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Metas</h1>
        <button onClick={() => abrir(null)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">+ Nova</button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {metas.length === 0 && <p className="text-sm text-ink-muted">Crie uma meta e vincule a conta onde o dinheiro fica.</p>}
        {metas.map((m) => {
          const conta = contas.find((c) => c.id === m.conta_id);
          const atual = conta ? saldoConta(conta, lancamentos) : 0;
          const progresso = m.valor_alvo > 0 ? atual / m.valor_alvo : 0;
          const sugerido = depositoSugerido(m.valor_alvo, atual, m.data_alvo, hoje);
          return (
            <div key={m.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: m.cor }} />
                <p className="flex-1 font-semibold">{m.nome}</p>
                <p className="num text-sm font-semibold">{brl(atual)} / {brl(m.valor_alvo)}</p>
              </div>
              <div className="mt-2">
                <BarraProgresso percentual={progresso} cor={m.cor} />
              </div>
              <p className="num mt-2 text-xs text-ink-muted">
                {m.data_alvo ? `Até ${m.data_alvo} · sugerido ${brl(sugerido)}/mês` : `Sem prazo · ${brl(sugerido)} para atingir`}
              </p>
              <div className="mt-2 flex justify-end gap-3 text-sm">
                <button onClick={() => abrir(m)} className="text-ink-muted">Editar</button>
                <button onClick={() => excluir(m)} className="text-danger">Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal aberto={aberto} titulo={editando ? 'Editar meta' : 'Nova meta'} onFechar={() => setAberto(false)}>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem"
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Valor alvo (R$)</label>
        <input value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} inputMode="decimal"
          className="num mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Conta vinculada</label>
        <select value={contaId} onChange={(e) => setContaId(Number(e.target.value))}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
          <option value={0}>Selecione...</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Data alvo (opcional)</label>
        <input type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

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
