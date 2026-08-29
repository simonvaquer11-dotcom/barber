// ===========================================
// BARBERÍA CITY — Panel de administración
// La contraseña vive solo en memoria del navegador
// (nunca en localStorage) y se manda en cada request
// para que el backend la valide contra la variable
// de entorno ADMIN_PASSWORD.
// ===========================================

let ADMIN_PASSWORD = '';
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function headersAdmin() {
  return { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASSWORD };
}

// ---------- Login ----------
document.getElementById('btnLogin').addEventListener('click', probarLogin);
document.getElementById('passwordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') probarLogin();
});

async function probarLogin() {
  const intento = document.getElementById('passwordInput').value;
  ADMIN_PASSWORD = intento;
  const resp = await fetch('/.netlify/functions/admin-reservas', { headers: headersAdmin() });
  if (resp.status === 401) {
    document.getElementById('loginError').textContent = 'Contraseña incorrecta.';
    ADMIN_PASSWORD = '';
    return;
  }
  document.getElementById('login').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  cargarReservas();
  cargarHorariosConfig();
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.querySelectorAll('.panel-admin').forEach(p => p.classList.remove('activo'));
    btn.classList.add('activo');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('activo');
  });
});

// ---------- Reservas ----------
document.getElementById('btnRefrescar').addEventListener('click', cargarReservas);

async function cargarReservas() {
  const tbody = document.getElementById('tablaReservas');
  tbody.innerHTML = '<tr><td colspan="8">Cargando…</td></tr>';
  const resp = await fetch('/.netlify/functions/admin-reservas', { headers: headersAdmin() });
  const data = await resp.json();
  if (!resp.ok) {
    tbody.innerHTML = `<tr><td colspan="8">Error al cargar reservas.</td></tr>`;
    return;
  }
  if (data.reservas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8">Todavía no hay reservas.</td></tr>';
    return;
  }
  tbody.innerHTML = data.reservas.map(r => `
    <tr class="${r.estado === 'cancelado' ? 'cancelado' : ''}">
      <td>${r.fecha.split('-').reverse().join('/')}</td>
      <td>${r.hora.slice(0,5)}</td>
      <td>${r.servicio === 'corte' ? 'Corte de pelo' : 'Color'}</td>
      <td>${r.servicio === 'corte' ? (r.barba ? 'Sí' : 'No') : '—'}</td>
      <td>${r.nombre}</td>
      <td>${r.telefono}</td>
      <td><span class="tag ${r.estado}">${r.estado}</span></td>
      <td>${r.estado === 'confirmado' ? `<button class="btn btn-secundario btn-mini" data-cancelar="${r.id}">Cancelar</button>` : ''}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-cancelar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Cancelar esta reserva? El horario quedará libre nuevamente.')) return;
      await fetch('/.netlify/functions/admin-cancelar', {
        method: 'POST',
        headers: headersAdmin(),
        body: JSON.stringify({ id: btn.dataset.cancelar })
      });
      cargarReservas();
    });
  });
}

// ---------- Bloqueos ----------
document.getElementById('formBloqueo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fecha = document.getElementById('bloqueoFecha').value;
  const hora = document.getElementById('bloqueoHora').value;
  const motivo = document.getElementById('bloqueoMotivo').value;
  const msg = document.getElementById('bloqueoMsg');
  msg.textContent = 'Guardando…';

  const resp = await fetch('/.netlify/functions/admin-bloquear', {
    method: 'POST',
    headers: headersAdmin(),
    body: JSON.stringify({ accion: 'bloquear', fecha, hora: hora || null, motivo })
  });

  msg.textContent = resp.ok
    ? `Bloqueado: ${fecha}${hora ? ' a las ' + hora : ' (día completo)'}.`
    : 'No se pudo bloquear ese horario.';
});

// ---------- Configuración semanal de horarios ----------
async function cargarHorariosConfig() {
  const resp = await fetch('/.netlify/functions/admin-horarios', { headers: headersAdmin() });
  const data = await resp.json();
  const configPorDia = {};
  (data.config || []).forEach(c => { configPorDia[c.dia_semana] = c; });

  const cont = document.getElementById('horariosConfigForm');
  cont.innerHTML = DIAS.map((nombre, i) => {
    const c = configPorDia[i] || {};
    return `
      <div class="fila-horario" data-dia="${i}">
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="checkbox" class="chk-activo" ${c.activo ? 'checked' : ''}> ${nombre}
        </label>
        <input type="time" class="hora-inicio" value="${c.hora_inicio ? c.hora_inicio.slice(0,5) : ''}">
        <input type="time" class="hora-fin" value="${c.hora_fin ? c.hora_fin.slice(0,5) : ''}">
        <input type="number" class="intervalo" min="10" step="5" placeholder="Minutos" value="${c.intervalo_minutos || 30}">
        <span></span>
      </div>
    `;
  }).join('');
}

document.getElementById('btnGuardarHorarios').addEventListener('click', async () => {
  const filas = document.querySelectorAll('.fila-horario');
  const config = [];
  filas.forEach(fila => {
    const activo = fila.querySelector('.chk-activo').checked;
    const horaInicio = fila.querySelector('.hora-inicio').value;
    const horaFin = fila.querySelector('.hora-fin').value;
    const intervalo = Number(fila.querySelector('.intervalo').value) || 30;
    if (activo && horaInicio && horaFin) {
      config.push({
        dia_semana: Number(fila.dataset.dia),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        intervalo_minutos: intervalo,
        activo: true
      });
    }
  });

  const msg = document.getElementById('horariosMsg');
  msg.textContent = 'Guardando…';
  const resp = await fetch('/.netlify/functions/admin-horarios', {
    method: 'POST',
    headers: headersAdmin(),
    body: JSON.stringify({ config })
  });
  msg.textContent = resp.ok ? 'Configuración guardada correctamente.' : 'No se pudo guardar.';
});
