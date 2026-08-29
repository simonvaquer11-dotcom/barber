const { getSupabase } = require('./_supabase');

const PRECIOS = { corte: 10000, color: 50000 };

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  const { nombre, telefono, servicio, fecha, hora } = body;
  let { barba } = body;

  // Validación en el backend: nunca confiar solo en el frontend.
  if (!nombre || !telefono || !servicio || !fecha || !hora) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos obligatorios.' }) };
  }
  if (!['corte', 'color'].includes(servicio)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Servicio inválido.' }) };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}(:\d{2})?$/.test(hora)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Fecha u hora inválida.' }) };
  }
  // La barba solo existe como opción gratuita del corte. Nunca es un servicio propio ni con costo.
  barba = servicio === 'corte' ? Boolean(barba) : false;

  const horaNormalizada = hora.length === 5 ? `${hora}:00` : hora;
  const precio = PRECIOS[servicio];

  try {
    const supabase = getSupabase();

    // El índice único (fecha, hora) con estado='confirmado' en la base de datos
    // es la verdadera protección contra doble reserva: si dos personas
    // confirman al mismo tiempo, solo una de las dos inserciones va a tener éxito.
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        nombre,
        telefono,
        servicio,
        barba,
        fecha,
        hora: horaNormalizada,
        precio,
        estado: 'confirmado'
      })
      .select()
      .single();

    if (error) {
      // Código 23505 = violación de restricción única (Postgres)
      if (error.code === '23505') {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'Este horario acaba de ser reservado por otra persona.' })
        };
      }
      throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, reserva: data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo crear la reserva.' }) };
  }
};
