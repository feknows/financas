export type TipoConta = 'corrente' | 'investimento' | 'especie' | 'cartao';

export interface Conta {
  id: number;
  nome: string;
  tipo: TipoConta;
  saldo_inicial: number;
  cor: string;
  ordem: number;
  ativo: boolean;
}

export type TipoCategoria = 'receita' | 'despesa';

export interface Categoria {
  id: number;
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  ordem: number;
}

export type TipoLancamento = 'receita' | 'despesa' | 'transferencia';

export interface Lancamento {
  id: number;
  conta_id: number;
  conta_destino_id: number | null;
  tipo: TipoLancamento;
  categoria_id: number | null;
  valor: number;
  data: string; // 'YYYY-MM-DD'
  descricao: string;
}

export interface NovoLancamento {
  conta_id: number;
  conta_destino_id: number | null;
  tipo: TipoLancamento;
  categoria_id: number | null;
  valor: number;
  data: string;
  descricao: string;
}

export interface Recorrente {
  id: number;
  nome: string;
  tipo: TipoCategoria;
  conta_id: number;
  categoria_id: number | null;
  valor: number;
  frequencia: 'mensal' | 'semanal';
  dia: number;
  ativo: boolean;
  ultimo_processado: string | null;
}

export interface Limite {
  id: number;
  categoria_id: number;
  valor_mensal: number;
}

export interface Meta {
  id: number;
  nome: string;
  valor_alvo: number;
  conta_id: number;
  data_alvo: string | null;
  cor: string;
}
