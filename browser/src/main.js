const {
  app, BaseWindow, WebContentsView, session, ipcMain, Menu, clipboard, dialog, protocol, net,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const Store = require('./store');
const privacy = require('./privacy');

const TOP = 80; // height of the tab strip + toolbar
const NEWTAB = 'lux://newtab/';

app.setName('LuxBrowser');
const dataDir = app.getPath('userData');

const settings = new Store(dataDir, 'settings', {
  search: 'duckduckgo',
  sleepMinutes: 10, // 0 = never put background tabs to sleep
  blockAds: true,
  blockThirdPartyCookies: true,
  stripParams: true,
  sendDnt: true,
  secureDns: 'cloudflare', // or quad9 / adguard / off
  saveHistory: true,
  clearOnExit: false,
  restoreTabs: true,
  ecoMode: false, // fewer renderer processes (needs restart)
});
const s = settings.data;
const history = new Store(dataDir, 'history', []);
const bookmarks = new Store(dataDir, 'bookmarks', []);
const stats = new Store(dataDir, 'stats', { blocked: 0 });
const lastSession = new Store(dataDir, 'session', { tabs: [], active: 0 });

// ---------- Chromium switches: no telemetry, less background work, less memory ----------
const sw = app.commandLine;
sw.appendSwitch('disable-background-networking');
sw.appendSwitch('disable-component-update');
sw.appendSwitch('disable-domain-reliability');
sw.appendSwitch('disable-breakpad');
sw.appendSwitch('disable-client-side-phishing-detection');
sw.appendSwitch('no-pings'); // <a ping> hyperlink auditing
sw.appendSwitch('no-default-browser-check');
sw.appendSwitch('enable-quic');
sw.appendSwitch(
  'disable-features',
  [
    'SpareRendererForSitePerProcess', // a pre-spawned idle renderer just in case — costs RAM
    'BrowsingTopics', 'InterestGroupStorage', 'FledgeInterestGroups', 'PrivacySandboxAdsAPIs',
    'AttributionReportingCrossAppWeb', 'Fledge', 'Topics', 'MediaRouter', 'OptimizationHints',
    'InterestFeedContentSuggestions', 'AutofillServerCommunication',
  ].join(','),
);
if (s.ecoMode) sw.appendSwitch('renderer-process-limit', '4');

protocol.registerSchemesAsPrivileged([
  { scheme: 'lux', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

// ---------- state ----------
let win;
let ui; // WebContentsView with the browser chrome
let tabSession;
let blocker = null;
let blockerOn = false;
let overlay = false;
let fullscreen = false;
let nextId = 1;
const tabs = []; // { id, view, url, title, favicon, loading, audible, lastActive, blocked, saved }
let activeId = null;
const closed = [];
const permissionMemory = new Map();

const activeTab = () => tabs.find((t) => t.id === activeId);
const searchUrl = (q) => (privacy.SEARCH_ENGINES[s.search] || privacy.SEARCH_ENGINES.duckduckgo).url.replace('%s', encodeURIComponent(q));

// ---------- layout ----------
function layout() {
  if (!win) return;
  const { width, height } = win.getContentBounds();
  ui.setBounds(fullscreen ? { x: 0, y: 0, width: 0, height: 0 } : { x: 0, y: 0, width, height: overlay ? height : TOP });
  const t = activeTab();
  if (t && t.view) {
    t.view.setBounds(fullscreen ? { x: 0, y: 0, width, height } : { x: 0, y: TOP, width, height: Math.max(0, height - TOP) });
  }
}

function setOverlay(on) {
  overlay = !!on;
  if (overlay) win.contentView.addChildView(ui); // re-adding moves it on top
  layout();
}

// ---------- state for the UI ----------
let pushQueued = false;
function push() {
  if (pushQueued) return;
  pushQueued = true;
  setImmediate(() => {
    pushQueued = false;
    if (!ui || ui.webContents.isDestroyed()) return;
    const t = activeTab();
    const wc = t && t.view ? t.view.webContents : null;
    const url = t ? (wc ? wc.getURL() || t.url : t.url) : '';
    ui.webContents.send('state', {
      tabs: tabs.map((x) => ({
        id: x.id,
        title: x.title || (x.url === NEWTAB ? 'Новая вкладка' : x.url),
        favicon: x.favicon || '',
        loading: x.loading,
        sleeping: !x.view,
        audible: x.audible,
      })),
      activeId,
      url: url.startsWith(NEWTAB) ? '' : url,
      secure: url.startsWith('https://') || url.startsWith('lux:'),
      canBack: !!(wc && wc.navigationHistory.canGoBack()),
      canForward: !!(wc && wc.navigationHistory.canGoForward()),
      loading: !!(t && t.loading),
      blocked: t ? t.blocked : 0,
      bookmarked: bookmarks.data.some((b) => b.url === url),
      settings: s,
      engines: Object.fromEntries(Object.entries(privacy.SEARCH_ENGINES).map(([k, v]) => [k, v.name])),
    });
  });
}

// ---------- tabs ----------
function createView(tab) {
  const view = new WebContentsView({
    webPreferences: {
      session: tabSession,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false, // the spellchecker downloads dictionaries and costs memory
      backgroundThrottling: true,
      safeDialogs: true,
    },
  });
  view.setBackgroundColor('#ffffff');
  const wc = view.webContents;
  tab.view = view;
  wc.setWebRTCIPHandlingPolicy('disable_non_proxied_udp'); // no local IP leaks via WebRTC

  wc.setWindowOpenHandler(({ url, disposition, features }) => {
    // real popups (OAuth sign-in windows etc.) need window.opener, so keep them as windows
    if (disposition === 'new-window' && features) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: { autoHideMenuBar: true, width: 600, height: 700 },
      };
    }
    openTab(url, { background: disposition === 'background-tab', after: tab.id });
    return { action: 'deny' };
  });
  wc.on('did-create-window', (child) => {
    child.webContents.setWindowOpenHandler(({ url }) => {
      openTab(url);
      return { action: 'deny' };
    });
  });

  wc.on('page-title-updated', (_e, title) => {
    tab.title = title;
    const h = history.data[0];
    if (h && h.url === wc.getURL()) {
      h.title = title;
      history.save();
    }
    push();
  });
  wc.on('page-favicon-updated', (_e, icons) => {
    tab.favicon = icons[0] || '';
    push();
  });
  wc.on('did-start-loading', () => {
    tab.loading = true;
    push();
  });
  wc.on('did-stop-loading', () => {
    tab.loading = false;
    push();
  });
  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) {
      tab.blocked = 0;
      tab.favicon = '';
    }
  });
  wc.on('did-navigate', (_e, url) => {
    tab.url = url;
    addHistory(url, wc.getTitle());
    push();
  });
  wc.on('did-navigate-in-page', (_e, url, isMainFrame) => {
    if (isMainFrame) tab.url = url;
    push();
  });
  wc.on('will-navigate', (e) => {
    if (!s.stripParams || !e.isMainFrame) return;
    const clean = privacy.cleanUrl(e.url);
    if (clean !== e.url) {
      e.preventDefault();
      wc.loadURL(clean);
    }
  });
  wc.on('audio-state-changed', (e) => {
    tab.audible = e.audible;
    push();
  });
  wc.on('dom-ready', () => {
    if (wc.getURL().startsWith(NEWTAB)) {
      const data = {
        bookmarks: bookmarks.data.slice(0, 24),
        blockedTotal: stats.data.blocked,
        searchUrl: (privacy.SEARCH_ENGINES[s.search] || privacy.SEARCH_ENGINES.duckduckgo).url,
        engine: (privacy.SEARCH_ENGINES[s.search] || privacy.SEARCH_ENGINES.duckduckgo).name,
      };
      wc.executeJavaScript(`window.renderLux && window.renderLux(${JSON.stringify(data)})`).catch(() => {});
    }
  });
  wc.on('enter-html-full-screen', () => {
    fullscreen = true;
    win.setFullScreen(true);
    layout();
  });
  wc.on('leave-html-full-screen', () => {
    fullscreen = false;
    win.setFullScreen(false);
    layout();
  });
  wc.on('render-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit') return;
    tab.title = `Сбой: ${tab.title || tab.url}`;
    discard(tab, { keepHistory: false });
    if (tab.id === activeId) wake(tab);
  });
  wc.on('before-input-event', onKeys);
  wc.on('context-menu', (_e, p) => pageMenu(tab, p));
  return view;
}

