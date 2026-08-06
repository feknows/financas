import { createClient } from '@supabase/supabase-js';

const urlComEspaco = 'https://rimcimibsnvjpnvqxkqv.supabase.co ';
const keyComEspaco = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbWNpbWlic252anBudnF4a3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDY5ODYsImV4cCI6MjEwMTUyMjk4Nn0.SZ3YAgUncuDpQ-kbzYqvZSdYX3POTExDyl3Pp48KC-Q ';

try {
  const c = createClient(urlComEspaco, keyComEspaco);
  console.log('createClient com espaco: OK');
  const r = await c.auth.getSession();
  console.log('getSession: erro =', r.error ? r.error.message : 'sem erro');
} catch (e) {
  console.log('createClient com espaco THROW:', e.message);
}

const c2 = createClient('https://rimcimibsnvjpnvqxkqv.supabase.co', keyComEspaco);
const r2 = await c2.auth.getSession();
console.log('getSession (url limpa): erro =', r2.error ? r2.error.message : 'sem erro');
