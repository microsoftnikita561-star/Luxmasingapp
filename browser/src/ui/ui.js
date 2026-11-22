'use strict';
const $ = (id) => document.getElementById(id);
const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const ICONS = {
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  forward: svg('<path d="M9 18l6-6-6-6"/>'),
  reload: svg('<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>'),
  stop: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  x: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  star: svg('<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
  shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  moon: svg('<path d="M20 15A8 8 0 1 1 9 4a6 6 0 0 0 11 11z"/>'),
  sound: svg('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'),
};

$('newtab').innerHTML = ICONS.plus;
$('back').innerHTML = ICONS.back;
$('forward').innerHTML = ICONS.forward;
$('reload').innerHTML = ICONS.reload;
$('star').innerHTML = ICONS.star;
$('shield').querySelector('span').innerHTML = ICONS.shield;
$('menubtn').innerHTML = ICONS.menu;

let state = { tabs: [], settings: {} };
let editing = false;
let suggestions = [];
let selected = -1;
let menuOpen = false;

const address = $('address');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---------- tabs ----------
let dragId = null;
function renderTabs() {
  const box = $('tabs');
  box.textContent = '';
  const narrow = state.tabs.length > 12;
  for (const t of state.tabs) {
    const tab = el('div', 'tab');
    if (t.id === state.activeId) tab.classList.add('active');
    if (t.sleeping) tab.classList.add('sleeping');
    if (narrow) tab.classList.add('narrow');
    tab.title = t.title + (t.sleeping ? ' — спит, память освобождена' : '');
    if (t.loading) tab.append(el('div', 'spin'));
    else if (t.favicon) {
      const img = el('img', 'fav');
      img.src = t.favicon;
      img.onerror = () => img.replaceWith(el('div', 'fav blank'));
      tab.append(img);
    } else tab.append(el('div', 'fav blank'));
    tab.append(el('div', 'title', t.title));
    if (t.audible) {
      const b = el('span', 'badge');
      b.innerHTML = ICONS.sound;
      b.querySelector('svg').setAttribute('width', '13');
      tab.append(b);
    } else if (t.sleeping) {
      const b = el('span', 'badge');
      b.innerHTML = ICONS.moon;
      b.querySelector('svg').setAttribute('width', '12');
      tab.append(b);
    }
    const x = el('button', 'x');
    x.innerHTML = ICONS.x;
    x.querySelector('svg').setAttribute('width', '12');
    x.title = 'Закрыть (Ctrl+W)';
    x.onclick = (e) => {
      e.stopPropagation();
      lux.send('close-tab', t.id);
    };
    tab.append(x);
    tab.onmousedown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        lux.send('close-tab', t.id);
      } else if (e.button === 0) lux.send('activate', t.id);
    };
    tab.draggable = true;
    tab.ondragstart = () => {
      dragId = t.id;
      tab.classList.add('dragging');
    };
    tab.ondragend = () => {
      dragId = null;
      tab.classList.remove('dragging');
    };
    tab.ondragover = (e) => e.preventDefault();
    tab.ondrop = (e) => {
      e.preventDefault();
      if (dragId == null || dragId === t.id) return;
      lux.send('move-tab', dragId, state.tabs.findIndex((x2) => x2.id === t.id));
    };
    box.append(tab);
  }
}
$('tabstrip').ondblclick = (e) => {
  if (e.target.id === 'tabstrip' || e.target.id === 'tabs') lux.send('new-tab');
};

// ---------- toolbar ----------
function render() {
  renderTabs();
  $('back').disabled = !state.canBack;
  $('forward').disabled = !state.canForward;
  $('reload').innerHTML = state.loading ? ICONS.stop : ICONS.reload;
  $('reload').title = state.loading ? 'Остановить' : 'Обновить (F5)';
  if (!editing) address.value = state.url || '';
  const lock = $('lock');
  lock.innerHTML = state.url ? (state.secure ? ICONS.lock : ICONS.globe) : ICONS.search;
  lock.className = `icon small${state.url && state.secure ? ' secure' : ''}`;
  lock.title = state.url ? (state.secure ? 'Защищённое соединение' : 'Соединение НЕ зашифровано') : '';
  $('star').classList.toggle('on', !!state.bookmarked);
  $('star').hidden = !state.url || !/^https?:/.test(state.url);
  $('blocked').textContent = state.settings.blockAds ? state.blocked : '—';
  $('shield').classList.toggle('off', !state.settings.blockAds);
  if (menuOpen) fillMenu();
}

$('back').onclick = () => lux.send('back');
$('forward').onclick = () => lux.send('forward');
$('reload').onclick = () => lux.send(state.loading ? 'stop' : 'reload');
$('newtab').onclick = () => lux.send('new-tab');
$('star').onclick = () => lux.send('bookmark');
$('shield').onclick = () => toggleMenu(true);
$('menubtn').onclick = () => toggleMenu(!menuOpen);

// ---------- overlay (dropdowns drawn over the page) ----------
function syncOverlay() {
  const on = menuOpen || !$('suggest').hidden;
  lux.send('overlay', on);
}
document.addEventListener('mousedown', (e) => {
  if (e.target === document.body || e.target === document.documentElement) {
    closeSuggest();
    toggleMenu(false);
    address.blur();
  }
});

