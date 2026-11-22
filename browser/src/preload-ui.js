// Bridge for the browser's own toolbar only. Websites never get this preload.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lux', {
  send: (channel, ...args) => ipcRenderer.send(`ui:${channel}`, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(`ui:${channel}`, ...args),
  on: (channel, fn) => {
    if (channel === 'state' || channel === 'focus-address') ipcRenderer.on(channel, (_e, ...args) => fn(...args));
  },
});
