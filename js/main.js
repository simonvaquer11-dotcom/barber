// ===========================================
// BARBERÍA CITY — Lógica de reserva de turnos
// Habla con las funciones serverless de Netlify,
// que a su vez hablan con la base de datos real.
// ===========================================

const PRECIOS = { corte: 10000, color: 50000 };
const NOMBRE_SERVICIO = { corte: 'Corte de pelo', color: 'Color' };
const WHATSAPP_NUMERO = '5492281462597';

const estado = {
  servicio: null,
  barba: false,
  fecha: null,
  hora: null,
  nombre: '',
  telefono: ''
};

// ---------- Menú móvil ----------
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle?.addEventListener('click', () => navLinks.classList.toggle('abierto'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('abierto')));

// ---------- Navegación entre pasos ----------
function irAPaso(numero) {
  document.querySelectorAll('[data-paso-panel]').forEach(panel => {
    panel.hidden = panel.dataset.pasoPanel !== String(numero);
  });
  document.querySelectorAll('.paso-dot').forEach(dot => {
    dot.classList.toggle('activo', Number(dot.dataset.paso) <= Number(numero));
  });
}

document.querySelectorAll('[data-volver]').forEach(btn => {
  btn.addEventListener('click', () => irAPaso(btn.dataset.volver));
});

// Atajos "Reservar corte" / "Reservar color" desde la sección de servicios
document.querySelectorAll('[data-servicio]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reservar').scrollIntoView({ behavior: 'smooth' });
    seleccionarServicio(btn.dataset.servicio);
  });
});

// ---------- Paso 1: servicio ----------
function seleccionarServicio(valor) {
  estado.servicio = valor;
  document.querySelectorAll('.opcion-card').forEach(card => {
    card.classList.toggle('seleccionada', card.dataset.valor === valor);
  });
  const barbaWrap = document.getElementById('barbaWrap');
  if (valor === 'corte') {
    barbaWrap.style.display = 'flex';
  } else {
    barbaWrap.style.display = 'none';
    document.getElementById('barbaCheck').checked = false;
  }
  document.getElementById('btnPaso1').disabled = false;
}

document.querySelectorAll('.opcion-card').forEach(card => {
  card.addEventListener('click', () => seleccionarServicio(card.dataset.valor));
});

document.getElementById('btnPaso1').addEventListener('click', () => {
  estado.barba = estado.servicio === 'corte' && document.getElementById('barbaCheck').checked;
  irAPaso(2);
});

// ---------- Paso 2: fecha ----------
const fechaInput = document.getElementById('fechaInput');
const hoy = new Date().toISOString().split('T')[0];
fechaInput.min = hoy;

fechaInput.addEventListener('change', () => {
  document.getElementById('btnPaso2').disabled = !fechaInput.value;
});

document.getElementById('btnPaso2').addEventListener('click', async () => {
  estado.fecha = fechaInput.value;
  estado.hora = null;
  irAPaso(3);
  await cargarHorarios();
});

// ---------- Paso 3: horarios ----------
async function cargarHorarios() {
  const grid = document.getElementById('horariosGrid');
  const estadoTxt = document.getElementById('horariosEstado');
  grid.innerHTML = '';
  estadoTxt.textContent = 'Cargando horarios…';
  document.getElementById('btnPaso3').disabled = true;

  try {
    const resp = await fetch(`/.netlify/functions/get-availability?fecha=${estado.fecha}`);
    const data = await resp.json();

    if (!resp.ok) throw new Error(data.error || 'No se pudo cargar la disponibilidad.');

    if (data.diaBloqueado || data.horarios.length === 0) {
      estadoTxt.textContent = 'No hay horarios disponibles para esta fecha. Probá con otro día.';
      return;
    }

    estadoTxt.textContent = '';
    data.horarios.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'horario-btn';
      btn.textContent = h.hora.slice(0, 5);
      btn.type = 'button';
      if (h.estado !== 'disponible') {
        btn.disabled = true;
        btn.textContent += h.estado === 'reservado' ? ' · reservado' : ' · no disp.';
      } else {
        btn.addEventListener('click', () => {
          estado.hora = h.hora;
          grid.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('seleccionado'));
          btn.classList.add('seleccionado');
          document.getElementById('btnPaso3').disabled = false;
        });
      }
      grid.appendChild(btn);
    });
  } catch (err) {
    estadoTxt.textContent = 'Ocurrió un error al cargar los horarios. Intentá de nuevo.';
    console.error(err);
  }
}

