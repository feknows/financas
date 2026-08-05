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

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function formatarData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(data + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return formatarData(d);
}

function dataDoDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function proximoVencimento(rec: Recorrente, depoisDe: string): string {
  if (rec.frequencia === 'mensal') {
    const [ano, mes] = depoisDe.split('-').map(Number);
    const cand = dataDoDia(ano, mes, Math.min(rec.dia, diasNoMes(ano, mes)));
    if (cand > depoisDe) return cand;
    let novoAno = ano;
    let novoMes = mes + 1;
    if (novoMes === 13) { novoMes = 1; novoAno += 1; }
    return dataDoDia(novoAno, novoMes, Math.min(rec.dia, diasNoMes(novoAno, novoMes)));
  }
  for (let i = 1; i <= 7; i++) {
    const d = somarDias(depoisDe, i);
    if (new Date(d + 'T00:00:00').getDay() === rec.dia) return d;
  }
  throw new Error('Nunca deveria chegar aqui');
}

export function ocorrenciasNoMes(rec: Recorrente, ano: number, mes: number, aPartirDe: string | null = null): string[] {
  const resultado: string[] = [];
  if (rec.frequencia === 'mensal') {
    const d = dataDoDia(ano, mes, Math.min(rec.dia, diasNoMes(ano, mes)));
    if (!aPartirDe || d > aPartirDe) resultado.push(d);
    return resultado;
  }
  const total = diasNoMes(ano, mes);
  for (let dia = 1; dia <= total; dia++) {
    const d = dataDoDia(ano, mes, dia);
    if (new Date(d + 'T00:00:00').getDay() !== rec.dia) continue;
    if (!aPartirDe || d > aPartirDe) resultado.push(d);
  }
  return resultado;
}

export function projetar6meses(
  contas: Conta[],
  lancamentos: Lancamento[],
  recorrentes: Recorrente[],
  hoje: string
): { mes: string; saldo: number }[] {
  const base = patrimonio(contas, lancamentos);
  const [anoBase, mesBase] = hoje.split('-').map(Number);
  const resultado: { mes: string; saldo: number }[] = [];
  let saldo = base;
  for (let i = 0; i < 6; i++) {
    const ano = anoBase + Math.floor((mesBase - 1 + i) / 12);
    const mes = ((mesBase - 1 + i) % 12) + 1;
    let liquido = 0;
    for (const rec of recorrentes) {
      if (!rec.ativo) continue;
      const ocorrencias = ocorrenciasNoMes(rec, ano, mes, i === 0 ? hoje : null);
      const fator = rec.tipo === 'receita' ? 1 : -1;
      liquido += ocorrencias.length * rec.valor * fator;
    }
    saldo += liquido;
    resultado.push({ mes: `${ano}-${String(mes).padStart(2, '0')}`, saldo: arredondar(saldo) });
  }
  return resultado;
}

export interface ProgressoLimite {
  total: number;
  percentual: number;
  estourou: boolean;
}

export function calcularProgresso(total: number, limiteMensal: number): ProgressoLimite {
  const percentual = limiteMensal > 0 ? arredondar(total / limiteMensal) : 0;
  return { total, percentual, estourou: percentual >= 1 };
}

export function depositoSugerido(valorAlvo: number, saldoAtual: number, dataAlvo: string | null, hoje: string): number {
  const restante = arredondar(valorAlvo - saldoAtual);
  if (restante <= 0) return 0;
  if (!dataAlvo) return restante;
  const [aAno, aMes, aDia] = hoje.split('-').map(Number);
  const [bAno, bMes, bDia] = dataAlvo.split('-').map(Number);
  let meses = (bAno - aAno) * 12 + (bMes - aMes) + 1;
  if (bDia < aDia) meses -= 1;
  if (meses <= 0) return restante;
  return arredondar(restante / meses);
}

export function primeiroPendente(rec: Recorrente, hoje: string): string | null {
  const [ano, mes] = hoje.split('-').map(Number);
  if (rec.frequencia === 'mensal') {
    const cand = dataDoDia(ano, mes, Math.min(rec.dia, diasNoMes(ano, mes)));
    return cand <= hoje ? cand : null;
  }
  for (let i = 0; i < 7; i++) {
    const d = somarDias(hoje, -i);
    if (new Date(d + 'T00:00:00').getDay() === rec.dia) return d <= hoje ? d : null;
  }
  return null;
}

export function gerarRecorrentesPendentes(
  recorrentes: Recorrente[],
  hoje: string
): { novos: NovoLancamento[]; atualizados: Recorrente[] } {
  const novos: NovoLancamento[] = [];
  const atualizados: Recorrente[] = [];
  for (const rec of recorrentes) {
    if (!rec.ativo) continue;
    const primeiro = rec.ultimo_processado ? proximoVencimento(rec, rec.ultimo_processado) : primeiroPendente(rec, hoje);
    if (!primeiro) continue;
    const datas: string[] = [];
    let d = primeiro;
    while (d <= hoje) {
      datas.push(d);
      d = proximoVencimento(rec, d);
    }
    if (datas.length === 0) continue;
    for (const data of datas) {
      novos.push({
        conta_id: rec.conta_id,
        conta_destino_id: null,
        tipo: rec.tipo,
        categoria_id: rec.categoria_id,
        valor: rec.valor,
        data,
        descricao: rec.nome
      });
    }
    atualizados.push({ ...rec, ultimo_processado: datas[datas.length - 1] });
  }
  return { novos, atualizados };
}

export type StatusRecorrente =
  | { tipo: 'atrasado'; data: string }
  | { tipo: 'hoje' }
  | { tipo: 'amanha' }
  | { tipo: 'futuro'; data: string };

export function statusRecorrente(rec: Recorrente, hoje: string): StatusRecorrente {
  const amanha = somarDias(hoje, 1);

  const classificar = (data: string): StatusRecorrente => {
    if (data < hoje) return { tipo: 'atrasado', data };
    if (data === hoje) return { tipo: 'hoje' };
    if (data === amanha) return { tipo: 'amanha' };
    return { tipo: 'futuro', data };
  };

  if (!rec.ativo) {
    const base = rec.ultimo_processado ?? somarDias(hoje, -1);
    let data = proximoVencimento(rec, base);
    while (data < hoje) data = proximoVencimento(rec, data);
    return { tipo: 'futuro', data };
  }

  if (rec.ultimo_processado) {
    return classificar(proximoVencimento(rec, rec.ultimo_processado));
  }

  const pendente = primeiroPendente(rec, hoje);
  if (pendente) return classificar(pendente);
  return classificar(proximoVencimento(rec, somarDias(hoje, -1)));
}
