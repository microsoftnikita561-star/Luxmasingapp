// Runs in every page before its own scripts. Hides the traces an ad blocker leaves,
// so "please disable your ad blocker" detectors see a normal page.
const { webFrame } = require('electron');

function shield() {
  const BAIT = /(^|[^a-z])(ads?|adv|advert\w*|adsbox|adbanner|adblock\w*|banner\w*|sponsor\w*|pub_\d+x\d+\w*|textads?|doubleclick|adsense|adzone|adunit|adslot|adplacement)([^a-z]|$)/i;
  const gcs = window.getComputedStyle;
  const natives = new WeakMap(); // patched function -> the native one it replaces

  // A "bait" is an empty element with an ad-like name that the blocker has hidden.
  const isBait = (el) => {
    try {
      if (!(el instanceof HTMLElement) || el.childElementCount > 1) return false;
      const sig = `${el.id} ${typeof el.className === 'string' ? el.className : ''}`;
      if (sig.length < 3 || !BAIT.test(sig)) return false;
      if ((el.textContent || '').trim().length > 8) return false;
      return gcs.call(window, el).display === 'none';
    } catch {
      return false;
    }
  };
  const styleSize = (el, prop) => parseInt(el.style[prop], 10) || 10;

  const patchGetter = (proto, prop, fake) => {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.get) return;
    const native = desc.get;
    const get = {
      [prop]() {
        const v = native.call(this);
        return (v === 0 || v === null) && isBait(this) ? fake(this) : v;
      },
    }[prop];
    natives.set(get, native);
    Object.defineProperty(proto, prop, { ...desc, get });
  };
  patchGetter(HTMLElement.prototype, 'offsetHeight', (el) => styleSize(el, 'height'));
  patchGetter(HTMLElement.prototype, 'offsetWidth', (el) => styleSize(el, 'width'));
  patchGetter(HTMLElement.prototype, 'offsetTop', () => 8);
  patchGetter(HTMLElement.prototype, 'offsetLeft', () => 8);
  patchGetter(HTMLElement.prototype, 'offsetParent', () => document.body);
  patchGetter(Element.prototype, 'clientHeight', (el) => styleSize(el, 'height'));
  patchGetter(Element.prototype, 'clientWidth', (el) => styleSize(el, 'width'));

  const nativeRect = Element.prototype.getBoundingClientRect;
  const getBoundingClientRect = {
    getBoundingClientRect() {
      const r = nativeRect.call(this);
      return r.height === 0 && isBait(this) ? new DOMRect(8, 8, styleSize(this, 'width'), styleSize(this, 'height')) : r;
    },
  }.getBoundingClientRect;
  natives.set(getBoundingClientRect, nativeRect);
  Element.prototype.getBoundingClientRect = getBoundingClientRect;

  const getComputedStyle = {
    getComputedStyle(el, pseudo) {
      const cs = gcs.call(this || window, el, pseudo);
      if (pseudo || !isBait(el)) return cs;
      const fake = { display: 'block', visibility: 'visible', opacity: '1' };
      return new Proxy(cs, {
        get(target, prop) {
          if (prop in fake) return fake[prop];
          if (prop === 'getPropertyValue') return (name) => (name in fake ? fake[name] : target.getPropertyValue(name));
          const v = Reflect.get(target, prop);
          return typeof v === 'function' ? v.bind(target) : v;
        },
      });
    },
  }.getComputedStyle;
  natives.set(getComputedStyle, gcs);
  window.getComputedStyle = getComputedStyle;

  // patched functions must still print as "[native code]"
  const nativeToString = Function.prototype.toString;
  const toString = {
    toString() {
      return nativeToString.call(natives.get(this) || this);
    },
  }.toString;
  natives.set(toString, nativeToString);
  Function.prototype.toString = toString;
}

try {
  if (/^https?:$/.test(location.protocol)) webFrame.executeJavaScript(`(${shield.toString()})();`);
} catch {
  /* never break a page because of the shield */
}
