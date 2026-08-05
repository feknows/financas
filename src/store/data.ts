import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { gerarRecorrentesPendentes } from '../lib/finance';
import { hojeISO } from '../lib/format';
import { useToastStore } from './toast';
import type { Conta, Categoria, Lancamento, Recorrente, Limite, Meta } from '../types';

const num = (v: unknown) => Number(v ?? 0);

const mapConta = (r: any): Conta => ({
  id: r.id, nome: r.nome, tipo: r.tipo, saldo_inicial: num(r.saldo_inicial),
  cor: r.cor, ordem: r.ordem ?? 0, ativo: r.ativo ?? true
});
const mapCategoria = (r: any): Categoria => ({ id: r.id, nome: r.nome, tipo: r.tipo, cor: r.cor, ordem: r.ordem ?? 0 });
const mapLancamento = (r: any): Lancamento => ({
  id: r.id, conta_id: r.conta_id, conta_destino_id: r.conta_destino_id,
  tipo: r.tipo, categoria_id: r.categoria_id, valor: num(r.valor),
  data: r.data.slice(0, 10), descricao: r.descricao ?? ''
});
const mapRecorrente = (r: any): Recorrente => ({
  id: r.id, nome: r.nome, tipo: r.tipo, conta_id: r.conta_id, categoria_id: r.categoria_id,
  valor: num(r.valor), frequencia: r.frequencia, dia: r.dia, ativo: r.ativo ?? true,
  ultimo_processado: r.ultimo_processado
});
const mapLimite = (r: any): Limite => ({ id: r.id, categoria_id: r.categoria_id, valor_mensal: num(r.valor_mensal) });
const mapMeta = (r: any): Meta => ({
  id: r.id, nome: r.nome, valor_alvo: num(r.valor_alvo), conta_id: r.conta_id,
  data_alvo: r.data_alvo, cor: r.cor
});

interface DataState {
  contas: Conta[];
  categorias: Categoria[];
  lancamentos: Lancamento[];
  recorrentes: Recorrente[];
  limites: Limite[];
  metas: Meta[];
  carregando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
  processarRecorrentes: () => Promise<void>;
  adicionarConta: (dados: Omit<Conta, 'id'>) => Promise<void>;
  atualizarConta: (conta: Conta) => Promise<void>;
  excluirConta: (id: number) => Promise<void>;
  adicionarCategoria: (dados: Omit<Categoria, 'id'>) => Promise<void>;
  atualizarCategoria: (cat: Categoria) => Promise<void>;
  excluirCategoria: (id: number) => Promise<void>;
  adicionarLancamento: (l: Omit<Lancamento, 'id'>) => Promise<void>;
  atualizarLancamento: (l: Lancamento) => Promise<void>;
  excluirLancamento: (id: number) => Promise<void>;
  adicionarRecorrente: (dados: Omit<Recorrente, 'id' | 'ultimo_processado'>) => Promise<void>;
  atualizarRecorrente: (r: Recorrente) => Promise<void>;
  excluirRecorrente: (id: number) => Promise<void>;
  salvarLimite: (dados: Omit<Limite, 'id'>) => Promise<void>;
  excluirLimite: (id: number) => Promise<void>;
  adicionarMeta: (dados: Omit<Meta, 'id'>) => Promise<void>;
  atualizarMeta: (m: Meta) => Promise<void>;
  excluirMeta: (id: number) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  contas: [],
  categorias: [],
  lancamentos: [],
  recorrentes: [],
  limites: [],
  metas: [],
  carregando: false,
  erro: null,

  carregar: async () => {
    set({ carregando: true, erro: null });
    try {
      const [c, cat, l, r, lim, m] = await Promise.all([
        supabase.from('contas').select('*').order('ordem'),
        supabase.from('categorias').select('*').order('ordem'),
        supabase.from('lancamentos').select('*').order('data', { ascending: false }),
        supabase.from('recorrentes').select('*'),
        supabase.from('limites').select('*'),
        supabase.from('metas').select('*')
      ]);
      if (c.error) throw c.error;
      if (cat.error) throw cat.error;
      if (l.error) throw l.error;
      if (r.error) throw r.error;
      if (lim.error) throw lim.error;
      if (m.error) throw m.error;
      set({
        contas: (c.data ?? []).map(mapConta),
        categorias: (cat.data ?? []).map(mapCategoria),
        lancamentos: (l.data ?? []).map(mapLancamento),
        recorrentes: (r.data ?? []).map(mapRecorrente),
        limites: (lim.data ?? []).map(mapLimite),
        metas: (m.data ?? []).map(mapMeta)
      });
    } catch (err) {
      set({ erro: 'Não foi possível carregar os dados.' });
    } finally {
      set({ carregando: false });
    }
  },

