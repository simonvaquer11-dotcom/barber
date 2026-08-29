const { getSupabase } = require('./_supabase');

// Genera la lista de horarios de una franja, ej: 09:00, 09:30, 10:00...
function generarHorarios(horaInicio, horaFin, intervaloMinutos) {
  const horarios = [];
  let [h, m] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);
  while (h < hFin || (h === hFin && m < mFin)) {
    horarios.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    m += intervaloMinutos;
    if (m >= 60) { m -= 60; h += 1; }
  }
  return horarios;
}

exports.handler = async (event) => {
  const fecha = event.queryStringParameters?.fecha;
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Falta el parámetro fecha (YYYY-MM-DD).' }) };
  }

  try {
    const supabase = getSupabase();
    const diaSemana = new Date(`${fecha}T00:00:00`).getDay();

    // 1. ¿Está bloqueado el día completo?
    const { data: bloqueos, error: errBloqueos } = await supabase
      .from('horarios_bloqueados')
      .select('hora')
      .eq('fecha', fecha);
    if (errBloqueos) throw errBloqueos;

    const diaBloqueadoCompleto = bloqueos.some(b => b.hora === null);
    if (diaBloqueadoCompleto) {
      return { statusCode: 200, body: JSON.stringify({ diaBloqueado: true, horarios: [] }) };
    }
    const horasBloqueadas = new Set(bloqueos.filter(b => b.hora !== null).map(b => b.hora));

    // 2. Franja configurada para ese día de la semana
    const { data: config, error: errConfig } = await supabase
      .from('horarios_config')
      .select('hora_inicio, hora_fin, intervalo_minutos')
      .eq('dia_semana', diaSemana)
      .eq('activo', true);
    if (errConfig) throw errConfig;

    if (!config || config.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ diaBloqueado: false, horarios: [] }) };
    }

    let todosLosHorarios = [];
    config.forEach(franja => {
      todosLosHorarios = todosLosHorarios.concat(
        generarHorarios(franja.hora_inicio, franja.hora_fin, franja.intervalo_minutos)
      );
    });
    todosLosHorarios = [...new Set(todosLosHorarios)].sort();

    // 3. Turnos ya confirmados ese día
    const { data: reservas, error: errReservas } = await supabase
      .from('bookings')
      .select('hora')
      .eq('fecha', fecha)
      .eq('estado', 'confirmado');
    if (errReservas) throw errReservas;
    const horasReservadas = new Set(reservas.map(r => r.hora));

    const horarios = todosLosHorarios.map(hora => {
      let estadoSlot = 'disponible';
      if (horasReservadas.has(hora)) estadoSlot = 'reservado';
      else if (horasBloqueadas.has(hora)) estadoSlot = 'bloqueado';
      return { hora, estado: estadoSlot };
    });

    return { statusCode: 200, body: JSON.stringify({ diaBloqueado: false, horarios }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al calcular la disponibilidad.' }) };
  }
};