function openTab(url = NEWTAB, { background = false, after = null, sleeping = false, title = '' } = {}) {
  const tab = {
    id: nextId++, view: null, url, title, favicon: '', loading: false, audible: false,
    lastActive: Date.now(), blocked: 0, saved: null,
  };
  const at = after != null ? tabs.findIndex((t) => t.id === after) : -1;
  if (at >= 0) {
    let i = at + 1;
    while (i < tabs.length && tabs[i].openedBy === after) i++;
    tab.openedBy = after;
    tabs.splice(i, 0, tab);
  } else tabs.push(tab);

  if (!sleeping) {
    createView(tab);
    tab.view.webContents.loadURL(s.stripParams ? privacy.cleanUrl(url) : url);
  }
  if (!background) activate(tab.id);
  push();
  return tab;
}

function activate(id) {
  const next = tabs.find((t) => t.id === id);
  if (!next) return;
  const prev = activeTab();
  if (prev && prev !== next && prev.view) {
    prev.lastActive = Date.now();
    win.contentView.removeChildView(prev.view);
  }
  activeId = id;
  next.lastActive = Date.now();
  if (!next.view) wake(next);
  win.contentView.addChildView(next.view);
  if (overlay) win.contentView.addChildView(ui);
  layout();
  if (next.url === NEWTAB) focusAddress();
  else next.view.webContents.focus();
  push();
}

