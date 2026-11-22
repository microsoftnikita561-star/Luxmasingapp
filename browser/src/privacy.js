// URL helpers and privacy rules that do not depend on Electron.

const SEARCH_ENGINES = {
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s' },
  startpage: { name: 'Startpage', url: 'https://www.startpage.com/do/search?q=%s' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
  yandex: { name: 'Яндекс', url: 'https://yandex.ru/search/?text=%s' },
};

const DNS_SERVERS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
  adguard: 'https://dns.adguard-dns.com/dns-query',
};

// Query parameters that exist only to track who clicked what.
const TRACKING_PARAMS = new Set([
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'ysclid',
  'twclid', 'ttclid', 'li_fat_id', 'igshid', 'igsh', 'mc_cid', 'mc_eid', '_openstat',
  '_hsenc', '_hsmi', 'mkt_tok', 'vero_id', 'vero_conv', 'oly_anon_id', 'oly_enc_id',
  'rb_clickid', 's_cid', 'ref_src', 'ref_url', 'srsltid', 'epik', 'wickedid', '_ga', '_gl',
]);
const TRACKING_PREFIXES = ['utm_', 'pk_', 'mtm_', 'hsa_'];
// "si" is a share-tracking id on these hosts only; elsewhere it may be meaningful.
const SI_HOSTS = /(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/;

function cleanUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }
  if (!/^https?:$/.test(u.protocol) || !u.search) return raw;
  let changed = false;
  for (const key of [...u.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (
      TRACKING_PARAMS.has(k) ||
      TRACKING_PREFIXES.some((p) => k.startsWith(p)) ||
      (k === 'si' && SI_HOSTS.test(u.hostname))
    ) {
      u.searchParams.delete(key);
      changed = true;
    }
  }
  return changed ? u.toString() : raw;
}

// Turns whatever was typed into the address bar into a URL.
function toUrl(input, engine) {
  const text = String(input || '').trim();
  if (!text) return null;
  const tpl = (SEARCH_ENGINES[engine] || SEARCH_ENGINES.duckduckgo).url;
  if (/^(lux|about|file|data|view-source):/i.test(text)) return text;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  if (!/\s/.test(text)) {
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:]+\])(:\d+)?(\/.*)?$/i.test(text)) {
      return `http://${text}`;
    }
    // something.tld — open it over HTTPS by default
    if (/^[^/?#]+\.[a-zЀ-ӿ]{2,}(:\d+)?([/?#].*)?$/i.test(text)) return `https://${text}`;
  }
  return tpl.replace('%s', encodeURIComponent(text));
}

const TWO_LEVEL = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'or', 'ne', 'go', 'msk', 'spb']);

// Approximate "site" (eTLD+1) for third-party checks.
function siteOf(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host || /^[\d.]+$/.test(host) || host.includes(':')) return host;
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const take = tld.length === 2 && TWO_LEVEL.has(sld) ? 3 : 2;
  return parts.slice(-take).join('.');
}

function isThirdParty(requestUrl, topUrl) {
  try {
    const a = new URL(requestUrl);
    const b = new URL(topUrl);
    if (!/^https?:$/.test(b.protocol)) return false;
    return siteOf(a.hostname) !== siteOf(b.hostname);
  } catch {
    return false;
  }
}

// Removes the app name and "Electron/x" from the user agent and freezes the Chrome
// version the same way Chrome does, so the browser looks like ordinary Chrome.
function cleanUserAgent(ua) {
  return ua
    .replace(/\s(?!Chrome\/|Safari\/|AppleWebKit\/|Mozilla\/)[\w.-]+\/[\w.-]+/g, '')
    .replace(/Chrome\/(\d+)[\d.]*/, 'Chrome/$1.0.0.0');
}

module.exports = { SEARCH_ENGINES, DNS_SERVERS, cleanUrl, toUrl, siteOf, isThirdParty, cleanUserAgent };
