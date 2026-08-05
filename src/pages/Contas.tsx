import { useState } from 'react';
import Modal from '../components/Modal';
import { useDataStore } from '../store/data';
import { saldoConta, faturaMes } from '../lib/finance';
import { brl, nomeMes } from '../lib/format';
import type { Conta, TipoConta } from '../types';

const ICONES: Record<TipoConta, string> = { corrente: '▤', investimento: '◉', especie: '₹', cartao: '◫' };

const CORES = ['#12805d', '#b28a4b', '#3b6ea5', '#7a4fa3', '#c8792a', '#8a6d3b'];

export default function Contas() {
  const contas = useDataStore((s) => s.contas);
  const lancamentos = useDataStore((s) => s.lancamentos);
  const adicionarConta = useDataStore((s) => s.adicionarConta);
  const atualizarConta = useDataStore((s) => s.atualizarConta);
  const excluirConta = useDataStore((s) => s.excluirConta);

  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoConta>('corrente');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [cor, setCor] = useState(CORES[0]);
  const [msg, setMsg] = useState('');

  const agora = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  const abrir = (c: Conta | null) => {
    setEditando(c);
    setNome(c?.nome ?? '');
    setTipo(c?.tipo ?? 'corrente');
    setSaldoInicial(String(c?.saldo_inicial ?? 0));
    setCor(c?.cor ?? CORES[0]);
    setMsg('');
    setAberto(true);
  };

  const salvar = async () => {
    if (!nome.trim()) { setMsg('Informe um nome.'); return; }
    const valor = parseFloat(saldoInicial.replace(',', '.')) || 0;
    try {
      if (editando) {
        await atualizarConta({ ...editando, nome: nome.trim(), tipo, saldo_inicial: valor, cor });
      } else {
        await adicionarConta({ nome: nome.trim(), tipo, saldo_inicial: valor, cor, ordem: contas.length, ativo: true });
      }
      setAberto(false);
    } catch { setMsg('Erro ao salvar.'); }
  };

  const excluir = (c: Conta) => {
    const temLancamentos = lancamentos.some((l) => l.conta_id === c.id || l.conta_destino_id === c.id);
    if (temLancamentos) { alert('Não é possível excluir: a conta tem lançamentos.'); return; }
    excluirConta(c.id);
  };

  const cartoes = contas.filter((c) => c.tipo === 'cartao');
  const demais = contas.filter((c) => c.tipo !== 'cartao');

  return (
    <div className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Contas</h1>
        <button onClick={() => abrir(null)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">+ Nova</button>
      </div>

      {contas.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">Crie sua primeira conta para começar.</p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {demais.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl" style={{ color: c.cor }}>{ICONES[c.tipo]}</span>
              <div className="flex-1">
                <p className="font-semibold">{c.nome}</p>
                <p className="text-xs text-ink-muted">{c.tipo}</p>
              </div>
              <p className="num text-lg font-semibold">{brl(saldoConta(c, lancamentos))}</p>
            </div>
            <div className="mt-2 flex justify-end gap-3 text-sm">
              <button onClick={() => abrir(c)} className="text-ink-muted">Editar</button>
              <button onClick={() => excluir(c)} className="text-danger">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {cartoes.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Cartões</h2>
          <div className="mt-2 flex flex-col gap-3">
            {cartoes.map((c) => {
              const f = faturaMes(c.id, lancamentos, mesAtual);
              return (
                <div key={c.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl" style={{ color: c.cor }}>{ICONES[c.tipo]}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{c.nome}</p>
                      <p className="text-xs text-ink-muted">Fatura de {nomeMes(agora.getFullYear(), agora.getMonth() + 1)}</p>
                    </div>
                    <p className="num text-lg font-semibold">{brl(f.fatura)}</p>
                  </div>
                  <p className="num mt-2 text-xs text-ink-muted">
                    Compras: {brl(f.compras)} · Pagamentos: {brl(f.pagamentos)}
                  </p>
                  <div className="mt-2 flex justify-end gap-3 text-sm">
                    <button onClick={() => abrir(c)} className="text-ink-muted">Editar</button>
                    <button onClick={() => excluir(c)} className="text-danger">Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal aberto={aberto} titulo={editando ? 'Editar conta' : 'Nova conta'} onFechar={() => setAberto(false)}>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank"
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Tipo</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(Object.keys(ICONES) as TipoConta[]).map((t) => (
            <button key={t} onClick={() => setTipo(t)}
              className={`rounded-xl border px-3 py-2 ${tipo === t ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>
              {ICONES[t]} {t}
            </button>
          ))}
        </div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Saldo inicial (R$)</label>
        <input value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} inputMode="decimal"
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
