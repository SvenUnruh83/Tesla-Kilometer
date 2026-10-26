'use strict';

const STORAGE_KEY = 'tesla-km';
const DAY = 86400000;

const DEFAULTS = {
  settings: { start: '2026-09-22', years: 3, kmPerYear: 20000, startKm: 0 },
  readings: [] // { date: 'YYYY-MM-DD', km: Zahl }
};

const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const df = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dfLong = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------- Speicher ----------

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.settings) {
      return { settings: { ...DEFAULTS.settings, ...data.settings }, readings: data.readings || [] };
    }
  } catch (_) { /* leer oder defekt -> Standardwerte */ }
  return structuredClone(DEFAULTS);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

// ---------- Datum ----------

// 'YYYY-MM-DD' als lokales Datum (Mitternacht) interpretieren, nicht als UTC.
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function leaseEnd(s) {
  const start = parseDate(s.start);
  return new Date(start.getFullYear() + Number(s.years), start.getMonth(), start.getDate());
}

// ---------- Berechnung ----------

function compute(now = new Date()) {
  const s = state.settings;
  const start = parseDate(s.start);
  const end = leaseEnd(s);
  const totalKm = s.kmPerYear * s.years;
  const totalMs = end - start;
  const elapsedMs = Math.min(Math.max(now - start, 0), totalMs);
  const fraction = elapsedMs / totalMs;
  const totalDays = Math.round(totalMs / DAY);

  const result = {
    start, end, totalKm, totalDays, fraction,
    allowed: totalKm * fraction,
    perDayQuota: totalKm / totalDays,
    daysLeft: Math.max(0, Math.ceil((end - now) / DAY))
  };

  const last = latestReading();
  if (last) {
    const readingTime = parseDate(last.date);
    // Ende des Ablesetages, damit der Tag selbst voll zählt
    const readingMs = Math.min(Math.max(readingTime - start + DAY, 0), totalMs);
    const allowedAtReading = totalKm * (readingMs / totalMs);
    const driven = last.km - s.startKm;
    result.last = last;
    result.driven = driven;
    result.diff = allowedAtReading - driven; // positiv = Puffer
    result.remaining = totalKm - driven;
    result.perDayLeft = result.daysLeft > 0 ? result.remaining / result.daysLeft : 0;
    result.forecast = readingMs > 0 ? driven / (readingMs / totalMs) : null;
  }
  return result;
}

function latestReading() {
  if (!state.readings.length) return null;
  return [...state.readings].sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km).at(-1);
}

// ---------- Anzeige ----------

function signed(n) {
  const v = Math.round(n);
  return (v > 0 ? '+' : v < 0 ? '−' : '±') + nf.format(Math.abs(v)) + ' km';
}

function render() {
  const now = new Date();
  const r = compute(now);
  const s = state.settings;

  $('today').textContent = dfLong.format(now);
  $('allowed').textContent = nf.format(r.allowed);
  $('time-bar').style.width = (r.fraction * 100).toFixed(2) + '%';
  $('lease-progress').textContent = now < r.start
    ? `Leasing beginnt am ${df.format(r.start)}`
    : `${(r.fraction * 100).toFixed(1).replace('.', ',')} % der Laufzeit · noch ${nf.format(r.daysLeft)} Tage`;

  $('period').textContent = `${df.format(r.start)} – ${df.format(r.end)}`;
  $('quota').textContent = `${nf.format(r.totalKm)} km (${nf.format(s.kmPerYear)}/Jahr)`;
  $('quota-day').textContent = `${r.perDayQuota.toFixed(1).replace('.', ',')} km`;

  const diffEl = $('diff');
  diffEl.className = 'diff';
  if (r.last) {
    $('driven').textContent = nf.format(r.driven);
    diffEl.textContent = r.diff >= 0 ? `${nf.format(r.diff)} km Puffer` : `${nf.format(-r.diff)} km drüber`;
    diffEl.classList.add(r.diff >= 0 ? 'good' : 'bad');
    $('reading-date').textContent = `Stand vom ${df.format(parseDate(r.last.date))}: ${nf.format(r.last.km)} km`;
    $('forecast').textContent = r.forecast == null ? '–' : `${nf.format(r.forecast)} km`;
    $('forecast').style.color = r.forecast != null && r.forecast > r.totalKm ? 'var(--bad)' : '';
    $('remaining').textContent = `${nf.format(r.remaining)} km`;
    $('per-day').textContent = `${r.perDayLeft.toFixed(1).replace('.', ',')} km`;
  } else {
    $('driven').textContent = '–';
    diffEl.textContent = '–';
    $('reading-date').textContent = 'Trage unten deinen Kilometerstand ein, um den Vergleich zu sehen.';
    $('forecast').textContent = '–';
    $('remaining').textContent = `${nf.format(r.totalKm)} km`;
    $('per-day').textContent = `${r.perDayQuota.toFixed(1).replace('.', ',')} km`;
  }

  renderHistory();
  fillSettings();
}

