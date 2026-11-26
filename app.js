import { CATEGORIES, categoryById, categoryIndex, guessCategory } from './categories.js';
import { createBackend, hasFirebase } from './backend.js';

// ---------- Hilfsfunktionen ----------
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const keyOf = name => String(name).trim().toLowerCase().replace(/\s+/g, ' ').replace(/\//g, '∕');
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);

const LS = { household: 'einkauf-household', list: 'einkauf-list' };

const DEFAULT_LISTS = ['Supermarkt', 'Drogerie'];
const DEFAULT_STAPLES = ['Milch', 'Eier', 'Butter', 'Brot', 'Käse', 'Joghurt', 'Zwiebeln', 'Kartoffeln', 'Nudeln', 'Reis', 'Kaffee', 'Toilettenpapier', 'Spülmittel'];

const state = {
  lists: [], items: [], catalog: [],
  listId: localStorage.getItem(LS.list),
  view: 'list',
  loaded: { lists: false, items: false, catalog: false },
};
let backend = null;
let unsubs = [];

// ---------- "Mengen" erkennen: "2 Milch", "500g Hack", "2x Brot" ----------
const QTY_RE = /^\s*(\d+(?:[.,]\d+)?\s*(?:x|×|stk\.?|stück|g|gr|kg|ml|l|liter|pck\.?|packung(?:en)?|pkg|dosen?|flaschen?|bund|becher|gläser|glas|netz|tüten?)?)\s+(.+)$/i;
function parseInput(text) {
  const m = text.match(QTY_RE);
  if (m) return { qty: m[1].replace(/\s+/g, ' ').trim(), name: cap(m[2].trim()) };
  return { qty: '', name: cap(text.trim()) };
}

// ---------- Datenzugriff ----------
const currentList = () => state.lists.find(l => l.id === state.listId) || state.lists[0];
const catalogEntry = name => state.catalog.find(c => c.id === keyOf(name));
const listName = id => state.lists.find(l => l.id === id)?.name || '';
const openItemFor = key => state.items.find(i => !i.checked && keyOf(i.name) === key);

function touchCatalog(name, category, listId, extra = {}) {
  const e = catalogEntry(name);
  backend.set('catalog', keyOf(name), {
    name, category, listId,
    staple: e?.staple || false,
    count: (e?.count || 0) + 1,
    lastUsed: Date.now(),
    ...extra,
  });
}

function addItem({ name, qty = '', note = '', listId, category }) {
  if (!name) return;
  const list = listId || currentList()?.id;
  if (!list) return;
  const key = keyOf(name);
  const known = catalogEntry(name);
  const cat = category || known?.category || guessCategory(name);

  const existing = state.items.find(i => i.listId === list && keyOf(i.name) === key);
  if (existing) {
    const patch = { checked: false, checkedAt: null };
    if (qty) patch.qty = qty;
    if (note) patch.note = note;
    backend.set('items', existing.id, patch);
    if (!existing.checked) toast(`${existing.name} steht schon auf der Liste`);
    flash(existing.id);
    return existing.id;
  }
  const id = backend.add('items', {
    listId: list, name: known?.name || name, qty, note, category: cat,
    checked: false, createdAt: Date.now(), checkedAt: null,
  });
  touchCatalog(known?.name || name, cat, list);
  return id;
}

function toggleItem(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  backend.set('items', id, { checked: !it.checked, checkedAt: it.checked ? null : Date.now() });
}

function clearDone(listId) {
  const done = state.items.filter(i => i.listId === listId && i.checked);
  if (!done.length) return;
  done.forEach(i => backend.remove('items', i.id));
  toast(`${done.length} ${done.length === 1 ? 'Artikel' : 'Artikel'} entfernt`, 'Rückgängig', () => {
    done.forEach(({ id, ...data }) => backend.set('items', id, data));
  });
}

function deleteItem(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  backend.remove('items', id);
  const { id: _, ...data } = it;
  toast(`${it.name} gelöscht`, 'Rückgängig', () => backend.set('items', id, data));
}

