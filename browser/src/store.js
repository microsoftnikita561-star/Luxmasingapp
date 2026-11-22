// Tiny JSON store: everything stays on this computer, nothing is sent anywhere.
const fs = require('node:fs');
const path = require('node:path');

class Store {
  constructor(dir, name, defaults) {
    this.file = path.join(dir, `${name}.json`);
    this.timer = null;
    let loaded;
    try {
      loaded = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      loaded = undefined;
    }
    if (Array.isArray(defaults)) this.data = Array.isArray(loaded) ? loaded : defaults;
    else if (defaults && typeof defaults === 'object') this.data = { ...defaults, ...(loaded || {}) };
    else this.data = loaded ?? defaults;
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 1000);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('store write failed', this.file, err);
    }
  }
}

module.exports = Store;
