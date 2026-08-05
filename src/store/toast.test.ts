import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore } from './toast';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ mensagem: '', visivel: false, onDesfazer: null });
  });

  it('mostrar exibe o toast com mensagem e callback de desfazer', () => {
    const fn = () => {};
    useToastStore.getState().mostrar('Conta excluída', fn);
    const s = useToastStore.getState();
    expect(s.visivel).toBe(true);
    expect(s.mensagem).toBe('Conta excluída');
    expect(s.onDesfazer).toBe(fn);
  });

  it('mostrar substitui o toast anterior', () => {
    useToastStore.getState().mostrar('Conta excluída', () => {});
    useToastStore.getState().mostrar('Meta excluída', () => {});
    expect(useToastStore.getState().mensagem).toBe('Meta excluída');
  });

  it('esconder oculta e limpa o callback', () => {
    useToastStore.getState().mostrar('Conta excluída', () => {});
    useToastStore.getState().esconder();
    const s = useToastStore.getState();
    expect(s.visivel).toBe(false);
    expect(s.onDesfazer).toBe(null);
  });
});
