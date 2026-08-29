// Cliente de Supabase compartido por todas las funciones.
// Usa la SERVICE KEY, que solo vive en variables de entorno de Netlify
// y nunca se expone al navegador del cliente.
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_KEY en Netlify.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function verificarAdmin(event) {
  const password = event.headers['x-admin-password'];
  return Boolean(password) && password === process.env.ADMIN_PASSWORD;
}

module.exports = { getSupabase, verificarAdmin };