// Vorrat: antippen = auf die Liste / wieder runter
function toggleStaple(key) {
  const entry = state.catalog.find(c => c.id === key);
  if (!entry) return;
  const open = openItemFor(key);
  if (open) {
    backend.remove('items', open.id);
    return;
  }
  const listId = state.lists.some(l => l.id === entry.listId) ? entry.listId : currentList()?.id;
  addItem({ name: entry.name, listId, category: entry.category, qty: entry.qty || '', note: entry.note || '' });
}

function setStar(key, on) {
  backend.set('catalog', key, { staple: on });
}

// ---------- Haushalt / Start ----------
function newHouseholdCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I/L
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  return raw.match(/.{4}/g).join('-');
}
const normCode = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g)?.join('-') || '';

function seed() {
  const now = Date.now();
  const ids = DEFAULT_LISTS.map((name, i) => backend.add('lists', { name, order: i, createdAt: now + i }));
  DEFAULT_STAPLES.forEach(name => {
    const category = guessCategory(name);
    const listId = ['drogerie', 'haushalt'].includes(category) ? ids[1] : ids[0];
    backend.set('catalog', keyOf(name), { name, category, listId, staple: true, count: 0, lastUsed: 0 });
  });
  state.listId = ids[0];
  localStorage.setItem(LS.list, ids[0]);
}

async function start(hid, { isNew = false } = {}) {
  unsubs.forEach(u => u());
  unsubs = [];
  backend = await createBackend(hid);
  if (isNew || (backend.mode === 'local' && !(await backend.exists()))) seed();

  for (const col of ['lists', 'items', 'catalog']) {
    unsubs.push(backend.subscribe(col, docs => {
      state[col] = col === 'lists' ? docs.sort(byOrder) : docs;
      state.loaded[col] = true;
      render();
    }));
  }
  $('#setup').hidden = true;
  renderStatus();
}

function renderSetup(prefill = '', error = '') {
  const el = $('#setup');
  el.hidden = false;
  el.innerHTML = `
    <div class="setup-inner">
      <div class="logo">🛒</div>
      <h1>Einkauf</h1>
      <p>Eine gemeinsame Einkaufsliste für euren Haushalt. Einer legt den Haushalt an, der andere gibt den Code ein.</p>
      <button class="btn block" id="setup-new">Neuen Haushalt anlegen</button>
      <div class="or">— oder Code vom Partner eingeben —</div>
      <form id="setup-join">
        <label class="field"><input id="setup-code" placeholder="XXXX-XXXX-XXXX" value="${esc(prefill)}" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>
        <button class="btn secondary block" type="submit">Beitreten</button>
      </form>
      <div class="error" id="setup-error">${esc(error)}</div>
    </div>`;

  $('#setup-new').onclick = async () => {
    const code = newHouseholdCode();
    setBusy(true);
    try {
      await start(code, { isNew: true });
      localStorage.setItem(LS.household, code);
      showView('settings');
      toast('Haushalt angelegt – teile jetzt den Code');
    } catch (e) {
      console.error(e);
      $('#setup-error').textContent = 'Verbindung fehlgeschlagen. Bist du online?';
    } finally { setBusy(false); }
  };

  $('#setup-join').onsubmit = async ev => {
    ev.preventDefault();
    const code = normCode($('#setup-code').value);
    if (code.replace(/-/g, '').length !== 12) {
      $('#setup-error').textContent = 'Der Code hat 12 Zeichen, z. B. K7QM-3XPA-9TRB';
      return;
    }
    setBusy(true);
    try {
      const b = await createBackend(code);
      if (!(await b.exists())) {
        $('#setup-error').textContent = 'Kein Haushalt mit diesem Code gefunden.';
        return;
      }
      localStorage.setItem(LS.household, code);
      await start(code);
      toast('Willkommen im Haushalt! 🎉');
    } catch (e) {
      console.error(e);
      $('#setup-error').textContent = 'Verbindung fehlgeschlagen. Bist du online?';
    } finally { setBusy(false); }
  };
}

function setBusy(on) {
  document.querySelectorAll('#setup button').forEach(b => { b.disabled = on; b.style.opacity = on ? .5 : 1; });
}

