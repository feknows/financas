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

import { diasNoMes, somarDias, proximoVencimento, ocorrenciasNoMes, projetar6meses } from './finance';
import type { Recorrente } from '../types';

const aluguel: Recorrente = {
  id: 1, nome: 'Aluguel', tipo: 'despesa', conta_id: 1, categoria_id: 2,
  valor: 800, frequencia: 'mensal', dia: 31, ativo: true, ultimo_processado: null
};

const academia: Recorrente = {
  id: 2, nome: 'Academia', tipo: 'despesa', conta_id: 1, categoria_id: 2,
  valor: 100, frequencia: 'semanal', dia: 2, ativo: true, ultimo_processado: null
};

const salario: Recorrente = {
  id: 3, nome: 'Salário', tipo: 'receita', conta_id: 1, categoria_id: 1,
  valor: 3000, frequencia: 'mensal', dia: 5, ativo: true, ultimo_processado: null
};

describe('datas', () => {
  it('diasNoMes respeita anos bissextos', () => {
    expect(diasNoMes(2024, 2)).toBe(29);
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2026, 7)).toBe(31);
  });

  it('somarDias avança datas', () => {
    expect(somarDias('2026-07-31', 1)).toBe('2026-08-01');
  });
});

describe('proximoVencimento', () => {
  it('mensal com clamp de dia 31', () => {
    expect(proximoVencimento(aluguel, '2026-01-31')).toBe('2026-02-28');
    expect(proximoVencimento(aluguel, '2026-02-28')).toBe('2026-03-31');
  });

  it('mensal avança para o próximo mês quando já passou', () => {
    const rec = { ...aluguel, dia: 15 };
    expect(proximoVencimento(rec, '2026-07-20')).toBe('2026-08-15');
  });

  it('semanal encontra o próximo dia da semana', () => {
    // 2026-08-01 é sábado; próxima terça (dia 2) é 2026-08-04
    expect(proximoVencimento(academia, '2026-08-01')).toBe('2026-08-04');
  });
});

describe('ocorrenciasNoMes', () => {
  it('conta ocorrências mensais no mês', () => {
    expect(ocorrenciasNoMes(salario, 2026, 7)).toEqual(['2026-07-05']);
  });

  it('mensal com clamp no mês', () => {
    expect(ocorrenciasNoMes(aluguel, 2026, 2)).toEqual(['2026-02-28']);
  });

  it('semanal conta todos os dias da semana no mês', () => {
    // agosto/2026 tem 4 terças-feiras
    expect(ocorrenciasNoMes(academia, 2026, 8).length).toBe(4);
  });

  it('aPartirDe corta ocorrências já passadas', () => {
    expect(ocorrenciasNoMes(salario, 2026, 7, '2026-07-06')).toEqual([]);
  });
});

describe('projetar6meses', () => {
  it('projeta saldo somando o líquido das recorrentes', () => {
    const recorrentes = [salario, aluguel];
    const lanc: Lancamento[] = [{ id: 1, conta_id: 1, conta_destino_id: null, tipo: 'despesa', categoria_id: 2, valor: 300, data: '2026-07-01', descricao: 'gasto' }];
    const proj = projetar6meses([corrente, invest], lanc, recorrentes, '2026-07-01');
    // patrimonio = 1000 + 5000 - 300 = 5700; líquido mensal = +3000 - 800 = 2200
    expect(proj[0]).toEqual({ mes: '2026-07', saldo: 5700 + 2200 });
    expect(proj[1]).toEqual({ mes: '2026-08', saldo: 5700 + 2 * 2200 });
  });

  it('ignora recorrentes inativas', () => {
    const inativa = { ...aluguel, ativo: false };
    const proj = projetar6meses([corrente], [], [inativa], '2026-07-01');
    expect(proj[0].saldo).toBe(1000);
  });
});

import { calcularProgresso, depositoSugerido, primeiroPendente, gerarRecorrentesPendentes } from './finance';

