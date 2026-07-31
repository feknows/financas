import type { Conta, Lancamento, NovoLancamento, Recorrente } from '../types';

export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function saldoConta(conta: Conta, lancamentos: Lancamento[]): number {
  const soma = lancamentos.reduce((acc, l) => {
    if (l.conta_id === conta.id) {
      if (l.tipo === 'receita') acc += l.valor;
      if (l.tipo === 'despesa') acc -= l.valor;
      if (l.tipo === 'transferencia') acc -= l.valor;
    }
    if (l.tipo === 'transferencia' && l.conta_destino_id === conta.id) acc += l.valor;
    return acc;
  }, 0);
  return arredondar(conta.saldo_inicial + soma);
}

export function patrimonio(contas: Conta[], lancamentos: Lancamento[]): number {
  return arredondar(
    contas
      .filter((c) => c.tipo !== 'cartao')
      .reduce((acc, c) => acc + saldoConta(c, lancamentos), 0)
  );
}

export interface FaturaMes {
  compras: number;
  pagamentos: number;
  fatura: number;
}

export function faturaMes(cartaoId: number, lancamentos: Lancamento[], mes: string): FaturaMes {
  let compras = 0;
  let pagamentos = 0;
  for (const l of lancamentos) {
    if (!l.data.startsWith(mes)) continue;
    if (l.tipo === 'despesa' && l.conta_id === cartaoId) compras += l.valor;
    if (l.tipo === 'transferencia' && l.conta_destino_id === cartaoId) pagamentos += l.valor;
  }
  return { compras: arredondar(compras), pagamentos: arredondar(pagamentos), fatura: arredondar(compras - pagamentos) };
}
