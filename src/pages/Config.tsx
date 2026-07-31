import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';

export default function Config() {
  const signOut = useAuthStore((s) => s.signOut);
  const [senhaNova, setSenhaNova] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const alterarSenha = async () => {
    setMsg(null);
    if (!senhaNova || senhaNova.length < 6) { setMsg({ tipo: 'erro', texto: 'A nova senha deve ter ao menos 6 caracteres.' }); return; }
    const { error } = await supabase.auth.updateUser({ password: senhaNova });
    if (error) { setMsg({ tipo: 'erro', texto: 'Não foi possível alterar a senha.' }); return; }
    setSenhaNova('');
    setMsg({ tipo: 'ok', texto: 'Senha alterada com sucesso.' });
  };

  return (
    <div className="mx-auto max-w-lg p-5">
      <h1 className="font-display text-2xl font-bold">Configurações</h1>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Alterar senha</h2>
        <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Nova senha</label>
        <input type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line bg-paper px-3 py-2.5 outline-none focus:border-primary" />
        {msg && <p className={`mb-3 text-sm ${msg.tipo === 'ok' ? 'text-primary' : 'text-danger'}`}>{msg.texto}</p>}
        <button onClick={alterarSenha} className="w-full rounded-xl bg-primary py-3 font-semibold text-white">Alterar senha</button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs text-ink-muted">A senha é gerenciada pelo Supabase Auth.</p>
        <button onClick={signOut} className="rounded-xl border border-danger bg-paper py-3 font-semibold text-danger">Sair</button>
      </div>
    </div>
  );
}