function readJoinHash() {
  const m = location.hash.match(/join=([A-Za-z0-9-]+)/);
  if (!m) return '';
  history.replaceState(null, '', location.pathname + location.search);
  return normCode(m[1]);
}

// ---------- Darstellung ----------
function render() {
  if (!backend) return;
  if (state.view === 'list') renderList();
  else if (state.view === 'staples') renderStaples();
  else renderSettings();
}

function renderStatus() {
  const el = $('#status');
  el.className = 'badge';
  if (!hasFirebase) { el.textContent = 'Demo'; el.classList.add('warn'); }
  else if (!navigator.onLine) { el.textContent = 'Offline'; el.classList.add('warn'); }
  else el.textContent = '';
}

function renderTabs() {
  const cur = currentList();
  $('#list-tabs').innerHTML = state.lists.map(l => {
    const n = state.items.filter(i => i.listId === l.id && !i.checked).length;
    return `<button data-list="${esc(l.id)}" class="${l.id === cur?.id ? 'active' : ''}">${esc(l.name)}${n ? `<span class="count">${n}</span>` : ''}</button>`;
  }).join('') + `<button data-action="new-list" aria-label="Neue Liste">＋</button>`;
}

function itemRow(it) {
  const staple = catalogEntry(it.name)?.staple;
  return `<li class="item ${it.checked ? 'done' : ''}" data-id="${esc(it.id)}" data-action="toggle">
    <span class="check"></span>
    <div class="txt">
      <span class="name">${esc(it.name)}</span>${it.qty ? `<span class="qty">${esc(it.qty)}</span>` : ''}${staple ? '<span class="star" title="Stammartikel">★</span>' : ''}
      ${it.note ? `<div class="note">${esc(it.note)}</div>` : ''}
    </div>
    <button class="icon-btn" data-action="edit" aria-label="Bearbeiten">⋯</button>
  </li>`;
}

function groupByCategory(arr, sortFn) {
  const groups = new Map();
  [...arr].sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category) || sortFn(a, b))
    .forEach(x => {
      const c = categoryById(x.category).id;
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(x);
    });
  return groups;
}

function renderList() {
  renderTabs();
  renderSuggestions();
  const body = $('#list-body');
  const list = currentList();
  if (!state.loaded.lists || !state.loaded.items) { body.innerHTML = '<div class="empty">Lädt …</div>'; return; }
  if (!list) {
    body.innerHTML = `<div class="empty"><div class="big">🗒️</div><p>Noch keine Liste.</p><button class="btn" data-action="new-list">Liste anlegen</button></div>`;
    return;
  }
  const items = state.items.filter(i => i.listId === list.id);
  const open = items.filter(i => !i.checked);
  const done = items.filter(i => i.checked).sort((a, b) => (b.checkedAt || 0) - (a.checkedAt || 0));

  if (!items.length) {
    body.innerHTML = `<div class="empty"><div class="big">✨</div>
      <p><strong>${esc(list.name)}</strong> ist leer.</p>
      <p>Tippe oben etwas ein oder hol dir Artikel aus dem Vorrat.</p>
      <p style="margin-top:16px"><button class="btn secondary" data-action="goto-staples">🏠 Zum Vorrat</button></p></div>`;
    return;
  }

  let html = '';
  if (!open.length) html += `<div class="empty" style="padding-top:28px"><div class="big">🎉</div><p>Alles im Wagen!</p></div>`;
  for (const [cid, arr] of groupByCategory(open, (a, b) => (a.createdAt || 0) - (b.createdAt || 0))) {
    const c = categoryById(cid);
    html += `<div class="group"><div class="group-title">${c.icon} ${esc(c.name)}</div><ul class="card">${arr.map(itemRow).join('')}</ul></div>`;
  }
  if (done.length) {
    html += `<div class="done-head"><div class="group-title">✓ Im Wagen (${done.length})</div>
      <button class="link-btn" data-action="clear-done">Erledigte entfernen</button></div>
      <ul class="card">${done.map(itemRow).join('')}</ul>`;
  }
  body.innerHTML = html;
}

