import { createClient } from '@supabase/supabase-js';

const SURL = import.meta.env.VITE_SUPABASE_URL;
const SKEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SURL || !SKEY) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá .env.example a .env y completá los valores.'
  );
}

export const sb = createClient(SURL, SKEY);
