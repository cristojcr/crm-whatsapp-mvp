// apps/api/src/config/supabaseAdmin.js
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Criando supabaseAdmin...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'OK' : 'UNDEFINED');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'UNDEFINED');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('✅ supabaseAdmin criado:', typeof supabaseAdmin);
console.log('✅ Tem .from?', typeof supabaseAdmin.from);

module.exports = supabaseAdmin;