document.getElementById('btnPaso3').addEventListener('click', () => irAPaso(4));

// ---------- Paso 4: datos ----------
const nombreInput = document.getElementById('nombreInput');
const telInput = document.getElementById('telInput');

function validarPaso4() {
  document.getElementById('btnPaso4').disabled = !(nombreInput.value.trim() && telInput.value.trim());
}
nombreInput.addEventListener('input', validarPaso4);
telInput.addEventListener('input', validarPaso4);

document.getElementById('btnPaso4').addEventListener('click', () => {
  estado.nombre = nombreInput.value.trim();
  estado.telefono = telInput.value.trim();
  mostrarResumen();
  irAPaso(5);
});

// ---------- Paso 5: resumen + confirmación ----------
function mostrarResumen() {
  const total = PRECIOS[estado.servicio];
  const box = document.getElementById('resumenBox');
  box.innerHTML = `
    <div class="fila"><span>Servicio</span><span>${NOMBRE_SERVICIO[estado.servicio]}</span></div>
    ${estado.servicio === 'corte' ? `<div class="fila"><span>Retoque de barba</span><span>${estado.barba ? 'Sí — Gratis' : 'No'}</span></div>` : ''}
    <div class="fila"><span>Fecha</span><span>${formatearFecha(estado.fecha)}</span></div>
    <div class="fila"><span>Hora</span><span>${estado.hora.slice(0,5)}</span></div>
    <div class="fila total"><span>Total</span><span class="valor">$${total.toLocaleString('es-AR')}</span></div>
  `;
  document.getElementById('reservaError').innerHTML = '';
}

function formatearFecha(f) {
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

document.getElementById('btnConfirmar').addEventListener('click', async (e) => {
  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Confirmando…';
  document.getElementById('reservaError').innerHTML = '';

  try {
    const resp = await fetch('/.netlify/functions/crear-reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: estado.nombre,
        telefono: estado.telefono,
        servicio: estado.servicio,
        barba: estado.barba,
        fecha: estado.fecha,
        hora: estado.hora
      })
    });
    const data = await resp.json();

    if (resp.status === 409) {
      document.getElementById('reservaError').innerHTML =
        `<div class="mensaje-error">Este horario acaba de ser reservado por otra persona. Elegí otro horario.</div>`;
      irAPaso(3);
      await cargarHorarios();
      return;
    }

    if (!resp.ok) throw new Error(data.error || 'No se pudo confirmar la reserva.');

    prepararWhatsapp();
    irAPaso('ok');
  } catch (err) {
    document.getElementById('reservaError').innerHTML =
      `<div class="mensaje-error">Ocurrió un error al confirmar tu turno. Probá de nuevo en unos segundos.</div>`;
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirmar turno';
  }
});

function prepararWhatsapp() {
  let texto;
  if (estado.servicio === 'corte' && estado.barba) {
    texto = `Hola Barbería City! Reservé un turno para Corte de pelo + retoque de barba gratis. Fecha: ${formatearFecha(estado.fecha)}. Hora: ${estado.hora.slice(0,5)}. Nombre: ${estado.nombre}.`;
  } else if (estado.servicio === 'corte') {
    texto = `Hola Barbería City! Reservé un turno para Corte de pelo. Fecha: ${formatearFecha(estado.fecha)}. Hora: ${estado.hora.slice(0,5)}. Nombre: ${estado.nombre}.`;
  } else {
    texto = `Hola Barbería City! Reservé un turno para Color. Fecha: ${formatearFecha(estado.fecha)}. Hora: ${estado.hora.slice(0,5)}. Nombre: ${estado.nombre}.`;
  }
  document.getElementById('btnWhatsapp').href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}
