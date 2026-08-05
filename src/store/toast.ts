import { create } from 'zustand';

interface ToastState {
  mensagem: string;
  visivel: boolean;
  onDesfazer: (() => void) | null;
  mostrar: (mensagem: string, onDesfazer: (() => void) | null) => void;
  esconder: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  mensagem: '',
  visivel: false,
  onDesfazer: null,
  mostrar: (mensagem, onDesfazer) => set({ mensagem, onDesfazer, visivel: true }),
  esconder: () => set({ visivel: false, onDesfazer: null })
}));