function renderHistory() {
  const s = state.settings;
  const start = parseDate(s.start);
  const totalMs = leaseEnd(s) - start;
  const totalKm = s.kmPerYear * s.years;
  const list = $('history');
  list.innerHTML = '';
  const sorted = state.readings
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km);

  for (const r of sorted) {
    const ms = Math.min(Math.max(parseDate(r.date) - start + DAY, 0), totalMs);
    const diff = totalKm * (ms / totalMs) - (r.km - s.startKm);
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="date">${df.format(parseDate(r.date))}</span>
      <span class="km">${nf.format(r.km)} km</span>
      <span class="d ${diff >= 0 ? 'good' : 'bad'}">${signed(diff)}</span>
      <button aria-label="Eintrag löschen">×</button>`;
    li.querySelector('button').addEventListener('click', () => {
      if (confirm(`Eintrag vom ${df.format(parseDate(r.date))} löschen?`)) {
        state.readings.splice(r.i, 1);
        save();
        render();
      }
    });
    list.appendChild(li);
  }
  $('history-empty').hidden = sorted.length > 0;
}

function fillSettings() {
  const f = $('settings-form');
  if (f.contains(document.activeElement)) return;
  for (const [k, v] of Object.entries(state.settings)) f.elements[k].value = v;
}

// ---------- Eingaben ----------

$('reading-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const km = Number($('odo').value);
  if (!Number.isFinite(km) || km < 0) return;
  const last = latestReading();
  if (last && km < last.km && !confirm(`Der neue Stand ist kleiner als der letzte (${nf.format(last.km)} km). Trotzdem speichern?`)) return;

  const today = toISO(new Date());
  const existing = state.readings.find((r) => r.date === today);
  if (existing) existing.km = km;
  else state.readings.push({ date: today, km });
  save();
  $('odo').value = '';
  $('odo').blur();
  render();
});

$('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target.elements;
  state.settings = {
    start: f.start.value,
    years: Number(f.years.value),
    kmPerYear: Number(f.kmPerYear.value),
    startKm: Number(f.startKm.value)
  };
  save();
  document.activeElement.blur();
  render();
});

$('export').addEventListener('click', async () => {
  const name = `tesla-kilometer-${toISO(new Date())}.json`;
  const file = new File([JSON.stringify(state, null, 2)], name, { type: 'application/json' });
  // Auf dem iPhone öffnet das Teilen-Menü (Dateien, iCloud Drive, AirDrop …)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (_) { /* abgebrochen */ return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.settings || !Array.isArray(data.readings)) throw new Error();
    if (!confirm('Aktuelle Daten durch das Backup ersetzen?')) return;
    state = { settings: { ...DEFAULTS.settings, ...data.settings }, readings: data.readings };
    save();
    render();
  } catch (_) {
    alert('Die Datei ist kein gültiges Backup.');
  } finally {
    e.target.value = '';
  }
});

// Beim Zurückkehren in die App neu berechnen
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setInterval(render, 60000);

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
