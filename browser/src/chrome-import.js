// Reads bookmarks and history straight from the profile folder of Google Chrome
// (and other Chromium browsers that keep the same file layout). Read-only.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function candidates() {
  const home = os.homedir();
  if (process.env.LUX_CHROME_DIR) return [['Google Chrome', process.env.LUX_CHROME_DIR]];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      ['Google Chrome', path.join(local, 'Google', 'Chrome', 'User Data')],
      ['Яндекс Браузер', path.join(local, 'Yandex', 'YandexBrowser', 'User Data')],
      ['Microsoft Edge', path.join(local, 'Microsoft', 'Edge', 'User Data')],
      ['Brave', path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data')],
    ];
  }
  if (process.platform === 'darwin') {
    const sup = path.join(home, 'Library', 'Application Support');
    return [
      ['Google Chrome', path.join(sup, 'Google', 'Chrome')],
      ['Яндекс Браузер', path.join(sup, 'Yandex', 'YandexBrowser')],
      ['Microsoft Edge', path.join(sup, 'Microsoft Edge')],
      ['Brave', path.join(sup, 'BraveSoftware', 'Brave-Browser')],
    ];
  }
  const cfg = process.env.XDG_CONFIG_HOME || path.join(home, '.config');
  return [
    ['Google Chrome', path.join(cfg, 'google-chrome')],
    ['Chromium', path.join(cfg, 'chromium')],
    ['Яндекс Браузер', path.join(cfg, 'yandex-browser')],
    ['Microsoft Edge', path.join(cfg, 'microsoft-edge')],
    ['Brave', path.join(cfg, 'BraveSoftware', 'Brave-Browser')],
  ];
}

const exists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};

// Every (browser, profile) pair that has something to import. Google Chrome comes first.
function findSources() {
  const out = [];
  for (const [browser, dir] of candidates()) {
    if (!exists(dir)) continue;
    let names = {};
    try {
      const state = JSON.parse(fs.readFileSync(path.join(dir, 'Local State'), 'utf8'));
      names = state.profile.info_cache || {};
    } catch {
      names = {};
    }
    let ids = [];
    try {
      ids = fs.readdirSync(dir).filter((d) => d === 'Default' || /^Profile \d+$/.test(d));
    } catch {
      ids = [];
    }
    const found = ids
      .map((id) => ({ browser, dir: path.join(dir, id), profile: (names[id] && names[id].name) || id }))
      .filter((p) => exists(path.join(p.dir, 'Bookmarks')) || exists(path.join(p.dir, 'History')));
    for (const p of found) {
      p.label = found.length > 1 ? `${browser} — ${p.profile}` : browser;
      out.push(p);
    }
  }
  return out;
}

function convert(node) {
  if (!node) return null;
  if (node.type === 'url') {
    return /^https?:/.test(node.url || '') ? { url: node.url, title: node.name || node.url } : null;
  }
  if (node.type === 'folder') {
    const children = (node.children || []).map(convert).filter(Boolean);
    return children.length ? { title: node.name || 'Папка', children } : null;
  }
  return null;
}

function readBookmarks(profileDir) {
  try {
    const { roots } = JSON.parse(fs.readFileSync(path.join(profileDir, 'Bookmarks'), 'utf8'));
    const list = (root) => ((root && root.children) || []).map(convert).filter(Boolean);
    return { bar: list(roots.bookmark_bar), other: [...list(roots.other), ...list(roots.synced)] };
  } catch {
    return { bar: [], other: [] };
  }
}

function readHistory(profileDir, tmpDir, limit) {
  const src = path.join(profileDir, 'History');
  if (!exists(src)) return [];
  // Chrome keeps the database locked while it runs, so work on a copy.
  const copy = path.join(tmpDir, `lux-import-${process.pid}-${Date.now()}.sqlite`);
  let db;
  try {
    fs.copyFileSync(src, copy);
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(copy, { readOnly: true });
    // last_visit_time is microseconds since 1601-01-01; convert to JS milliseconds in SQL
    const rows = db
      .prepare(
        `SELECT url, title, visit_count AS visits, (last_visit_time / 1000 - 11644473600000) AS time
         FROM urls WHERE hidden = 0 AND url LIKE 'http%' ORDER BY last_visit_time DESC LIMIT ?`,
      )
      .all(limit);
    return rows.map((r) => ({ url: r.url, title: r.title || r.url, visits: Number(r.visits) || 1, time: Number(r.time) || 0 }));
  } catch (err) {
    console.error('history import failed:', err.message);
    return [];
  } finally {
    try {
      if (db) db.close();
    } catch {
      /* already closed */
    }
    fs.rm(copy, { force: true }, () => {});
  }
}

function importFrom(source, tmpDir, historyLimit = 3000) {
  return { bookmarks: readBookmarks(source.dir), history: readHistory(source.dir, tmpDir, historyLimit) };
}

module.exports = { findSources, importFrom };
