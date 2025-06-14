const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (CORRIGIDO)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis do Supabase não configuradas');
  console.error('URL:', supabaseUrl);
  console.error('ANON KEY:', supabaseKey ? 'OK' : 'MISSING');
  console.error('SERVICE KEY:', supabaseServiceKey ? 'OK' : 'MISSING');
} else {
  console.log('✅ Variáveis do Supabase carregadas');
}

// Cliente público (para operações com RLS)
const supabasePublic = createClient(supabaseUrl, supabaseKey);

// Cliente administrativo (bypassa RLS)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Teste de conexão
supabasePublic.from('users').select('count', { count: 'exact', head: true })
  .then(() => console.log('✅ Supabase conectado com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar Supabase:', err.message));

// Exportar o cliente principal diretamente (para compatibilidade)
module.exports = supabasePublic;

// Também exportar como objeto para uso avançado
module.exports.supabase = supabasePublic;
module.exports.supabaseAdmin = supabaseAdmin;