function renderSuggestions() {
  const el = $('#suggest');
  const q = $('#add-input').value.trim();
  if (!q) { el.innerHTML = ''; return; }
  const { name } = parseInput(q);
  const k = keyOf(name);
  if (!k) { el.innerHTML = ''; return; }
  const list = currentList();
  const onList = new Set(state.items.filter(i => i.listId === list?.id && !i.checked).map(i => keyOf(i.name)));
  const hits = state.catalog
    .filter(c => c.id !== k && !onList.has(c.id) && c.id.includes(k))
    .sort((a, b) => (b.id.startsWith(k) - a.id.startsWith(k)) || (b.count || 0) - (a.count || 0))
    .slice(0, 6);
  el.innerHTML = hits.map(c => `<button type="button" data-suggest="${esc(c.id)}">${esc(c.name)}</button>`).join('');
}

function stapleRow(c) {
  const on = !!openItemFor(c.id);
  const sub = state.lists.length > 1 ? listName(c.listId) : '';
  return `<li class="stap ${on ? 'on' : ''}" data-key="${esc(c.id)}" data-action="stap-toggle">
    <span class="check"></span>
    <div class="txt"><span class="name">${esc(c.name)}</span>${c.qty ? `<span class="qty">${esc(c.qty)}</span>` : ''}${on ? ' <span class="sub">· auf der Liste</span>' : sub ? ` <span class="sub">· ${esc(sub)}</span>` : ''}
      ${c.note ? `<div class="note">${esc(c.note)}</div>` : ''}</div>
    <button class="icon-btn star-btn ${c.staple ? 'on' : ''}" data-action="star" aria-label="${c.staple ? 'Kein Stammartikel mehr' : 'Als Stammartikel merken'}">${c.staple ? '★' : '☆'}</button>
    <button class="icon-btn" data-action="edit-cat" aria-label="Bearbeiten">⋯</button>
  </li>`;
}

function renderStaples() {
  const body = $('#staples-body');
  if (!state.loaded.catalog) { body.innerHTML = '<div class="empty">Lädt …</div>'; return; }
  const staples = state.catalog.filter(c => c.staple);
  const others = state.catalog.filter(c => !c.staple && (c.count || 0) > 0)
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastUsed || 0) - (a.lastUsed || 0));
  const missing = staples.filter(c => openItemFor(c.id)).length;

  let html = `<div class="group-title" style="margin-top:6px">🏠 Immer im Haus${staples.length ? ` · ${missing} von ${staples.length} auf der Liste` : ''}</div>`;
  if (!staples.length) {
    html += `<div class="card" style="padding:16px;color:var(--muted);font-size:15px">Noch keine Stammartikel. Füge oben welche hinzu oder tippe unten bei einem Artikel auf ☆.</div>`;
  }
  for (const [cid, arr] of groupByCategory(staples, (a, b) => a.name.localeCompare(b.name, 'de'))) {
    const c = categoryById(cid);
    html += `<div class="group"><div class="group-title">${c.icon} ${esc(c.name)}</div><ul class="card">${arr.map(stapleRow).join('')}</ul></div>`;
  }

  html += `<div class="group" style="margin-top:28px"><div class="group-title">🕘 Ab und zu gekauft</div>`;
  html += others.length
    ? `<ul class="card">${others.slice(0, 60).map(stapleRow).join('')}</ul><p class="hint">Alles, was ihr schon mal eingetragen habt. Mit ☆ wird ein Artikel zum Stammartikel.</p>`
    : `<div class="card" style="padding:16px;color:var(--muted);font-size:15px">Hier erscheinen Artikel, die ihr gelegentlich kauft – zum schnellen Wieder-Hinzufügen.</div>`;
  html += `</div>`;
  body.innerHTML = html;
}