// Destroys the page to give its memory back, but remembers where it was.
function discard(tab, { keepHistory = true } = {}) {
  if (!tab.view) return;
  const wc = tab.view.webContents;
  if (keepHistory && !wc.isDestroyed()) {
    try {
      tab.saved = {
        entries: wc.navigationHistory.getAllEntries(),
        index: wc.navigationHistory.getActiveIndex(),
      };
    } catch {
      tab.saved = null;
    }
    tab.url = wc.getURL() || tab.url;
  }
  win.contentView.removeChildView(tab.view);
  if (!wc.isDestroyed()) wc.close();
  tab.view = null;
  tab.loading = false;
  tab.audible = false;
}

function wake(tab) {
  createView(tab);
  const wc = tab.view.webContents;
  const saved = tab.saved;
  tab.saved = null;
  if (saved && saved.entries && saved.entries.length) {
    wc.navigationHistory.restore({ entries: saved.entries, index: saved.index }).catch(() => wc.loadURL(tab.url));
  } else {
    wc.loadURL(tab.url || NEWTAB);
  }
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const tab = tabs[i];
  const url = tab.view ? tab.view.webContents.getURL() : tab.url;
  if (url && url !== NEWTAB) closed.push({ url, title: tab.title });
  if (closed.length > 25) closed.shift();
  discard(tab, { keepHistory: false });
  tabs.splice(i, 1);
  for (const t of tabs) if (t.openedBy === id) t.openedBy = null;
  if (!tabs.length) {
    openTab();
    return;
  }
  if (id === activeId) {
    activeId = null;
    activate((tabs[i] || tabs[i - 1]).id);
  }
  push();
}

function sleepBackgroundTabs(force = false) {
  const limit = s.sleepMinutes * 60000;
  if (!force && !limit) return;
  const now = Date.now();
  let changed = false;
  for (const t of tabs) {
    if (t.id === activeId || !t.view || t.audible) continue;
    if (force || now - t.lastActive > limit) {
      discard(t);
      changed = true;
    }
  }
  if (changed) push();
}

