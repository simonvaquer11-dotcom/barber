const { getSupabase, verificarAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (!verificarAdmin(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado.' }) };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ reservas: data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudieron obtener las reservas.' }) };
  }
};