function renderSettings() {
  const code = localStorage.getItem(LS.household);
  const body = $('#settings-body');
  let html = '';

  if (!hasFirebase) {
    html += `<div class="group"><div class="card" style="padding:14px 16px">
      <strong>⚠️ Demo-Modus</strong>
      <p class="hint" style="margin:6px 0 0">Die Daten liegen nur auf diesem Gerät. Damit ihr beide dieselbe Liste seht, muss Firebase eingerichtet werden (siehe Anleitung in der README).</p>
    </div></div>`;
  } else if (code) {
    html += `<div class="group"><div class="group-title">👫 Haushalt</div><div class="card">
      <div class="set-row"><div class="grow"><div class="code">${esc(code)}</div>
        <div class="hint" style="margin:4px 0 0">Mit diesem Code tritt dein Partner bei.</div></div></div>
      <div class="btn-row">
        <button class="btn" data-action="share">Einladen</button>
        <button class="btn secondary" data-action="copy-code">Code kopieren</button>
      </div></div></div>`;
  }

  html += `<div class="group"><div class="group-title">🗒️ Listen</div><ul class="card">
    ${state.lists.map((l, i) => `<li class="set-row" data-list-id="${esc(l.id)}">
      <div class="grow">${esc(l.name)}</div>
      <button class="icon-btn" data-action="list-up" aria-label="Nach oben" ${i === 0 ? 'disabled style="opacity:.25"' : ''}>↑</button>
      <button class="icon-btn" data-action="list-rename" aria-label="Umbenennen">✎</button>
      <button class="icon-btn" data-action="list-delete" aria-label="Löschen" style="color:var(--danger)">🗑</button>
    </li>`).join('')}
    <li class="set-row"><button class="link-btn" data-action="new-list">＋ Neue Liste</button></li>
  </ul></div>`;

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone) {
    html += `<div class="group"><div class="group-title">📲 Auf den Home-Bildschirm</div><div class="card">
      <ol class="steps">
        <li>Diese Seite in <strong>Safari</strong> öffnen</li>
        <li>Unten auf <strong>Teilen</strong> (□↑) tippen</li>
        <li><strong>„Zum Home-Bildschirm“</strong> wählen</li>
        <li>Danach die App über das neue Icon öffnen und den Haushalts-Code eingeben</li>
      </ol></div></div>`;
  }

  if (hasFirebase && code) {
    html += `<div class="group" style="text-align:center;margin-top:28px">
      <button class="btn danger" data-action="leave">Haushalt auf diesem Gerät verlassen</button></div>`;
  }
  body.innerHTML = html;
}

// ---------- Bearbeiten (Bottom Sheet) ----------
function openSheet(html, onMount) {
  const wrap = $('#sheet');
  $('#sheet-body').innerHTML = html;
  wrap.hidden = false;
  onMount?.($('#sheet-body'));
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-body').innerHTML = ''; }

const categoryOptions = sel => CATEGORIES.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('');
const listOptions = sel => state.lists.map(l => `<option value="${esc(l.id)}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)}</option>`).join('');

function editItem(id) {
  const it = state.items.find(i => i.id === id);
  if (!it) return;
  const entry = catalogEntry(it.name);
  openSheet(`
    <h2>Artikel bearbeiten</h2>
    <form id="edit-form">
      <label class="field"><span>Name</span><input name="name" value="${esc(it.name)}" required></label>
      <label class="field"><span>Menge</span><input name="qty" value="${esc(it.qty)}" placeholder="z. B. 2, 500 g, 1 Pck."></label>
      <label class="field"><span>Notiz</span><input name="note" value="${esc(it.note)}" placeholder="z. B. laktosefrei, Bio"></label>
      <label class="field"><span>Kategorie</span><select name="category">${categoryOptions(categoryById(it.category).id)}</select></label>
      ${state.lists.length > 1 ? `<label class="field"><span>Liste</span><select name="listId">${listOptions(it.listId)}</select></label>` : ''}
      <label class="toggle"><input type="checkbox" name="staple" ${entry?.staple ? 'checked' : ''}>
        <div class="grow">Immer im Haus<small>Erscheint im Vorrat zum schnellen Nachkaufen</small></div></label>
      <div class="sheet-actions">
        <button type="button" class="btn danger" data-sheet="delete">Löschen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>`, root => {
    root.querySelector('[data-sheet="delete"]').onclick = () => { closeSheet(); deleteItem(id); };
    root.querySelector('#edit-form').onsubmit = ev => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const name = cap(String(f.get('name')).trim());
      if (!name) return;
      const patch = {
        name,
        qty: String(f.get('qty') || '').trim(),
        note: String(f.get('note') || '').trim(),
        category: f.get('category'),
        listId: f.get('listId') || it.listId,
      };
      backend.set('items', id, patch);
      const e = catalogEntry(name);
      backend.set('catalog', keyOf(name), {
        name, category: patch.category, listId: patch.listId,
        qty: patch.qty, note: patch.note,
        staple: f.get('staple') === 'on',
        count: e?.count || 1, lastUsed: Date.now(),
      });
      closeSheet();
    };
  });
}