// ---------- address bar ----------
let skipMouseUp = false;
address.addEventListener('focus', () => {
  editing = true;
  address.select();
  skipMouseUp = true;
});
address.addEventListener('mouseup', (e) => {
  // keep the whole address selected after the click that focused it
  if (skipMouseUp) e.preventDefault();
  skipMouseUp = false;
});
address.addEventListener('blur', () => {
  editing = false;
  setTimeout(() => {
    closeSuggest();
    if (!editing) address.value = state.url || '';
  }, 150);
});

let reqNo = 0;
address.addEventListener('input', async () => {
  const q = address.value;
  const my = ++reqNo;
  const list = q.trim() ? await lux.invoke('suggest', q) : [];
  if (my !== reqNo) return;
  suggestions = q.trim() ? [{ kind: 'search', title: q.trim(), url: null }, ...list] : [];
  selected = -1;
  drawSuggest();
});

function drawSuggest() {
  const box = $('suggest');
  box.textContent = '';
  if (!suggestions.length || !editing) {
    closeSuggest();
    return;
  }
  suggestions.forEach((sug, i) => {
    const row = el('div', `sug${i === selected ? ' sel' : ''}`);
    const k = el('span', 'k');
    k.innerHTML = sug.kind === 'search' ? ICONS.search : sug.kind === 'bookmark' ? ICONS.star : ICONS.clock;
    k.querySelector('svg').setAttribute('width', '14');
    row.append(k, el('span', 't', sug.kind === 'search' ? `${sug.title} — ${state.engines?.[state.settings.search] || 'поиск'}` : sug.title));
    if (sug.url) row.append(el('span', 'u', sug.url.replace(/^https?:\/\/(www\.)?/, '')));
    row.onmousedown = (e) => {
      e.preventDefault();
      go(sug);
    };
    row.onmouseenter = () => sug.url && lux.send('preconnect', sug.url);
    box.append(row);
  });
  if (box.hidden) {
    box.hidden = false;
    syncOverlay();
  }
}

function closeSuggest() {
  if ($('suggest').hidden) return;
  $('suggest').hidden = true;
  suggestions = [];
  syncOverlay();
}

function go(sug) {
  const target = sug ? sug.url || sug.title : address.value;
  closeSuggest();
  editing = false;
  if (target.trim()) lux.send('navigate', target);
  address.blur();
}

address.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!suggestions.length) return;
    e.preventDefault();
    const n = suggestions.length;
    selected += e.key === 'ArrowDown' ? 1 : -1;
    if (selected >= n) selected = -1;
    if (selected < -1) selected = n - 1;
    drawSuggest();
    const s = suggestions[selected];
    if (s && s.url) lux.send('preconnect', s.url);
  } else if (e.key === 'Escape') {
    closeSuggest();
    address.value = state.url || '';
    address.select();
  }
});
$('omnibox').addEventListener('submit', (e) => {
  e.preventDefault();
  go(selected >= 0 ? suggestions[selected] : null);
});

// ---------- menu ----------
function toggleMenu(open) {
  if (open === menuOpen) return;
  menuOpen = open;
  $('menu').hidden = !open;
  if (open) {
    closeSuggest();
    fillMenu();
  }
  syncOverlay();
}

async function fillMenu() {
  const st = await lux.invoke('stats');
  $('m-mem').textContent = `${st.memoryMb} МБ`;
  $('m-tabs').textContent = `${st.tabs} / ${st.sleeping}`;
  $('m-blocked').textContent = st.blockerReady ? st.blockedTotal.toLocaleString('ru-RU') : 'загрузка…';
  const engines = $('engines');
  if (!engines.options.length && state.engines) {
    for (const [k, name] of Object.entries(state.engines)) {
      const o = el('option', null, name);
      o.value = k;
      engines.append(o);
    }
  }
  for (const input of document.querySelectorAll('[data-key]')) {
    const v = state.settings[input.dataset.key];
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = String(v);
  }
}

for (const input of document.querySelectorAll('[data-key]')) {
  input.addEventListener('change', () => {
    let v;
    if (input.type === 'checkbox') v = input.checked;
    else if ('num' in input.dataset) v = Number(input.value);
    else v = input.value;
    lux.send('set', input.dataset.key, v);
  });
}
$('sleepall').onclick = () => {
  lux.send('sleep-all');
  setTimeout(fillMenu, 600);
};
$('clear').onclick = async () => {
  $('clear').textContent = 'Стираю…';
  await lux.invoke('clear-data');
  $('clear').textContent = 'Готово — всё стёрто';
  setTimeout(() => ($('clear').textContent = 'Стереть все данные сайтов и историю'), 2000);
};

// ---------- wiring ----------
let focusPending = false;
lux.on('state', (st) => {
  state = st;
  render();
  if (focusPending) {
    focusPending = false;
    address.value = state.url || '';
    if (document.activeElement === address) address.select();
    else address.focus();
  }
});
lux.on('focus-address', () => {
  toggleMenu(false);
  focusPending = true; // main sends fresh state right after this
});
lux.send('ready');