  processarRecorrentes: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const hoje = hojeISO();
    const { novos, atualizados } = gerarRecorrentesPendentes(get().recorrentes, hoje);
    if (novos.length === 0) return;
    const linhas = novos.map((n) => ({ ...n, user_id: user.id }));
    const { error } = await supabase.from('lancamentos').insert(linhas);
    if (error) throw error;
    for (const r of atualizados) {
      await supabase.from('recorrentes').update({ ultimo_processado: r.ultimo_processado }).eq('id', r.id);
    }
    await get().carregar();
  },

  adicionarConta: async (dados) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('contas').insert({ ...dados, user_id: user.id }).select().single();
    if (error) throw error;
    set({ contas: [...get().contas, mapConta(data)] });
  },

  atualizarConta: async (conta) => {
    const { error } = await supabase.from('contas').update({
      nome: conta.nome, tipo: conta.tipo, saldo_inicial: conta.saldo_inicial,
      cor: conta.cor, ordem: conta.ordem, ativo: conta.ativo
    }).eq('id', conta.id);
    if (error) throw error;
    set({ contas: get().contas.map((c) => (c.id === conta.id ? conta : c)) });
  },

  excluirConta: async (id) => {
    const antes = get().contas;
    const item = antes.find((x) => x.id === id);
    const indice = antes.findIndex((x) => x.id === id);
    set({ contas: antes.filter((x) => x.id !== id) });
    const restaurar = () => {
      const atual = [...get().contas];
      atual.splice(indice, 0, item!);
      set({ contas: atual });
    };
    let cancelado = false;
    useToastStore.getState().mostrar('Conta excluída', () => {
      cancelado = true;
      restaurar();
    });
    setTimeout(async () => {
      if (cancelado) return;
      try {
        const { error } = await supabase.from('contas').delete().eq('id', id);
        if (error) restaurar();
      } catch {
        restaurar();
      }
    }, 6000);
  },

  adicionarCategoria: async (dados) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('categorias').insert({ ...dados, user_id: user.id }).select().single();
    if (error) throw error;
    set({ categorias: [...get().categorias, mapCategoria(data)] });
  },

  atualizarCategoria: async (cat) => {
    const { error } = await supabase.from('categorias').update({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor, ordem: cat.ordem }).eq('id', cat.id);
    if (error) throw error;
    set({ categorias: get().categorias.map((c) => (c.id === cat.id ? cat : c)) });
  },

  excluirCategoria: async (id) => {
    const antes = get().categorias;
    const item = antes.find((x) => x.id === id);
    const indice = antes.findIndex((x) => x.id === id);
    set({ categorias: antes.filter((x) => x.id !== id) });
    const restaurar = () => {
      const atual = [...get().categorias];
      atual.splice(indice, 0, item!);
      set({ categorias: atual });
    };
    let cancelado = false;
    useToastStore.getState().mostrar('Categoria excluída', () => {
      cancelado = true;
      restaurar();
    });
    setTimeout(async () => {
      if (cancelado) return;
      try {
        const { error } = await supabase.from('categorias').delete().eq('id', id);
        if (error) restaurar();
      } catch {
        restaurar();
      }
    }, 6000);
  },

  adicionarLancamento: async (l) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const temp = { ...l, id: Date.now() * -1 };
    set({ lancamentos: [temp, ...get().lancamentos] });
    const { data, error } = await supabase.from('lancamentos').insert({ ...l, user_id: user.id }).select().single();
    if (error) {
      set({ lancamentos: get().lancamentos.filter((x) => x.id !== temp.id) });
      throw error;
    }
    set({ lancamentos: get().lancamentos.map((x) => (x.id === temp.id ? mapLancamento(data) : x)) });
  },

  atualizarLancamento: async (l) => {
    const antes = get().lancamentos;
    set({ lancamentos: antes.map((x) => (x.id === l.id ? l : x)) });
    const { error } = await supabase.from('lancamentos').update({
      conta_id: l.conta_id, conta_destino_id: l.conta_destino_id, tipo: l.tipo,
      categoria_id: l.categoria_id, valor: l.valor, data: l.data, descricao: l.descricao
    }).eq('id', l.id);
    if (error) { set({ lancamentos: antes }); throw error; }
  },

  excluirLancamento: async (id) => {
    const antes = get().lancamentos;
    const item = antes.find((x) => x.id === id);
    const indice = antes.findIndex((x) => x.id === id);
    set({ lancamentos: antes.filter((x) => x.id !== id) });
    const restaurar = () => {
      const atual = [...get().lancamentos];
      atual.splice(indice, 0, item!);
      set({ lancamentos: atual });
    };
    let cancelado = false;
    useToastStore.getState().mostrar('Lançamento excluído', () => {
      cancelado = true;
      restaurar();
    });
    setTimeout(async () => {
      if (cancelado) return;
      try {
        const { error } = await supabase.from('lancamentos').delete().eq('id', id);
        if (error) restaurar();
      } catch {
        restaurar();
      }
    }, 6000);
  },

  adicionarRecorrente: async (dados) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('recorrentes').insert({ ...dados, user_id: user.id }).select().single();
    if (error) throw error;
    set({ recorrentes: [...get().recorrentes, mapRecorrente(data)] });
  },

  atualizarRecorrente: async (r) => {
    const { error } = await supabase.from('recorrentes').update({
      nome: r.nome, tipo: r.tipo, conta_id: r.conta_id, categoria_id: r.categoria_id,
      valor: r.valor, frequencia: r.frequencia, dia: r.dia, ativo: r.ativo
    }).eq('id', r.id);
    if (error) throw error;
    set({ recorrentes: get().recorrentes.map((x) => (x.id === r.id ? r : x)) });
  },

  excluirRecorrente: async (id) => {
    const antes = get().recorrentes;
    const item = antes.find((x) => x.id === id);
    const indice = antes.findIndex((x) => x.id === id);
    set({ recorrentes: antes.filter((x) => x.id !== id) });
    const restaurar = () => {
      const atual = [...get().recorrentes];
      atual.splice(indice, 0, item!);
      set({ recorrentes: atual });
    };
    let cancelado = false;
    useToastStore.getState().mostrar('Recorrente excluída', () => {
      cancelado = true;
      restaurar();
    });
    setTimeout(async () => {
      if (cancelado) return;
      try {
        const { error } = await supabase.from('recorrentes').delete().eq('id', id);
        if (error) restaurar();
      } catch {
        restaurar();
      }
    }, 6000);
  },

  salvarLimite: async (dados) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existente = get().limites.find((x) => x.categoria_id === dados.categoria_id);
    if (existente) {
      const { error } = await supabase.from('limites').update({ valor_mensal: dados.valor_mensal }).eq('id', existente.id);
      if (error) throw error;
      set({ limites: get().limites.map((x) => (x.id === existente.id ? { ...existente, valor_mensal: dados.valor_mensal } : x)) });
      return;
    }
    const { data, error } = await supabase.from('limites').insert({ ...dados, user_id: user.id }).select().single();
    if (error) throw error;
    set({ limites: [...get().limites, mapLimite(data)] });
  },

  excluirLimite: async (id) => {
    const { error } = await supabase.from('limites').delete().eq('id', id);
    if (error) throw error;
    set({ limites: get().limites.filter((x) => x.id !== id) });
  },

  adicionarMeta: async (dados) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('metas').insert({ ...dados, user_id: user.id }).select().single();
    if (error) throw error;
    set({ metas: [...get().metas, mapMeta(data)] });
  },

  atualizarMeta: async (m) => {
    const { error } = await supabase.from('metas').update({
      nome: m.nome, valor_alvo: m.valor_alvo, conta_id: m.conta_id, data_alvo: m.data_alvo, cor: m.cor
    }).eq('id', m.id);
    if (error) throw error;
    set({ metas: get().metas.map((x) => (x.id === m.id ? m : x)) });
  },

  excluirMeta: async (id) => {
    const antes = get().metas;
    const item = antes.find((x) => x.id === id);
    const indice = antes.findIndex((x) => x.id === id);
    set({ metas: antes.filter((x) => x.id !== id) });
    const restaurar = () => {
      const atual = [...get().metas];
      atual.splice(indice, 0, item!);
      set({ metas: atual });
    };
    let cancelado = false;
    useToastStore.getState().mostrar('Meta excluída', () => {
      cancelado = true;
      restaurar();
    });
    setTimeout(async () => {
      if (cancelado) return;
      try {
        const { error } = await supabase.from('metas').delete().eq('id', id);
        if (error) restaurar();
      } catch {
        restaurar();
      }
    }, 6000);
  }
}));