function editCatalog(key) {
  const c = state.catalog.find(x => x.id === key);
  if (!c) return;
  openSheet(`
    <h2>${esc(c.name)}</h2>
    <form id="cat-form">
      <label class="field"><span>Übliche Menge</span><input name="qty" value="${esc(c.qty)}" placeholder="z. B. 2, 500 g"></label>
      <label class="field"><span>Notiz</span><input name="note" value="${esc(c.note)}" placeholder="z. B. bio, Denns"></label>
      <label class="field"><span>Kategorie</span><select name="category">${categoryOptions(categoryById(c.category).id)}</select></label>
      ${state.lists.length > 1 ? `<label class="field"><span>Kommt auf die Liste</span><select name="listId">${listOptions(c.listId)}</select></label>` : ''}
      <label class="toggle"><input type="checkbox" name="staple" ${c.staple ? 'checked' : ''}>
        <div class="grow">Immer im Haus<small>Stammartikel, der nie ausgehen soll</small></div></label>
      <div class="sheet-actions">
        <button type="button" class="btn danger" data-sheet="delete">Vergessen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>`, root => {
    root.querySelector('[data-sheet="delete"]').onclick = () => {
      closeSheet();
      backend.remove('catalog', key);
      const { id: _, ...data } = c;
      toast(`${c.name} vergessen`, 'Rückgängig', () => backend.set('catalog', key, data));
    };
    root.querySelector('#cat-form').onsubmit = ev => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      backend.set('catalog', key, {
        qty: String(f.get('qty') || '').trim(),
        note: String(f.get('note') || '').trim(),
        category: f.get('category'),
        listId: f.get('listId') || c.listId,
        staple: f.get('staple') === 'on',
      });
      closeSheet();
    };
  });
}

// ---------- Listen verwalten ----------
function newList() {
  const name = prompt('Name der neuen Liste (z. B. Baumarkt, Türkischer Markt):');
  if (!name?.trim()) return;
  const order = Math.max(-1, ...state.lists.map(l => l.order ?? 0)) + 1;
  const id = backend.add('lists', { name: name.trim(), order, createdAt: Date.now() });
  selectList(id);
  showView('list');
}

function selectList(id) {
  state.listId = id;
  localStorage.setItem(LS.list, id);
  render();
}

function renameList(id) {
  const l = state.lists.find(x => x.id === id);
  const name = prompt('Neuer Name:', l?.name);
  if (name?.trim()) backend.set('lists', id, { name: name.trim() });
}

function deleteList(id) {
  const l = state.lists.find(x => x.id === id);
  if (!l) return;
  const n = state.items.filter(i => i.listId === id).length;
  if (!confirm(`Liste „${l.name}“${n ? ` mit ${n} Artikel(n)` : ''} wirklich löschen?`)) return;
  state.items.filter(i => i.listId === id).forEach(i => backend.remove('items', i.id));
  backend.remove('lists', id);
  if (state.listId === id) state.listId = null;
}

function moveListUp(id) {
  const i = state.lists.findIndex(l => l.id === id);
  if (i <= 0) return;
  const reordered = [...state.lists];
  [reordered[i - 1], reordered[i]] = [reordered[i], reordered[i - 1]];
  reordered.forEach((l, idx) => { if (l.order !== idx) backend.set('lists', l.id, { order: idx }); });
}

// ---------- Ansichten & Toast ----------
function showView(view) {
  state.view = view;
  for (const v of ['list', 'staples', 'settings']) $(`#view-${v}`).hidden = v !== view;
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  window.scrollTo(0, 0);
  render();
}

