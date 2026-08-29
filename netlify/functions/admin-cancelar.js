const { getSupabase, verificarAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (!verificarAdmin(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch { body = {}; }
  const { id } = body;
  if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Falta el id de la reserva.' }) };

  try {
    const supabase = getSupabase();
    // Al pasar a "cancelado", el índice único (fecha,hora) deja de aplicar
    // sobre esta fila, así que el horario vuelve a quedar disponible.
    const { error } = await supabase
      .from('bookings')
      .update({ estado: 'cancelado' })
      .eq('id', id);

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo cancelar la reserva.' }) };
  }
};
