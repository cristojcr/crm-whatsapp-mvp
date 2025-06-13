const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis do Supabase não configuradas: SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias');
}

// Cliente público (para operações com RLS)
const supabasePublic = createClient(supabaseUrl, supabaseKey);

// Cliente administrativo (bypassa RLS)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

module.exports = {
  supabase: supabasePublic,
  supabaseAdmin,
  supabaseUrl,
  supabaseKey
};