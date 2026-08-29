const { getSupabase, verificarAdmin } = require('./_supabase');

exports.handler = async (event) => {
  if (!verificarAdmin(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado.' }) };
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('horarios_config')
        .select('*')
        .order('dia_semana', { ascending: true });
      if (error) throw error;
      return { statusCode: 200, body: JSON.stringify({ config: data }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo leer la configuración.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch { body = {}; }
    const { config } = body; // array de { dia_semana, hora_inicio, hora_fin, intervalo_minutos, activo }

    if (!Array.isArray(config)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Formato inválido.' }) };
    }

    try {
      // Reemplaza toda la configuración semanal por la nueva enviada desde el panel.
      const { error: errDelete } = await supabase.from('horarios_config').delete().neq('id', 0);
      if (errDelete) throw errDelete;

      if (config.length > 0) {
        const { error: errInsert } = await supabase.from('horarios_config').insert(config);
        if (errInsert) throw errInsert;
      }

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo guardar la configuración.' }) };
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
};
