import { describe, it, expect } from 'vitest';
import { saldoConta, patrimonio, faturaMes, arredondar } from './finance';
import type { Conta, Lancamento } from '../types';

const corrente: Conta = { id: 1, nome: 'Corrente', tipo: 'corrente', saldo_inicial: 1000, cor: '#12805d', ordem: 1, ativo: true };
const invest: Conta = { id: 2, nome: 'Invest', tipo: 'investimento', saldo_inicial: 5000, cor: '#b28a4b', ordem: 2, ativo: true };
const cartao: Conta = { id: 3, nome: 'Cartão', tipo: 'cartao', saldo_inicial: 0, cor: '#c0392b', ordem: 3, ativo: true };

const base: Lancamento[] = [
  { id: 1, conta_id: 1, conta_destino_id: null, tipo: 'receita', categoria_id: 1, valor: 3000, data: '2026-07-05', descricao: 'Salário' },
  { id: 2, conta_id: 1, conta_destino_id: null, tipo: 'despesa', categoria_id: 2, valor: 200, data: '2026-07-10', descricao: 'Mercado' },
  { id: 3, conta_id: 3, conta_destino_id: null, tipo: 'despesa', categoria_id: 2, valor: 150, data: '2026-07-12', descricao: 'Restaurante' },
  { id: 4, conta_id: 1, conta_destino_id: 3, tipo: 'transferencia', categoria_id: null, valor: 150, data: '2026-07-20', descricao: 'Pagar fatura' },
  { id: 5, conta_id: 1, conta_destino_id: 2, tipo: 'transferencia', categoria_id: null, valor: 500, data: '2026-07-21', descricao: 'Guardar' }
];

describe('saldoConta', () => {
  it('calcula saldo somando receitas e transferências recebidas', () => {
    // corrente: 1000 + 3000 - 200 - 150 (transf saída) - 500 (transf saída) = 3150
    expect(saldoConta(corrente, base)).toBe(3150);
  });

  it('conta transferência recebida como crédito', () => {
    expect(saldoConta(invest, base)).toBe(5500);
  });

  it('cartão fica negativo com compras e sobe com pagamento', () => {
    // 0 - 150 (compra) + 150 (pagamento) = 0
    expect(saldoConta(cartao, base)).toBe(0);
  });
});

describe('patrimonio', () => {
  it('soma apenas contas não-cartão', () => {
    expect(patrimonio([corrente, invest, cartao], base)).toBe(8650);
  });
});

describe('faturaMes', () => {
  it('fatura = compras - pagamentos no mês', () => {
    const f = faturaMes(3, base, '2026-07');
    expect(f.compras).toBe(150);
    expect(f.pagamentos).toBe(150);
    expect(f.fatura).toBe(0);
  });

  it('ignora lançamentos de outros meses', () => {
    const f = faturaMes(3, base, '2026-08');
    expect(f.fatura).toBe(0);
  });
});

describe('arredondar', () => {
  it('arredonda para centavos', () => {
    expect(arredondar(10.005)).toBe(10.01);
    expect(arredondar(10.004)).toBe(10);
  });
});
