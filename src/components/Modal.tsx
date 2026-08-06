import type { ReactNode } from 'react';

interface ModalProps {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

export default function Modal({ aberto, titulo, onFechar, children }: ModalProps) {
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-surface p-5 pb-[calc(2rem_+_env(safe-area-inset-bottom))] shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="rounded-full bg-raised px-3 py-1 text-sm text-ink-muted">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