describe('calcularProgresso', () => {
  it('calcula total e percentual do mês', () => {
    const p = calcularProgresso(160, 200);
    expect(p.total).toBe(160);
    expect(p.percentual).toBe(0.8);
    expect(p.estourou).toBe(false);
  });

  it('marca estourou quando passa de 100%', () => {
    const p = calcularProgresso(201, 200);
    expect(p.estourou).toBe(true);
  });
});

describe('depositoSugerido', () => {
  it('divide o restante pelos meses restantes', () => {
    // 3000 alvo, 1200 atual, 6 meses até o alvo -> 1800/6 = 300
    expect(depositoSugerido(3000, 1200, '2026-12-31', '2026-07-01')).toBe(300);
  });

  it('sem prazo devolve o valor restante', () => {
    expect(depositoSugerido(3000, 1000, null, '2026-07-01')).toBe(2000);
  });

  it('meta já atingida devolve zero', () => {
    expect(depositoSugerido(3000, 3500, '2026-12-31', '2026-07-01')).toBe(0);
  });
});

describe('gerarRecorrentesPendentes', () => {
  it('gera ocorrências vencidas desde o último processamento sem duplicar', () => {
    const rec = { ...aluguel, ultimo_processado: '2026-07-31' };
    const { novos, atualizados } = gerarRecorrentesPendentes([rec], '2026-10-01');
    expect(novos.map((n) => n.data)).toEqual(['2026-08-31', '2026-09-30']);
    expect(novos[0].descricao).toBe('Aluguel');
    expect(atualizados[0].ultimo_processado).toBe('2026-09-30');
  });

  it('recorrente nunca processada só gera a partir de hoje', () => {
    const rec = { ...aluguel, ultimo_processado: null }; // dia 31
    const { novos } = gerarRecorrentesPendentes([rec], '2026-07-20');
    expect(novos).toEqual([]);
  });

  it('nunca processada e no dia gera a ocorrência de hoje', () => {
    const rec = { ...salario, ultimo_processado: null }; // dia 5
    const { novos } = gerarRecorrentesPendentes([rec], '2026-07-05');
    expect(novos.map((n) => n.data)).toEqual(['2026-07-05']);
  });

  it('ignora recorrentes inativas', () => {
    const rec = { ...aluguel, ativo: false, ultimo_processado: '2026-07-31' };
    const { novos, atualizados } = gerarRecorrentesPendentes([rec], '2026-09-10');
    expect(novos).toEqual([]);
    expect(atualizados).toEqual([]);
  });

  it('semanal gera todas as semanas desde o último processamento', () => {
    // último 2026-08-03 (segunda); próximas terças: 04, 11, 18, 25/08 e 01/09
    const rec = { ...academia, ultimo_processado: '2026-08-03' };
    const { novos } = gerarRecorrentesPendentes([rec], '2026-09-02');
    expect(novos.length).toBe(5);
    expect(novos[0].data).toBe('2026-08-04');
    expect(novos[4].data).toBe('2026-09-01');
  });

  it('não atualiza ultimo_processado quando a próxima ocorrência ainda não venceu', () => {
    // dia 31 processado em 2026-07-31; em 2026-08-01 a próxima ocorrência (31/08) ainda não venceu
    const rec = { ...aluguel, ultimo_processado: '2026-07-31' };
    const { novos, atualizados } = gerarRecorrentesPendentes([rec], '2026-08-01');
    expect(novos).toEqual([]);
    expect(atualizados).toEqual([]);
  });
});

describe('primeiroPendente', () => {
  it('mensal dentro do mês atual', () => {
    expect(primeiroPendente({ ...salario, ultimo_processado: null }, '2026-07-05')).toBe('2026-07-05');
    expect(primeiroPendente({ ...salario, ultimo_processado: null }, '2026-07-03')).toBe(null);
  });

  it('semanal dentro dos últimos 7 dias', () => {
    // 2026-08-04 é terça (dia 2); 2 dias antes é 2026-08-02 (domingo)
    expect(primeiroPendente({ ...academia, ultimo_processado: null }, '2026-08-04')).toBe('2026-08-04');
  });
});
