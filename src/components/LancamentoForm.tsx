import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useDataStore } from '../store/data';
import { hojeISO } from '../lib/format';
import type { Lancamento, TipoLancamento } from '../types';

interface LancamentoFormProps {
  aberto: boolean;
  onFechar: () => void;
  lancamento?: Lancamento | null;
  onSalvo: () => void;
}

export default function LancamentoForm({ aberto, onFechar, lancamento, onSalvo }: LancamentoFormProps) {
  const contas = useDataStore((s) => s.contas);
  const categorias = useDataStore((s) => s.categorias);
  const adicionarLancamento = useDataStore((s) => s.adicionarLancamento);
  const atualizarLancamento = useDataStore((s) => s.atualizarLancamento);

  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [contaId, setContaId] = useState<number>(0);
  const [contaDestinoId, setContaDestinoId] = useState<number>(0);
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');

  const contasAtivas = contas.filter((c) => c.ativo);

  useEffect(() => {
    if (!aberto) return;
    setTipo(lancamento?.tipo ?? 'despesa');
    setContaId(lancamento?.conta_id ?? contasAtivas[0]?.id ?? 0);
    setContaDestinoId(lancamento?.conta_destino_id ?? 0);
    setCategoriaId(lancamento?.categoria_id ?? 0);
    setValor(lancamento ? String(lancamento.valor) : '');
    setData(lancamento?.data ?? hojeISO());
    setDescricao(lancamento?.descricao ?? '');
    setErro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, lancamento]);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === (tipo === 'transferencia' ? 'despesa' : tipo));

  const salvar = async () => {
    const v = parseFloat(valor.replace(',', '.'));
    if (!v || v <= 0) { setErro('Informe um valor maior que zero.'); return; }
    if (!contaId) { setErro('Selecione uma conta.'); return; }
    if (tipo !== 'transferencia' && !categoriaId) { setErro('Selecione uma categoria.'); return; }
    if (tipo === 'transferencia' && !contaDestinoId) { setErro('Selecione a conta de destino.'); return; }
    if (tipo === 'transferencia' && contaId === contaDestinoId) { setErro('Origem e destino devem ser diferentes.'); return; }
    try {
      const dados = {
        conta_id: contaId,
        conta_destino_id: tipo === 'transferencia' ? contaDestinoId : null,
        tipo,
        categoria_id: tipo === 'transferencia' ? null : categoriaId,
        valor: v,
        data,
        descricao: descricao.trim()
      };
      if (lancamento) await atualizarLancamento({ ...dados, id: lancamento.id });
      else await adicionarLancamento(dados);
      onSalvo();
      onFechar();
    } catch {
      setErro('Erro ao salvar.');
    }
  };

  return (
    <Modal aberto={aberto} titulo={lancamento ? 'Editar lançamento' : 'Novo lançamento'} onFechar={onFechar}>
      <div className="mb-4 flex gap-2">
        {(['despesa', 'receita', 'transferencia'] as TipoLancamento[]).map((t) => (
          <button key={t} onClick={() => setTipo(t)}
            className={`flex-1 rounded-xl border px-3 py-2 capitalize ${tipo === t ? 'border-primary bg-primary-soft font-semibold' : 'border-line'}`}>
            {t === 'transferencia' ? 'Transferir' : t}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Valor (R$)</label>
      <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00"
        className="num mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-lg font-semibold outline-none focus:border-primary" />

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{tipo === 'transferencia' ? 'Origem' : 'Conta'}</label>
      <select value={contaId} onChange={(e) => setContaId(Number(e.target.value))}
        className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
        <option value={0}>Selecione...</option>
        {contasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>

      {tipo === 'transferencia' ? (
        <>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Destino</label>
          <select value={contaDestinoId} onChange={(e) => setContaDestinoId(Number(e.target.value))}
            className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
            <option value={0}>Selecione...</option>
            {contasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </>
      ) : (
        <>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}
            className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary">
            <option value={0}>Selecione...</option>
            {categoriasDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </>
      )}

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Data</label>
      <input type="date" value={data} onChange={(e) => setData(e.target.value)}
        className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Descrição</label>
      <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Supermercado"
        className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />

      {erro && <p className="mb-3 text-sm text-danger">{erro}</p>}
      <button onClick={salvar} className="w-full rounded-xl bg-primary py-3 font-semibold text-white">Salvar</button>
    </Modal>
  );
}