let toastTimer;
function toast(msg, actionLabel, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ''}`;
  el.hidden = false;
  if (actionLabel) el.querySelector('button').onclick = () => { action(); el.hidden = true; };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, actionLabel ? 5000 : 2200);
}

function flash(id) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`.item[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

// ---------- Ereignisse ----------
function bindEvents() {
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]');
    if (b) showView(b.dataset.view);
  });

  $('#list-tabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'new-list') newList();
    else selectList(b.dataset.list);
  });

  const input = $('#add-input');
  $('#add-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const parsed = parseInput(text);
    const id = addItem(parsed);
    input.value = '';
    renderSuggestions();
    if (id) flash(id);
  });
  input.addEventListener('input', renderSuggestions);
  $('#suggest').addEventListener('click', e => {
    const b = e.target.closest('[data-suggest]');
    if (!b) return;
    const entry = state.catalog.find(c => c.id === b.dataset.suggest);
    const { qty } = parseInput(input.value);
    addItem({ name: entry.name, qty, category: entry.category });
    input.value = '';
    renderSuggestions();
    input.focus();
  });

  $('#list-body').addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const id = a.closest('[data-id]')?.dataset.id;
    switch (a.dataset.action) {
      case 'toggle': toggleItem(id); break;
      case 'edit': editItem(id); break;
      case 'clear-done': clearDone(currentList().id); break;
      case 'new-list': newList(); break;
      case 'goto-staples': showView('staples'); break;
    }
  });

  $('#staple-form').addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('#staple-input');
    const name = cap(inp.value.trim());
    if (!name) return;
    const e0 = catalogEntry(name);
    const category = e0?.category || guessCategory(name);
    const listId = e0?.listId && state.lists.some(l => l.id === e0.listId) ? e0.listId : currentList()?.id;
    backend.set('catalog', keyOf(name), {
      name: e0?.name || name, category, listId, staple: true,
      count: e0?.count || 0, lastUsed: e0?.lastUsed || 0,
    });
    inp.value = '';
    toast(`${name} gehört jetzt zum Vorrat`);
  });

  $('#staples-body').addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const key = a.closest('[data-key]')?.dataset.key;
    const entry = state.catalog.find(c => c.id === key);
    switch (a.dataset.action) {
      case 'stap-toggle': toggleStaple(key); break;
      case 'star': setStar(key, !entry?.staple); break;
      case 'edit-cat': editCatalog(key); break;
    }
  });

  $('#settings-body').addEventListener('click', async e => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const id = a.closest('[data-list-id]')?.dataset.listId;
    const code = localStorage.getItem(LS.household);
    const link = `${location.origin}${location.pathname}#join=${code}`;
    switch (a.dataset.action) {
      case 'new-list': newList(); break;
      case 'list-rename': renameList(id); break;
      case 'list-delete': deleteList(id); break;
      case 'list-up': moveListUp(id); break;
      case 'copy-code':
        try { await navigator.clipboard.writeText(code); toast('Code kopiert'); } catch { prompt('Code:', code); }
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({ title: 'Einkauf', text: `Tritt unserer Einkaufsliste bei! Code: ${code}`, url: link }).catch(() => {});
        } else {
          try { await navigator.clipboard.writeText(link); toast('Einladungslink kopiert'); } catch { prompt('Link:', link); }
        }
        break;
      case 'leave':
        if (!confirm('Haushalt auf diesem Gerät verlassen? Die Liste bleibt für deinen Partner erhalten. Du kannst mit dem Code jederzeit wieder beitreten.')) return;
        localStorage.removeItem(LS.household);
        location.reload();
        break;
    }
  });

  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);
}

// ---------- Los geht's ----------
async function boot() {
  bindEvents();
  const joinCode = readJoinHash();
  const hid = localStorage.getItem(LS.household);

  if (!hasFirebase) { await start('local'); return; }

  if (joinCode && joinCode !== hid) {
    if (!hid || confirm('Du bist schon in einem Haushalt. Zum neuen Haushalt wechseln?')) {
      renderSetup(joinCode);
      return;
    }
  }
  if (!hid) { renderSetup(); return; }
  try {
    await start(hid);
  } catch (e) {
    console.error(e);
    toast('Verbindung fehlgeschlagen – versuche es gleich nochmal');
  }
}

boot();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