function navigate(input) {
  const url = privacy.toUrl(input, s.search);
  if (!url) return;
  const t = activeTab();
  const target = s.stripParams ? privacy.cleanUrl(url) : url;
  if (!t) return openTab(target);
  if (!t.view) wake(t);
  t.view.webContents.loadURL(target);
  t.view.webContents.focus();
}

function focusAddress() {
  ui.webContents.focus();
  ui.webContents.send('focus-address');
  push();
}

function addHistory(url, title) {
  if (!s.saveHistory || !/^https?:/.test(url)) return;
  const list = history.data;
  const old = list.findIndex((h) => h.url === url);
  const visits = old >= 0 ? list[old].visits + 1 : 1;
  if (old >= 0) list.splice(old, 1);
  list.unshift({ url, title: title || url, visits, time: Date.now() });
  if (list.length > 2000) list.length = 2000;
  history.save();
}

function toggleBookmark() {
  const t = activeTab();
  if (!t) return;
  const url = t.view ? t.view.webContents.getURL() : t.url;
  if (!/^https?:/.test(url)) return;
  const i = bookmarks.data.findIndex((b) => b.url === url);
  if (i >= 0) bookmarks.data.splice(i, 1);
  else bookmarks.data.unshift({ url, title: t.title || url });
  bookmarks.save();
  push();
}

function suggest(q) {
  const text = String(q || '').trim().toLowerCase();
  if (!text) return [];
  const seen = new Set();
  const out = [];
  const add = (item, kind) => {
    if (seen.has(item.url) || out.length >= 7) return;
    if (item.url.toLowerCase().includes(text) || (item.title || '').toLowerCase().includes(text)) {
      seen.add(item.url);
      out.push({ url: item.url, title: item.title, kind });
    }
  };
  bookmarks.data.forEach((b) => add(b, 'bookmark'));
  [...history.data].sort((a, b) => b.visits - a.visits).forEach((h) => add(h, 'history'));
  // warm up the connection to the most likely destination while the user is still typing
  const guess = out[0] ? out[0].url : privacy.toUrl(text, s.search);
  if (guess) preconnect(guess);
  return out;
}

const preconnected = new Map();
function preconnect(url) {
  try {
    const origin = new URL(url).origin;
    if (!/^https?:/.test(origin)) return;
    const now = Date.now();
    if (now - (preconnected.get(origin) || 0) < 10000) return;
    preconnected.set(origin, now);
    tabSession.preconnect({ url: origin, numSockets: 1 });
  } catch {
    /* not a URL */
  }
}

async function clearData() {
  await tabSession.clearStorageData();
  await tabSession.clearCache();
  await tabSession.clearAuthCache();
  history.data.length = 0;
  history.flush();
}

function memoryUsageMb() {
  const kb = app.getAppMetrics().reduce((sum, m) => sum + (m.memory ? m.memory.workingSetSize : 0), 0);
  return Math.round(kb / 1024);
}

