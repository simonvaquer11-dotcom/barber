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
  const { accion, fecha, hora, motivo } = body;

  if (!fecha || !['bloquear', 'desbloquear'].includes(accion)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Datos inválidos.' }) };
  }

  try {
    const supabase = getSupabase();

    if (accion === 'bloquear') {
      const { error } = await supabase
        .from('horarios_bloqueados')
        .insert({ fecha, hora: hora || null, motivo: motivo || null });
      if (error) throw error;
    } else {
      let query = supabase.from('horarios_bloqueados').delete().eq('fecha', fecha);
      query = hora ? query.eq('hora', hora) : query.is('hora', null);
      const { error } = await query;
      if (error) throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo actualizar el bloqueo.' }) };
  }
};
