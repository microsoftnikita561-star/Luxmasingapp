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
  menu: svg('<circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  more: svg('<path d="M6 7l5 5-5 5M13 7l5 5-5 5"/>'),
  up: svg('<path d="M6 15l6-6 6 6"/>'),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
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
$('bmmore').innerHTML = ICONS.more;
$('findprev').innerHTML = ICONS.up;
$('findnext').innerHTML = ICONS.down;
$('findclose').innerHTML = ICONS.x;

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

function blankIcon() {
  const d = el('div', 'fav blank');
  d.innerHTML = ICONS.globe;
  return d;
}

// ---------- bookmarks bar ----------
let barKey = '';
let barOverflowFrom = -1;
function renderBar() {
  const items = state.bar || [];
  $('bmbar').hidden = !items.length;
  const key = JSON.stringify(items);
  if (key !== barKey) {
    barKey = key;
    const box = $('bmitems');
    box.textContent = '';
    items.forEach((b, i) => {
      const btn = el('button', 'bm');
      btn.title = b.folder ? b.title : `${b.title}\n${b.url}`;
      if (b.icon && !b.folder) {
        const img = el('img');
        img.src = b.icon;
        img.onerror = () => {
          const ic = el('span', 'ic');
          ic.innerHTML = ICONS.globe;
          img.replaceWith(ic);
        };
        btn.append(img);
      } else {
        const ic = el('span', 'ic');
        ic.innerHTML = b.folder ? ICONS.folder : ICONS.globe;
        btn.append(ic);
      }
      if (b.title) btn.append(el('span', null, b.title));
      const at = () => {
        const r = btn.getBoundingClientRect();
        return [r.left, r.bottom];
      };
      btn.onclick = (e) => lux.send('bar-click', i, ...at(), e.ctrlKey || e.metaKey);
      btn.onauxclick = (e) => {
        if (e.button === 1) lux.send('bar-click', i, ...at(), true);
      };
      btn.oncontextmenu = (e) => {
        e.preventDefault();
        lux.send('bar-context', i, e.clientX, e.clientY);
      };
      btn.onmouseenter = () => b.url && lux.send('preconnect', b.url);
      box.append(btn);
    });
  }
  measureBar();
}
function measureBar() {
  const kids = [...$('bmitems').children];
  barOverflowFrom = kids.findIndex((k) => k.offsetTop > kids[0].offsetTop);
  $('bmmore').hidden = barOverflowFrom < 0;
}
window.addEventListener('resize', measureBar);
$('bmmore').onclick = () => {
  const r = $('bmmore').getBoundingClientRect();
  lux.send('bar-overflow', barOverflowFrom, r.left, r.bottom);
};

// ---------- find in page ----------
const findText = $('findtext');
let lastFind = '';
function openFind() {
  toggleMenu(false);
  $('find').hidden = false;
  findText.focus();
  findText.select();
  if (findText.value) doFind(true, true);
}
function closeFind() {
  if ($('find').hidden) return;
  $('find').hidden = true;
  $('findcount').textContent = '';
  lastFind = '';
  lux.send('find-stop');
}
function doFind(forward, fresh) {
  const text = findText.value;
  if (!text) $('findcount').textContent = '';
  lux.send('find', text, forward, fresh || text !== lastFind);
  lastFind = text;
}
findText.addEventListener('input', () => doFind(true, true));
findText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doFind(!e.shiftKey, false);
  else if (e.key === 'Escape') closeFind();
});
$('findnext').onclick = () => doFind(true, false);
$('findprev').onclick = () => doFind(false, false);
$('findclose').onclick = closeFind;

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
      img.onerror = () => img.replaceWith(blankIcon());
      tab.append(img);
    } else tab.append(blankIcon());
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
let shownTab = null;
function render() {
  renderTabs();
  renderBar();
  if (shownTab !== state.activeId) {
    shownTab = state.activeId;
    closeFind();
  }
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
  $('siterow').hidden = !state.site || !state.settings.blockAds;
  $('sitelabel').textContent = `Не блокировать на ${state.site}`;
  $('siteoff').checked = !!state.siteAllowed;
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
$('siteoff').addEventListener('change', () => lux.send('toggle-site'));
const command = (id, fn) => {
  $(id).onclick = () => {
    toggleMenu(false);
    fn();
  };
};
command('c-newtab', () => lux.send('new-tab'));
command('c-history', () => lux.send('history'));
command('c-find', openFind);
command('c-import', () => lux.send('import'));
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
lux.on('open-find', openFind);
lux.on('found', (r) => {
  $('findcount').textContent = findText.value ? `${r.current}/${r.total}` : '';
});
lux.send('ready');