// ---------- menus & keys ----------
function pageMenu(tab, p) {
  const wc = tab.view.webContents;
  const t = [];
  if (p.linkURL) {
    t.push(
      { label: 'Открыть ссылку в новой вкладке', click: () => openTab(p.linkURL, { background: true, after: tab.id }) },
      { label: 'Копировать адрес ссылки', click: () => clipboard.writeText(privacy.cleanUrl(p.linkURL)) },
      { type: 'separator' },
    );
  }
  if (p.mediaType === 'image' && p.srcURL) {
    t.push(
      { label: 'Открыть картинку в новой вкладке', click: () => openTab(p.srcURL, { background: true, after: tab.id }) },
      { label: 'Сохранить картинку как…', click: () => wc.downloadURL(p.srcURL) },
      { label: 'Копировать картинку', click: () => wc.copyImageAt(p.x, p.y) },
      { type: 'separator' },
    );
  }
  if (p.isEditable) {
    t.push(
      { label: 'Вырезать', role: 'cut', enabled: p.editFlags.canCut },
      { label: 'Копировать', role: 'copy', enabled: p.editFlags.canCopy },
      { label: 'Вставить', role: 'paste', enabled: p.editFlags.canPaste },
      { label: 'Выделить всё', role: 'selectAll' },
      { type: 'separator' },
    );
  } else if (p.selectionText) {
    const sel = p.selectionText.trim();
    t.push(
      { label: 'Копировать', role: 'copy' },
      { label: `Найти «${sel.length > 24 ? `${sel.slice(0, 24)}…` : sel}»`, click: () => openTab(searchUrl(sel), { after: tab.id }) },
      { type: 'separator' },
    );
  }
  t.push(
    { label: 'Назад', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
    { label: 'Вперёд', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
    { label: 'Обновить', click: () => wc.reload() },
    { type: 'separator' },
    { label: 'Исследовать элемент', click: () => wc.inspectElement(p.x, p.y) },
  );
  Menu.buildFromTemplate(t).popup();
}

function zoom(delta) {
  const t = activeTab();
  if (!t || !t.view) return;
  const wc = t.view.webContents;
  wc.setZoomLevel(delta === 0 ? 0 : Math.max(-5, Math.min(5, wc.getZoomLevel() + delta)));
}

function onKeys(e, input) {
  if (input.type !== 'keyDown') return;
  const mod = input.control || input.meta;
  const k = (input.key || '').toLowerCase();
  const t = activeTab();
  const wc = t && t.view ? t.view.webContents : null;
  let handled = true;
  if (mod && input.shift && k === 't') {
    const c = closed.pop();
    if (c) openTab(c.url);
  } else if (mod && k === 't') openTab();
  else if (mod && k === 'n') openTab();
  else if (mod && (k === 'w' || input.key === 'F4')) closeTab(activeId);
  else if ((mod && k === 'l') || input.key === 'F6' || (input.alt && k === 'd')) focusAddress();
  else if (mod && k === 'tab') {
    const i = tabs.findIndex((x) => x.id === activeId);
    activate(tabs[(i + (input.shift ? -1 : 1) + tabs.length) % tabs.length].id);
  } else if (mod && /^[1-9]$/.test(k)) {
    const n = Number(k);
    const target = n === 9 ? tabs[tabs.length - 1] : tabs[n - 1];
    if (target) activate(target.id);
  } else if ((mod && k === 'r') || input.key === 'F5') {
    if (wc && input.shift) wc.reloadIgnoringCache();
    else if (wc) wc.reload();
  } else if (input.alt && input.key === 'ArrowLeft') {
    if (wc && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  } else if (input.alt && input.key === 'ArrowRight') {
    if (wc && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  } else if (mod && (k === '=' || k === '+')) zoom(0.5);
  else if (mod && k === '-') zoom(-0.5);
  else if (mod && k === '0') zoom(0);
  else if (mod && k === 'd') toggleBookmark();
  else if (input.key === 'F12' || (mod && input.shift && k === 'i')) {
    if (wc) wc.toggleDevTools();
  } else if (input.key === 'F11') {
    win.setFullScreen(!win.isFullScreen());
  } else handled = false;
  if (handled) e.preventDefault();
}

// ---------- IPC from the browser chrome ----------
function fromUi(handler) {
  return (event, ...args) => {
    if (!ui || event.sender !== ui.webContents) return undefined;
    return handler(...args);
  };
}

function wireIpc() {
  const on = (ch, fn) => ipcMain.on(`ui:${ch}`, fromUi(fn));
  const handle = (ch, fn) => ipcMain.handle(`ui:${ch}`, fromUi(fn));
  on('ready', push);
  on('new-tab', () => openTab());
  on('close-tab', (id) => closeTab(id));
  on('activate', (id) => activate(id));
  on('navigate', (input) => navigate(input));
  on('back', () => activeTab()?.view?.webContents.navigationHistory.goBack());
  on('forward', () => activeTab()?.view?.webContents.navigationHistory.goForward());
  on('reload', () => activeTab()?.view?.webContents.reload());
  on('stop', () => activeTab()?.view?.webContents.stop());
  on('overlay', (v) => setOverlay(v));
  on('bookmark', toggleBookmark);
  on('sleep-all', () => sleepBackgroundTabs(true));
  on('preconnect', (url) => preconnect(url));
  on('move-tab', (id, toIndex) => {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const [t] = tabs.splice(i, 1);
    tabs.splice(Math.max(0, Math.min(tabs.length, toIndex)), 0, t);
    push();
  });
  on('set', (key, value) => {
    if (!(key in s) || typeof value !== typeof s[key]) return;
    s[key] = value;
    settings.save();
    applySettings();
    push();
  });
  handle('suggest', (q) => suggest(q));
  handle('stats', () => ({
    memoryMb: memoryUsageMb(),
    tabs: tabs.length,
    sleeping: tabs.filter((t) => !t.view).length,
    blockedTotal: stats.data.blocked,
    blockerReady: !!blocker,
  }));
  handle('clear-data', async () => {
    await clearData();
    return true;
  });
}

function applySettings() {
  if (blocker) {
    if (s.blockAds && !blockerOn) blocker.enableBlockingInSession(tabSession);
    if (!s.blockAds && blockerOn) blocker.disableBlockingInSession(tabSession);
    blockerOn = s.blockAds;
  }
  const dns = privacy.DNS_SERVERS[s.secureDns];
  app.configureHostResolver(
    dns ? { secureDnsMode: 'automatic', secureDnsServers: [dns] } : { secureDnsMode: 'off' },
  );
}

// ---------- session: privacy rules ----------
function setupSession() {
  tabSession = session.fromPartition('persist:main');
  tabSession.setUserAgent(privacy.cleanUserAgent(tabSession.getUserAgent()));
  tabSession.setSpellCheckerEnabled(false);

  tabSession.protocol.handle('lux', (req) => {
    const { host } = new URL(req.url);
    if (host === 'newtab') return net.fetch(pathToFileURL(path.join(__dirname, 'pages', 'newtab.html')).toString());
    return new Response('Not found', { status: 404 });
  });

  tabSession.webRequest.onBeforeSendHeaders((d, cb) => {
    const h = d.requestHeaders;
    if (s.sendDnt) {
      h.DNT = '1';
      h['Sec-GPC'] = '1';
    }
    if (s.blockThirdPartyCookies && d.resourceType !== 'mainFrame' && d.webContents) {
      let top = '';
      try {
        top = d.webContents.getURL();
      } catch {
        top = '';
      }
      if (top && privacy.isThirdParty(d.url, top)) delete h.Cookie;
    }
    cb({ requestHeaders: h });
  });

  const asks = {
    media: 'камера / микрофон',
    geolocation: 'местоположение',
    notifications: 'уведомления',
    'clipboard-read': 'чтение буфера обмена',
    'display-capture': 'запись экрана',
    midi: 'MIDI-устройства',
    midiSysex: 'MIDI-устройства',
  };
  tabSession.setPermissionRequestHandler((_wc, permission, cb, details) => {
    if (['fullscreen', 'pointerLock', 'clipboard-sanitized-write'].includes(permission)) return cb(true);
    const what = asks[permission];
    if (!what) return cb(false); // anything unusual is denied silently
    let origin = '';
    try {
      origin = new URL(details.requestingUrl).host;
    } catch {
      return cb(false);
    }
    const key = `${origin}|${permission}`;
    if (permissionMemory.has(key)) return cb(permissionMemory.get(key));
    dialog
      .showMessageBox(win, {
        type: 'question',
        buttons: ['Запретить', 'Разрешить'],
        defaultId: 0,
        cancelId: 0,
        title: 'Запрос разрешения',
        message: `${origin} просит доступ: ${what}`,
        detail: 'Решение запомнится до закрытия браузера.',
      })
      .then(({ response }) => {
        const ok = response === 1;
        permissionMemory.set(key, ok);
        cb(ok);
      })
      .catch(() => cb(false));
  });
}

async function setupBlocker() {
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    const cache = path.join(dataDir, 'adblock-engine.bin');
    blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: cache,
      read: fs.readFile,
      write: fs.writeFile,
    });
    blocker.on('request-blocked', (request) => {
      stats.data.blocked++;
      stats.save();
      const tab = tabs.find((t) => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === request.tabId);
      if (tab) {
        tab.blocked++;
        if (tab.id === activeId) push();
      }
    });
    applySettings();
  } catch (err) {
    console.error('Блокировщик не загрузился (нет сети?):', err.message);
  }
}

// ---------- window ----------
function createWindow() {
  win = new BaseWindow({ width: 1280, height: 820, minWidth: 480, minHeight: 320, backgroundColor: '#1b1c20', title: 'LuxBrowser', icon: path.join(__dirname, '..', 'build', 'icon.png') });
  ui = new WebContentsView({
    webPreferences: {
      partition: 'ui', // separate from websites, no cookies shared
      preload: path.join(__dirname, 'preload-ui.js'),
      sandbox: true,
      contextIsolation: true,
      spellcheck: false,
    },
  });
  ui.setBackgroundColor('#00000000');
  win.contentView.addChildView(ui);
  ui.webContents.loadFile(path.join(__dirname, 'ui', 'index.html'));
  ui.webContents.on('before-input-event', onKeys);
  ui.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  ui.webContents.on('will-navigate', (e) => e.preventDefault());

  win.on('resize', layout);
  win.on('enter-full-screen', layout);
  win.on('leave-full-screen', () => {
    if (fullscreen) {
      fullscreen = false;
      const t = activeTab();
      if (t && t.view) t.view.webContents.executeJavaScript('document.fullscreenElement && document.exitFullscreen()').catch(() => {});
    }
    layout();
  });
  win.on('close', saveSession);
  win.on('closed', () => {
    win = null;
    app.quit();
  });

  const saved = lastSession.data;
  const startUrls = process.argv.slice(app.isPackaged ? 1 : 2).filter((a) => /^https?:\/\//.test(a));
  if (s.restoreTabs && saved.tabs.length) {
    // restored tabs stay asleep until you click them — fast start, little RAM
    saved.tabs.forEach((t) => openTab(t.url, { sleeping: true, background: true, title: t.title }));
    activate(tabs[Math.min(saved.active, tabs.length - 1)].id);
  }
  startUrls.forEach((u) => openTab(u));
  if (!tabs.length) openTab();
  layout();
}

function saveSession() {
  if (!s.restoreTabs) {
    lastSession.data = { tabs: [], active: 0 };
  } else {
    lastSession.data = {
      tabs: tabs
        .map((t) => ({ url: t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() || t.url : t.url, title: t.title }))
        .filter((t) => t.url && !t.url.startsWith('lux:')),
      active: Math.max(0, tabs.filter((t) => !t.url.startsWith('lux:')).findIndex((t) => t.id === activeId)),
    };
  }
  lastSession.flush();
}

app.on('second-instance', (_e, argv) => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
  const url = argv.find((a) => /^https?:\/\//.test(a));
  if (url) openTab(url);
});

app.on('web-contents-created', (_e, wc) => {
  // nothing is allowed to attach <webview> or open file:// from a site
  wc.on('will-attach-webview', (e) => e.preventDefault());
});

let quitting = false;
app.on('before-quit', (e) => {
  if (quitting) return;
  settings.flush();
  history.flush();
  bookmarks.flush();
  stats.flush();
  if (s.clearOnExit && tabSession) {
    e.preventDefault();
    quitting = true;
    lastSession.data = { tabs: [], active: 0 };
    lastSession.flush();
    clearData().finally(() => app.quit());
  }
});

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]));
  } else {
    Menu.setApplicationMenu(null);
  }
  app.userAgentFallback = privacy.cleanUserAgent(app.userAgentFallback);
  setupSession();
  wireIpc();
  applySettings();
  createWindow();
  setupBlocker();
  setInterval(() => sleepBackgroundTabs(false), 60000);
});

app.on('window-all-closed', () => app.quit());
