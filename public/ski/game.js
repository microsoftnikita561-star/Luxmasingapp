/* Снежный спуск — пиксельная новогодняя аркада.
   Графика склона: Kenney "Tiny Ski" (CC0). Шрифт: Press Start 2P (OFL).
   Лыжник, предметы и пасхалки нарисованы кодом ниже. */
(() => {
  'use strict'

  // ───────────────────────── helpers ─────────────────────────
  const $ = (id) => document.getElementById(id)
  const rnd = Math.random
  const rr = (a, b) => a + rnd() * (b - a)
  const pick = (a) => a[(rnd() * a.length) | 0]
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
  const INK = '#3f2631'
  const M = 6 // world pixels per metre
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16)
    const f = (v) => clamp(Math.round(v * k), 0, 255)
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)
  }
  function spr(rows, pal) {
    const w = Math.max(...rows.map((r) => r.length))
    const c = mk(w, rows.length), x = c.getContext('2d')
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i]
        if (ch === '.' || ch === ' ') continue
        x.fillStyle = pal[ch] || '#f0f'
        x.fillRect(i, j, 1, 1)
      }
    })
    return c
  }
  function flip(src) {
    const c = mk(src.width, src.height), x = c.getContext('2d')
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0)
    return c
  }

  // ───────────────────────── save ─────────────────────────
  const SAVE_KEY = 'snow-descent-v1'
  const save = {
    coins: 0, best: 0, bestDist: 0, runs: 0, mute: false,
    owned: {}, eggs: {},
    equip: { hat: 'beanie', jacket: 'red', pants: 'navy', skis: 'blue', scarf: 'gold', skin: 'light', trail: 'snow' },
    missions: [{ t: 'dist', lvl: 0 }, { t: 'gifts', lvl: 0 }, { t: 'near', lvl: 0 }],
  }
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    if (s) { Object.assign(save, s); save.equip = Object.assign({ hat: 'beanie', jacket: 'red', pants: 'navy', skis: 'blue', scarf: 'gold', skin: 'light', trail: 'snow' }, s.equip) }
  } catch { /* storage unavailable — play without saving */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch { /* ignore */ } }

  // ───────────────────────── catalog ─────────────────────────
  const CATS = [
    { id: 'hat', name: 'Шапка' }, { id: 'jacket', name: 'Куртка' }, { id: 'pants', name: 'Штаны' },
    { id: 'skis', name: 'Лыжи' }, { id: 'scarf', name: 'Шарф' }, { id: 'skin', name: 'Кожа' }, { id: 'trail', name: 'След' },
  ]
  const ITEMS = {
    hat: [
      { id: 'beanie', name: 'Помпон', price: 0 },
      { id: 'santa', name: 'Колпак', price: 120 },
      { id: 'elf', name: 'Эльф', price: 180 },
      { id: 'helmet', name: 'Шлем', price: 250 },
      { id: 'antlers', name: 'Олень', price: 400 },
      { id: 'crown', name: 'Корона', price: 1500 },
      { id: 'ogre', name: 'Ушки огра', egg: 'ogre' },
      { id: 'mask', name: 'Маска соседа', egg: 'web' },
      { id: 'iron', name: 'Желез. шлем', egg: 'flyer' },
    ],
    jacket: [
      { id: 'red', name: 'Красная', c: '#e84537', price: 0 },
      { id: 'blue', name: 'Синяя', c: '#009adc', price: 60 },
      { id: 'green', name: 'Зелёная', c: '#3fa34d', price: 60 },
      { id: 'yellow', name: 'Жёлтая', c: '#ffcf4a', price: 80 },
      { id: 'pink', name: 'Розовая', c: '#ff7bac', price: 80 },
      { id: 'purple', name: 'Фиолет', c: '#8b5fd6', price: 100 },
      { id: 'white', name: 'Белая', c: '#f4f4f4', price: 150 },
      { id: 'black', name: 'Чёрная', c: '#3a3f55', price: 150 },
      { id: 'star', name: 'Капитан', c: '#2b5fb4', star: true, egg: 'shield' },
    ],
    pants: [
      { id: 'navy', name: 'Синие', c: '#2d4b8e', price: 0 },
      { id: 'black', name: 'Чёрные', c: '#3a3f55', price: 40 },
      { id: 'red', name: 'Красные', c: '#c0392b', price: 60 },
      { id: 'green', name: 'Зелёные', c: '#2f7d3b', price: 60 },
      { id: 'orange', name: 'Рыжие', c: '#f08a2e', price: 80 },
      { id: 'white', name: 'Белые', c: '#e9eef5', price: 120 },
    ],
    skis: [
      { id: 'blue', name: 'Синие', c: '#009adc', price: 0 },
      { id: 'red', name: 'Красные', c: '#e84537', price: 50 },
      { id: 'lime', name: 'Лайм', c: '#a7e05a', price: 80 },
      { id: 'pink', name: 'Розовые', c: '#ff7bac', price: 80 },
      { id: 'wood', name: 'Дерево', c: '#bd6c4a', price: 120 },
      { id: 'gold', name: 'Золотые', c: '#ffcf4a', egg: 'santa' },
    ],
    scarf: [
      { id: 'gold', name: 'Жёлтый', c: '#ffcf4a', price: 0 },
      { id: 'red', name: 'Красный', c: '#e84537', price: 40 },
      { id: 'blue', name: 'Синий', c: '#009adc', price: 40 },
      { id: 'green', name: 'Зелёный', c: '#84c669', price: 40 },
      { id: 'pink', name: 'Розовый', c: '#ff7bac', price: 60 },
      { id: 'white', name: 'Белый', c: '#ffffff', price: 60 },
      { id: 'purple', name: 'Фиолет', c: '#8b5fd6', price: 60 },
    ],
    skin: [
      { id: 'light', name: 'Светлая', c: '#f6c9a0', price: 0 },
      { id: 'tan', name: 'Загар', c: '#e0a070', price: 0 },
      { id: 'brown', name: 'Смуглая', c: '#a8683f', price: 0 },
      { id: 'dark', name: 'Тёмная', c: '#6e4428', price: 0 },
      { id: 'green', name: 'Болотная', c: '#9bc53d', egg: 'ogre' },
    ],
    trail: [
      { id: 'snow', name: 'Лыжня', price: 0, cols: ['#b7d2eb'] },
      { id: 'spark', name: 'Искры', price: 200, cols: ['#ffcf4a', '#ffffff', '#ffe9a0'] },
      { id: 'candy', name: 'Карамель', price: 300, cols: ['#e84537', '#ffffff'] },
      { id: 'hearts', name: 'Сердечки', price: 350, cols: ['#ff7bac', '#ff4d6d'] },
      { id: 'fire', name: 'Огонь', price: 500, cols: ['#ff9f1c', '#e84537', '#ffcf4a'] },
      { id: 'bolt', name: 'Молнии', egg: 'hammer', cols: ['#7fe3ff', '#ffffff', '#ffcf4a'] },
      { id: 'salute', name: 'Салют', egg: 'newyear', cols: ['#e84537', '#ffcf4a', '#84c669', '#009adc', '#ff7bac'] },
      { id: 'rainbow', name: 'Радуга', egg: 'konami', cols: ['#e84537', '#ff9f1c', '#ffcf4a', '#84c669', '#009adc', '#8b5fd6'] },
    ],
  }
  const EGGS = [
    { id: 'ogre', ic: '🧅', name: 'Хозяин болота', hint: 'Где-то на склоне есть болото. Подъедь поближе.', unlock: 'Ушки огра и болотная кожа' },
    { id: 'shield', ic: '🛡️', name: 'Звёздный щит', hint: 'Круглый щит торчит из сугроба. Подбери его.', unlock: 'Куртка «Капитан»' },
    { id: 'hammer', ic: '🔨', name: 'Достоин!', hint: 'Молот на камне. Поднимет лишь тот, у кого комбо x3.', unlock: 'След «Молнии»' },
    { id: 'web', ic: '🕸️', name: 'Дружелюбный сосед', hint: 'Проедь под паутиной между двух ёлок.', unlock: 'Маска соседа' },
    { id: 'flyer', ic: '🚀', name: 'Железный летун', hint: 'Над склоном летает кто-то в красно-золотой броне. Поймай его подарок.', unlock: 'Железный шлем' },
    { id: 'yeti', ic: '🐾', name: 'Дай пять, йети', hint: 'Йети машет у кромки леса. Проедь рядом.', coins: 300 },
    { id: 'snowman', ic: '⛄', name: 'Тёплые обнимашки', hint: 'Один снеговик умеет говорить. Обними его — врежься!', coins: 200 },
    { id: 'santa', ic: '🎅', name: 'Дед Мороз', hint: 'Иногда над склоном летят сани. Поймай подарок.', unlock: 'Золотые лыжи' },
    { id: 'newyear', ic: '🎆', name: 'С Новым годом!', hint: 'Проедь 2027 метров за один заезд.', unlock: 'След «Салют»' },
    { id: 'konami', ic: '🎮', name: 'Старая школа', hint: 'В меню: ↑↑↓↓←→←→ или 7 раз нажми на логотип.', unlock: 'Радужный след' },
  ]
  const MISSIONS = {
    dist: { n: [400, 800, 1500, 2500, 4000], text: (n) => `Проедь ${n} м`, stat: 'dist' },
    gifts: { n: [20, 40, 70, 110, 160], text: (n) => `Собери ${n} подарков`, stat: 'gifts' },
    near: { n: [6, 12, 20, 30, 45], text: (n) => `${n} опасных пролётов`, stat: 'near' },
    gates: { n: [4, 8, 14, 20, 30], text: (n) => `Пройди ${n} ворот`, stat: 'gates' },
    tricks: { n: [1, 2, 4, 6, 9], text: (n) => `Сделай ${n} сальто`, stat: 'tricks' },
    combo: { n: [3, 4, 6, 8, 10], text: (n) => `Набери комбо x${n}`, stat: 'maxMult' },
    smash: { n: [3, 6, 10, 15, 25], text: (n) => `Снеси ${n} преград в турбо`, stat: 'smash' },
  }
  const missionGoal = (m) => MISSIONS[m.t].n[Math.min(m.lvl, 4)] * (1 + Math.max(0, m.lvl - 4))
  const missionReward = (m) => 40 + m.lvl * 30
  const itemOf = (cat, id) => ITEMS[cat].find((i) => i.id === id) || ITEMS[cat][0]
  const isOwned = (cat, it) => (it.egg ? !!save.eggs[it.egg] : it.price === 0 || !!save.owned[cat + ':' + it.id])

  // ───────────────────────── sprites ─────────────────────────
  const BP = { O: INK, W: '#ffffff', R: '#e84537', B: '#2b5fb4', Y: '#ffcf4a', V: '#7fe3ff', b: '#bd6c4a', e: '#3fa34d', g: '#9bc53d' }
  const BODY = [
    '................', '................', '................',
    '.....OOOOOO.....',
    '....OSSSSSSO....',
    '....OSSSSSSO....',
    '....OSSSSSSO....',
    '....OSESSESO....',
    '....OSSSSSSO....',
    '...OOCCCCCCOO...',
    '..OJJJJJJJJJJO..',
    '.OGOJJJJJJJJOGO.',
    '.OGOJjjjjjjJOGO.',
    '.pOOOTTOOTTOOOp.',
    '.p..OTTOOTTO..p.',
    '.p..OKKOOKKO..p.',
    '....OKKOOKKO....',
    '....OKKOOKKO....',
    '.....OO..OO.....',
  ]
  const HATS = {
    beanie: { at: 1, rows: ['      OPPO      ', '     OOPPOO     ', '    OHHHHHHO    ', '    OHHHHHHO    ', '    OhhhhhhO    '] },
    santa: { at: 1, rows: ['     OOOO       ', '    ORRRROOOOO  ', '    ORRRRRROPPO ', '   OORRRRRROPPO ', '   OPPPPPPPPOO  '] },
    elf: { at: 0, rows: ['        OOO     ', '       OeeYO    ', '      OeeeOO    ', '     OeeeeeO    ', '    OeeeeeeO    ', '   ORRRRRRRRO   '] },
    helmet: { at: 2, rows: ['     OOOOOO     ', '    OHHHHHHO    ', '    OHPHHHHO    ', '    OhhhhhhO    ', '    OOOOOOOO    ', '    OVVOOVVO    '] },
    antlers: { at: 0, rows: ['  O O      O O  ', ' ObObO    ObObO ', '  ObbO    ObbO  ', '   ObOOOOOObO   ', '    OSSSSSSO    ', '                ', '                ', '                ', '    OSSRRSSO    '] },
    crown: { at: 1, rows: ['    O  OO  O    ', '   OYOOYYOOYO   ', '   OYYYYYYYYO   ', '   OYRYYVYYRO   ', '   OOOOOOOOOO   '] },
    ogre: { at: 2, rows: [' OO          OO ', 'OSSO OOOOOO OSSO', ' OSSOSSSSSSOSSO ', '  OOOSSSSSSOOO  '] },
    mask: { at: 3, rows: ['     OOOOOO     ', '    ORRRRRRO    ', '    ORRRRRRO    ', '    OWWRRWWO    ', '    ORWRRWRO    ', '    ORRRRRRO    '] },
    iron: { at: 3, rows: ['     OOOOOO     ', '    ORRRRRRO    ', '    ORYYYYRO    ', '    OYYYYYYO    ', '    OYVYYVYO    ', '    ORYYYYRO    '] },
  }
  function buildSkier(eq) {
    const rows = BODY.map((r) => r.split(''))
    const hat = HATS[eq.hat] || HATS.beanie
    hat.rows.forEach((r, j) => { for (let i = 0; i < 16; i++) { const ch = r[i]; if (ch && ch !== ' ') rows[hat.at + j][i] = ch } })
    const jk = itemOf('jacket', eq.jacket), sc = itemOf('scarf', eq.scarf).c
    const pal = Object.assign({}, BP, {
      S: itemOf('skin', eq.skin).c, E: INK, J: jk.c, j: shade(jk.c, 0.78), T: itemOf('pants', eq.pants).c, K: itemOf('skis', eq.skis).c,
      C: sc, G: sc, H: sc, h: shade(sc, 0.78), P: '#ffffff', p: '#8b9bb4',
    })
    const c = spr(rows.map((r) => r.join('')), pal)
    if (jk.star) { const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(7, 10, 2, 3); x.fillRect(6, 11, 4, 1); x.fillStyle = '#e84537'; x.fillRect(4, 12, 2, 1); x.fillRect(10, 12, 2, 1) }
    return c
  }
  // draw the skier with a pixel "lean": head shifts into the turn, skis fan out
  function drawSkier(c, img, x, baseY, lean, bob) {
    const left = Math.round(x) - 8, top = Math.round(baseY) - 19
    const hs = Math.round(lean * 1.2)
    c.drawImage(img, 0, 0, 16, 9, left + hs, top + bob, 16, 9)
    c.drawImage(img, 0, 9, 16, 4, left, top + 9 + bob, 16, 4 - bob)
    for (let r = 13; r < 19; r++) c.drawImage(img, 0, r, 16, 1, left + Math.round(lean * (r - 12) * 0.6), top + r, 16, 1)
  }

  const SPR = {}
  function buildSprites() {
    SPR.ogre = spr([
      '.O............O.', 'OgO..OOOOOO..OgO', 'OggOOggggggOOggO', '.OOggggggggggOO.', '..OggggggggggO..', '..OgWOggggWOgO..',
      '..OgggggggggGO..', '..OgggOOOOgggO..', '...OggggggggO...', '..OOvwwwwwwvOO..', '.OgOvvwwwwvvOgO.', '.OgOvvvwwvvvOgO.',
      '..OOvvvvvvvvOO..', '...OddOOOOddO...', '...OOO....OOO...',
    ], Object.assign({}, BP, { G: '#7aa32c', v: '#8a5a3a', w: '#efe6d0', d: '#5a3d2b' }))
    SPR.donkey = spr([
      '..OO......OO..', '.OaaO....OaaO.', '.OaaO....OaaO.', '.OaaOOOOOOaaO.', '..OaaaaaaaaO..', '..OaWOaaWOaO..', '..OaaaaaaaaO..',
      '..OAAAAAAAAO..', '..OAOAAAAOAO..', '..OAAAAAAAAO..', '...OaaaaaaO...', '...OaOOOOaO...', '...OaO..OaO...', '...OOO..OOO...',
    ], Object.assign({}, BP, { a: '#8b8fa3', A: '#c9ccd8' }))
    SPR.shield = spr([
      '...OOOOOO...', '..ORRRRRRO..', '.ORRWWWWRRO.', 'ORRWRRRRWRRO', 'ORWRRBBRRWRO', 'ORWRBWWBRWRO', 'ORWRBWWBRWRO', 'ORWRRBBRRWRO',
      'ORRWRRRRWRRO', '.ORRWWWWRRO.', '..ORRRRRRO..', '...OOOOOO...',
    ], BP)
    SPR.hammer = spr([
      '.....OO.....', '....ObbO....', '....ObbO....', '....ObbO....', '....ObbO....', '..OOObbOOO..', '.OsssssssSO.', '.OsssssssSO.',
      '.OsssssssSO.', '.OSSSSSSSSO.', '..OOOOOOOO..',
    ], Object.assign({}, BP, { s: '#c0cbdc', S: '#8b9bb4' }))
    SPR.hang = spr([
      '....WW....', '...OOOO...', '..OBBBBO..', '..OBRRBO..', '.OORRRROO.', '.OBRRRRBO.', '.OBRRRRBO.', '..ORRRRO..', '..OOOOOO..',
      '.ORRRRRRO.', '.OWWRRWWO.', '.ORWRRWRO.', '.ORRRRRRO.', '..OOOOOO..',
    ], BP)
    SPR.flyer = spr([
      '...........OOOO.', '.OOOOOOOOOORRRRO', 'OVYRRRRRRRRRYYRO', 'OVYRRRRYRRRRYVRO', '.OOOOOORRROOOOO.', '......OYYO......', '......OVVO......', '.......OO.......',
    ], BP)
    SPR.flyerL = flip(SPR.flyer)
    SPR.sleigh = spr([
      '.........................OOO....', '..O.O...................ORRRO.O.', '.ObObO.................OWWWWOPO.', '..ObO..................OSSSSO...',
      '.OObOOOOO........O.....OWWWWO..O', 'ORbbbbbbbO.......OO..OORRRRRROOO', '.OObbbbbbOYYYYYYYORRRRRRRRRRRRRO', '...ObbbbbO........ORRRRRRRRRRRRO',
      '...ObOObO..........ORRRRRRRRRRO.', '...ObO.ObO.......OYYOOOOOOOOOYO.', '...OO...OO........OYYYYYYYYYYO..', '...................OOOOOOOOOO...',
    ], Object.assign({}, BP, { S: '#f6c9a0', P: '#ffffff' }))
    SPR.sleighL = flip(SPR.sleigh)
    const giftRows = ['..OO..OO..', '.OYYOOYYO.', '..OYYYYO..', 'OOOOOOOOOO', 'OXXXYYXXXO', 'OOOOOOOOOO', 'OXXXYYXXXO', 'OxxxYYxxxO', 'OxxxYYxxxO', 'OOOOOOOOOO']
    SPR.gifts = [['#e84537', '#ffcf4a'], ['#009adc', '#ffffff'], ['#3fa34d', '#e84537'], ['#8b5fd6', '#ffcf4a'], ['#ff7bac', '#ffffff']]
      .map(([a, b]) => spr(giftRows, { O: INK, X: a, x: shade(a, 0.8), Y: b }))
    SPR.cane = spr(['..OOOO..', '.ORWRWO.', 'ORWOOWRO', 'OWO..ORO', 'OOO..OWO', '.....ORO', '.....OWO', '.....ORO', '.....OWO', '.....ORO', '.....OOO'], BP)
    SPR.cocoa = spr(['..W..W....', '...W..W...', '..W..W....', 'OOOOOOOO..', 'OwwwwwwOOO', 'ORRRRRRO.O', 'ORRWWRRO.O', 'ORRWWRROOO', 'ORRRRRRO..', '.OOOOOO...'], Object.assign({}, BP, { w: '#8a5a3a' }))
    SPR.magnet = spr(['OOOO..OOOO', 'OWWO..OWWO', 'OOOO..OOOO', 'ORRO..ORRO', 'ORRO..ORRO', 'ORRO..ORRO', 'ORROOOORRO', 'ORRRRRRRRO', '.ORRRRRRO.', '..OOOOOO..'], BP)
    SPR.heart = spr(['.OO...OO..', 'ORROOORRO.', 'ORWRRRRRO.', 'ORRRRRRRO.', 'ORRRRRRRO.', '.ORRRRRO..', '..ORRRO...', '...ORO....', '....O.....'], BP)
    SPR.x2 = spr(['...OOOO...', '..OYYYYO..', '.OYYYYYYO.', 'OYOYOYOOYO', 'OYOYOYYOYO', 'OYYOYYOYYO', 'OYOYOYOOYO', '.OYYYYYYO.', '..OYYYYO..', '...OOOO...'], BP)
    // ramp
    const r = mk(26, 14), x = r.getContext('2d')
    x.fillStyle = INK; x.fillRect(1, 0, 24, 14); x.fillRect(0, 2, 26, 12)
    x.fillStyle = '#eef8fe'; x.fillRect(2, 1, 22, 9); x.fillRect(1, 3, 24, 7)
    x.fillStyle = '#cfe7f7'; x.fillRect(2, 4, 22, 1); x.fillRect(1, 7, 24, 1)
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#fff' : '#e84537'; x.fillRect(1 + i * 4, 10, 4, 3) }
    SPR.ramp = r
  }

  // tiles from the Kenney sheet: 16px tiles, 1px gutter
  const tiles = new Image()
  const tile = (c, col, row, x, y) => c.drawImage(tiles, col * 17, row * 17, 16, 16, Math.round(x), Math.round(y), 16, 16)

  // ───────────────────────── audio ─────────────────────────
  let AC = null, master = null, musicGain = null, musicTimer = 0
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return }
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return
    AC = new Ctor()
    master = AC.createGain(); master.gain.value = save.mute ? 0 : 0.6; master.connect(AC.destination)
    musicGain = AC.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master)
    startMusic()
  }
  function tone(f, dur, type, vol, slideTo, when, dest) {
    if (!AC) return
    const t = AC.currentTime + (when || 0)
    const o = AC.createOscillator(), g = AC.createGain()
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02)
  }
  let noiseBuf = null
  function noise(dur, vol, when, hp, dest) {
    if (!AC) return
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1 }
    const t = AC.currentTime + (when || 0)
    const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter()
    s.buffer = noiseBuf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 900
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t, rnd() * 0.5, dur + 0.02)
  }
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
  const SFX = {
    gift: (k) => tone(midi(76 + Math.min(k, 12)), 0.09, 'square', 0.09, midi(83 + Math.min(k, 12))),
    near: () => { tone(900, 0.07, 'triangle', 0.12, 1500) },
    gate: () => { tone(midi(72), 0.07, 'square', 0.1); tone(midi(79), 0.1, 'square', 0.1, 0, 0.07) },
    jump: () => tone(260, 0.3, 'square', 0.1, 900),
    land: () => noise(0.15, 0.25),
    trick: () => [72, 76, 79, 84].forEach((n, i) => tone(midi(n), 0.1, 'square', 0.1, 0, i * 0.06)),
    crash: () => { noise(0.35, 0.5); tone(180, 0.3, 'sawtooth', 0.15, 50) },
    power: () => [60, 64, 67, 72, 76].forEach((n, i) => tone(midi(n), 0.09, 'square', 0.1, 0, i * 0.05)),
    egg: () => [67, 71, 74, 79, 83, 86].forEach((n, i) => tone(midi(n), 0.14, 'triangle', 0.16, 0, i * 0.07)),
    smash: () => { noise(0.18, 0.35); tone(300, 0.12, 'square', 0.08, 120) },
    buy: () => [79, 84, 88].forEach((n, i) => tone(midi(n), 0.1, 'square', 0.1, 0, i * 0.07)),
    click: () => tone(660, 0.05, 'square', 0.07),
    nope: () => tone(160, 0.15, 'square', 0.1, 110),
    over: () => [64, 60, 57, 52].forEach((n, i) => tone(midi(n), 0.22, 'triangle', 0.16, 0, i * 0.16)),
    thunder: () => { noise(0.8, 0.6); tone(90, 0.7, 'sawtooth', 0.2, 30) },
    swamp: () => tone(140, 0.2, 'sine', 0.2, 60),
  }
  // "Jingle Bells" (1857, public domain) as a chiptune loop
  const A = [[64, 2], [64, 2], [64, 4], [64, 2], [64, 2], [64, 4], [64, 2], [67, 2], [60, 3], [62, 1], [64, 8]]
  const TUNE = A.concat(
    [[65, 2], [65, 2], [65, 3], [65, 1], [65, 2], [64, 2], [64, 2], [64, 1], [64, 1], [64, 2], [62, 2], [62, 2], [64, 2], [62, 4], [67, 4]], A,
    [[65, 2], [65, 2], [65, 3], [65, 1], [65, 2], [64, 2], [64, 2], [64, 1], [64, 1], [67, 2], [67, 2], [65, 2], [62, 2], [60, 6], [0, 2]])
  const BASS = [36, 36, 36, 36, 41, 36, 38, 43, 36, 36, 36, 36, 41, 36, 43, 36]
  function startMusic() {
    const step = 0.17
    let i = 0, tick = 0, next = AC.currentTime + 0.1, hold = 0
    clearInterval(musicTimer)
    musicTimer = setInterval(() => {
      if (!AC || AC.state !== 'running') { if (AC) next = AC.currentTime + 0.1; return }
      if (next < AC.currentTime) next = AC.currentTime + 0.05
      while (next < AC.currentTime + 0.35) {
        const w = next - AC.currentTime
        if (hold <= 0) {
          const [n, l] = TUNE[i]; i = (i + 1) % TUNE.length; hold = l
          if (n) { tone(midi(n + 12), l * step * 0.9, 'square', 0.05, 0, w, musicGain); tone(midi(n), l * step * 0.9, 'triangle', 0.06, 0, w, musicGain) }
        }
        hold--
        const bar = ((tick / 8) | 0) % 16, beat = tick % 8
        if (beat === 0) tone(midi(BASS[bar]), step * 3, 'triangle', 0.14, 0, w, musicGain)
        if (beat === 4) tone(midi(BASS[bar] + 7), step * 3, 'triangle', 0.1, 0, w, musicGain)
        if (beat % 2 === 0) noise(0.04, beat % 4 === 0 ? 0.05 : 0.03, w, 7000, musicGain) // sleigh bells
        tick++; next += step
        if (tick % (TUNE.reduce((s, t) => s + t[1], 0)) === 0) { i = 0; hold = 0 }
      }
    }, 80)
  }
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* ignore */ } }

  // ───────────────────────── canvas ─────────────────────────
  const cv = $('game'), ctx = cv.getContext('2d')
  const dark = mk(1, 1), dctx = dark.getContext('2d')
  let W = 0, H = 0, SCALE = 3
  function resize() {
    const iw = window.innerWidth, ih = window.innerHeight
    SCALE = Math.max(2, Math.round(ih / 280))
    while (SCALE > 2 && iw / SCALE < 170) SCALE--
    W = Math.ceil(iw / SCALE); H = Math.ceil(ih / SCALE)
    cv.width = W; cv.height = H
    cv.style.width = W * SCALE + 'px'; cv.style.height = H * SCALE + 'px'
    dark.width = W; dark.height = H
    ctx.imageSmoothingEnabled = false
  }
  window.addEventListener('resize', resize)

  // ───────────────────────── game state ─────────────────────────
  const G = { state: 'menu', t: 0, ents: [], parts: [], texts: [], sky: [], tracks: [], paths: [], flakes: [] }
  const P = {}
  let skierImg = null
  const cam = { x: 0, y: 0, shake: 0 }
  const center = (y) => 46 * Math.sin(y / 900) + 14 * Math.sin(y / 310 + 2)
  const halfW = (y) => 112 + 20 * Math.sin(y / 520) + 8 * Math.sin(y / 170 + 1.3)

  function resetWorld(playing) {
    G.ents = []; G.parts = []; G.texts = []; G.sky = []; G.tracks = []; G.paths = []
    Object.assign(P, { x: 0, y: 0, vx: 0, speed: 50, z: 0, vz: 0, spin: 0, lean: 0, tumble: 0, inv: 0, hearts: 3, dead: false, onIce: false, inSwamp: false })
    Object.assign(G, {
      playing, score: 0, combo: 0, comboT: 0, mult: 1, runCoins: 0, magnet: 0, turbo: 0, shield: false, x2: 0, flash: 0, fire: 0, overT: 0,
      stats: { dist: 0, gifts: 0, near: 0, gates: 0, tricks: 0, maxMult: 1, smash: 0 }, newYear: false,
      rowY: -Math.ceil(H * 0.4 / 16) * 16, safeUntil: 190,
      next: { coins: 260, gate: rr(900, 1400), ramp: rr(500, 800), power: rr(1100, 1600), npc: rr(2400, 3200), ice: rr(700, 1200), egg: rr(1500, 2100), sky: rr(3200, 4500) },
    })
    cam.x = 0; cam.y = P.y - H * 0.3
    skierImg = buildSkier(save.equip)
  }

  // ───────────────────────── spawning ─────────────────────────
  const SOLID = { tree: 5, treeS: 4, xmas: 5, dead: 4, bush: 4, rock: 6, stump: 5, snowman: 5, npc: 5, yeti: 6 }
  function add(type, x, y, o) {
    const e = Object.assign({ type, x, y, r: SOLID[type] || 0, solid: type in SOLID, seed: rnd() * 100 }, o)
    G.ents.push(e); return e
  }
  const inPath = (x, y, pad) => G.paths.some((p) => y >= p.y0 - 14 && y <= p.y1 + 14 && Math.abs(x - p.f(y)) < (p.w || 16) + (pad || 0))
  function addPath(y0, y1, f, w) { G.paths.push({ y0, y1, f, w }) }

  function genRow(y) {
    const cx = center(y), hw = halfW(y)
    // forest walls
    for (const s of [-1, 1]) {
      let x = hw + 4 + rnd() * 10
      const lim = hw + W / 2 + 30
      while (x < lim) {
        const k = rnd()
        add(k < 0.66 ? 'tree' : k < 0.82 ? 'treeS' : k < 0.9 ? 'xmas' : k < 0.96 ? 'dead' : 'rock', cx + s * x, y + rnd() * 12, { forest: true })
        x += 11 + rnd() * 20
      }
    }
    if (!G.playing || y < G.safeUntil) return
    const d = G.diff, n = G.next
    if (y >= n.coins) { n.coins = y + rr(170, 330); coinLine(y) }
    if (y >= n.gate) { n.gate = y + rr(1100, 1900); gates(y) }
    if (y >= n.ramp) { n.ramp = y + rr(650, 1200); ramp(y) }
    if (y >= n.power) { n.power = y + rr(1300, 2100); power(y) }
    if (y >= n.ice) { n.ice = y + rr(800, 1500); const x = cx + rr(-1, 1) * (hw - 40); add('ice', x, y + 20, { flat: true, rx: rr(22, 36), ry: rr(12, 20) }) }
    if (y >= n.npc) { n.npc = y + rr(900, 1700) / (0.6 + d); add('npc', cx + rr(-1, 1) * (hw - 30), y, { v: rr(26, 40), ph: rnd() * 6, kind: rnd() < 0.5 ? 5 : 6 }) }
    if (y >= n.egg) { n.egg = y + rr(2400, 3800); spawnEgg(y) }
    if (y >= n.sky) { n.sky = y + rr(4500, 7000); G.skyDue = rnd() < 0.5 ? 'santa' : 'flyer' }
    // scattered obstacles
    const p = 0.3 + 0.5 * d
    const count = (rnd() < p ? 1 : 0) + (rnd() < p * 0.6 ? 1 : 0) + (d > 0.5 && rnd() < 0.3 ? 1 : 0)
    const used = []
    for (let i = 0; i < count; i++) {
      const x = cx + rr(-1, 1) * (hw - 8), yy = y + rnd() * 10
      if (inPath(x, yy) || used.some((u) => Math.abs(u - x) < 16)) continue
      used.push(x)
      const k = rnd()
      add(k < 0.3 ? 'treeS' : k < 0.5 ? 'tree' : k < 0.64 ? 'rock' : k < 0.76 ? 'stump' : k < 0.85 ? 'snowman' : k < 0.93 ? 'bush' : 'xmas', x, yy)
    }
  }
  const gift = (x, y, o) => add('gift', x, y, Object.assign({ v: (rnd() * SPR.gifts.length) | 0, pick: true }, o))
  function coinLine(y) {
    const n = 6 + ((rnd() * 7) | 0), amp = rr(10, 34), ph = rnd() * 6, off = rr(-1, 1) * (halfW(y) - 50)
    const f = (yy) => center(yy) + off + amp * Math.sin((yy - y) / 34 + ph)
    addPath(y, y + n * 14, f)
    for (let i = 0; i < n; i++) gift(f(y + i * 14), y + i * 14)
  }
  function gates(y) {
    const n = 3 + ((rnd() * 4) | 0)
    let side = rnd() < 0.5 ? -1 : 1
    for (let i = 0; i < n; i++) {
      const yy = y + i * 78, x = center(yy) + side * rr(26, 44)
      add('gate', x, yy, { w: 46, flat: false })
      addPath(yy - 10, yy + 10, () => x, 26)
      side = -side
    }
    G.next.coins = Math.max(G.next.coins, y + n * 78)
  }
  function ramp(y) {
    const x = center(y) + rr(-1, 1) * (halfW(y) - 44)
    add('ramp', x, y, { flat: true })
    addPath(y - 20, y + 30, () => x, 18)
    for (let i = 0; i < 6; i++) gift(x, y + 34 + i * 16, { air: true })
    add('cane', x, y + 34 + 6 * 16, { pick: true })
  }
  function power(y) {
    const x = center(y) + rr(-1, 1) * (halfW(y) - 30)
    const k = pick(['magnet', 'turbo', 'x2', P.hearts < 3 ? 'heart' : 'turbo', 'magnet'])
    add(k, x, y, { pick: true, pw: true })
    addPath(y - 16, y + 16, () => x, 14)
  }
  function spawnEgg(y) {
    const world = ['ogre', 'shield', 'hammer', 'web', 'yeti', 'snowman']
    const fresh = world.filter((k) => !save.eggs[k])
    const k = fresh.length && rnd() < 0.8 ? pick(fresh) : pick(world)
    const cx = center(y), hw = halfW(y)
    if (k === 'ogre') {
      const x = cx + rr(-0.4, 0.4) * hw
      add('swamp', x, y + 10, { flat: true, rx: 30, ry: 13 })
      add('ogre', x - 12, y + 2, { egg: 'ogre' }); add('donkey', x + 14, y + 4)
      addPath(y - 30, y + 40, () => x, 44)
    } else if (k === 'shield') {
      const x = cx + rr(-0.6, 0.6) * hw
      add('shieldPick', x, y, { pick: true, pw: true }); addPath(y - 16, y + 16, () => x, 14)
    } else if (k === 'hammer') {
      const x = cx + rr(-0.5, 0.5) * hw
      add('hammer', x, y); addPath(y - 24, y + 24, () => x, 20)
    } else if (k === 'web') {
      const x = cx + rr(-0.4, 0.4) * hw
      add('tree', x - 26, y); add('tree', x + 26, y); add('web', x, y, { tall: true })
      addPath(y - 30, y + 30, () => x, 36)
    } else if (k === 'yeti') {
      const s = rnd() < 0.5 ? -1 : 1
      add('yeti', cx + s * (hw - 6), y, { egg: 'yeti' })
    } else {
      const x = cx + rr(-0.6, 0.6) * hw
      add('snowman', x, y, { talk: true }); addPath(y - 20, y + 20, () => x, 10)
    }
  }
  function spawnSky(kind) {
    const dir = rnd() < 0.5 ? 1 : -1
    G.sky.push({ kind, dir, x: cam.x - dir * (W / 2 + 40), y: P.y + H * 0.22, drop: 0.3, t: 0 })
    if (kind === 'santa') { toast('🎅 Хо-хо-хо! Лови подарки!'); [76, 72, 76, 72].forEach((n, i) => tone(midi(n), 0.12, 'triangle', 0.12, 0, i * 0.12)) }
    else tone(200, 0.8, 'sawtooth', 0.08, 900)
  }

  // ───────────────────────── fx ─────────────────────────
  function puff(x, y, n, cols, sp, life) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, v = rnd() * (sp || 40)
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 10, life: (life || 0.5) * (0.5 + rnd()), max: life || 0.5, c: pick(cols), s: rnd() < 0.4 ? 2 : 1 })
    }
  }
  const SNOW = ['#ffffff', '#eef8fe', '#cfe7f7']
  function floatText(x, y, s, c) { G.texts.push({ x, y, s, c: c || '#fff', life: 1.1 }) }
  let toastT = 0
  function toast(s) { const el = $('toast'); el.textContent = s; el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2600) }
  function firework(x, y) {
    const cols = pick([['#e84537', '#ffcf4a'], ['#7fe3ff', '#ffffff'], ['#84c669', '#ffcf4a'], ['#ff7bac', '#ffffff']])
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 6.283, v = 50 + rnd() * 30
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.9 + rnd() * 0.4, max: 1.2, c: pick(cols), s: 2, drag: 2.2, glow: true })
    }
    noise(0.3, 0.2, 0, 1500)
  }

  // ───────────────────────── gameplay events ─────────────────────────
  function addCombo(n) {
    G.combo += n; G.comboT = 3.6
    const m = Math.min(10, 1 + ((G.combo / 4) | 0))
    if (m !== G.mult) { G.mult = m; const el = $('mult'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump') }
    G.stats.maxMult = Math.max(G.stats.maxMult, G.mult)
  }
  const award = (pts) => { const v = pts * G.mult * (G.x2 > 0 ? 2 : 1); G.score += v; return v }
  function foundEgg(id) {
    if (save.eggs[id]) return false
    save.eggs[id] = true
    const e = EGGS.find((x) => x.id === id)
    if (e.coins) save.coins += e.coins
    persist(); SFX.egg(); buzz([30, 40, 30])
    toast(`🥚 ПАСХАЛКА: ${e.name}! ${e.unlock ? 'Открыто: ' + e.unlock : '+' + e.coins + ' 🎁'}`)
    refreshMenu()
    return true
  }
  function crash(e) {
    if (G.turbo > 0 && !(e && e.talk)) { smash(e); return }
    if (P.tumble > 0 || (P.inv > 0 && !(e && e.talk))) return
    if (e && e.talk) { // the talking snowman loves warm hugs
      e.gone = true; puff(e.x, e.y - 6, 24, SNOW, 70, 0.7)
      for (let i = 0; i < 8; i++) gift(e.x + rr(-26, 26), e.y + rr(20, 70))
      floatText(e.x, e.y - 24, 'ОБНИМАШКИ!', '#ffcf4a'); SFX.power(); foundEgg('snowman'); return
    }
    if (G.shield) {
      G.shield = false; P.inv = 1; if (e) smashFx(e)
      floatText(P.x, P.y - 26, 'ЩИТ СПАС!', '#7fe3ff'); SFX.smash(); cam.shake = 4; return
    }
    P.hearts--; P.tumble = 0.75; P.inv = 2.2; P.vx = (P.x < (e ? e.x : P.x) ? -1 : 1) * 30
    G.combo = 0; G.mult = 1; G.comboT = 0
    cam.shake = 8; SFX.crash(); buzz(120)
    puff(P.x, P.y - 4, 22, SNOW, 80, 0.6)
    if (e && (e.type === 'snowman' || e.type === 'npc')) { e.gone = true; puff(e.x, e.y - 6, 14, SNOW, 60, 0.6) }
    if (P.hearts <= 0) { P.dead = true; G.overT = 1.1; SFX.over() }
  }
  function smashFx(e) { e.gone = true; puff(e.x, e.y - 6, 14, e.type === 'rock' ? ['#c0cbdc', '#8b9bb4'] : e.type === 'snowman' ? SNOW : ['#84c669', '#3fa34d', '#fff'], 80, 0.6) }
  function smash(e) {
    if (!e || e.gone) return
    smashFx(e); G.stats.smash++; SFX.smash(); cam.shake = Math.max(cam.shake, 3)
    floatText(e.x, e.y - 20, 'БАМ! +' + award(20), '#ff9f1c'); addCombo(1)
  }
  function collect(e) {
    e.gone = true
    const t = e.type
    if (t === 'gift' || t === 'cane') {
      const n = t === 'cane' ? 5 : 1
      G.runCoins += n; G.stats.gifts += n; award(5 * n); addCombo(t === 'cane' ? 2 : 0.5)
      SFX.gift(G.mult); puff(e.x, e.y - 4, 5, ['#ffcf4a', '#fff'], 40, 0.35)
      if (n > 1) floatText(e.x, e.y - 14, '+5 🎁', '#ffcf4a')
      if (e.from) foundEgg(e.from)
      return
    }
    SFX.power(); buzz(40); puff(e.x, e.y - 4, 14, ['#ffcf4a', '#fff', '#7fe3ff'], 70, 0.5)
    if (t === 'magnet') { G.magnet = 9; floatText(e.x, e.y - 16, 'МАГНИТ!', '#ff7bac') }
    else if (t === 'turbo') { G.turbo = 4.5; floatText(e.x, e.y - 16, 'КАКАО-ТУРБО!', '#ff9f1c') }
    else if (t === 'x2') { G.x2 = 10; floatText(e.x, e.y - 16, 'ОЧКИ x2!', '#ffcf4a') }
    else if (t === 'heart') { P.hearts = Math.min(3, P.hearts + 1); floatText(e.x, e.y - 16, '+ЖИЗНЬ', '#e84537') }
    else if (t === 'shieldPick') { G.shield = true; floatText(e.x, e.y - 16, 'ЩИТ!', '#7fe3ff'); foundEgg('shield') }
  }
  function lightning() {
    G.flash = 0.5; cam.shake = 10; SFX.thunder(); buzz([60, 30, 120])
    let n = 0
    for (const e of G.ents) {
      if (!e.solid || e.forest || e.gone || e.type === 'yeti') continue
      const sy = e.y - cam.y
      if (sy > -20 && sy < H + 40) { smashFx(e); n++ }
    }
    award(50 + n * 20)
    floatText(P.x, P.y - 34, 'ДОСТОИН!', '#7fe3ff')
  }

  // ───────────────────────── input ─────────────────────────
  const keys = {}
  let pointerX = null
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight']
  let kon = 0
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault()
    if (G.state === 'menu') {
      kon = e.code === KONAMI[kon] ? kon + 1 : e.code === KONAMI[0] ? 1 : 0
      if (kon === KONAMI.length) { kon = 0; audioInit(); if (!foundEgg('konami')) toast('🌈 Радужный след уже твой') }
      else if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) startRun()
    } else if (G.state === 'over') { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && G.overReady) startRun() }
    else if (e.code === 'Escape' || e.code === 'KeyP') togglePause()
  })
  window.addEventListener('keyup', (e) => { keys[e.code] = false })
  cv.addEventListener('pointerdown', (e) => { audioInit(); pointerX = e.clientX })
  cv.addEventListener('pointermove', (e) => { if (pointerX !== null) pointerX = e.clientX })
  const up = () => { pointerX = null }
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') togglePause() })
  function inputDir() {
    const l = keys.ArrowLeft || keys.KeyA, r = keys.ArrowRight || keys.KeyD
    if (l || r) return (r ? 1 : 0) - (l ? 1 : 0)
    if (pointerX !== null) {
      const dx = pointerX / SCALE - (P.x - cam.x + W / 2)
      return Math.abs(dx) < 3 ? 0 : clamp(dx / 22, -1, 1)
    }
    return 0
  }

  // ───────────────────────── update ─────────────────────────
  let trailT = 0
  function update(dt) {
    G.t += dt
    const playing = G.state === 'play'
    const meters = P.y / M
    G.diff = clamp(meters / 2600, 0, 1)

    // ── player ──
    if (playing && !P.dead) {
      const dir = P.tumble > 0 ? 0 : inputDir()
      const base = 78 + Math.min(105, meters * 0.04) + (G.turbo > 0 ? 85 : 0)
      P.speed += (base - P.speed) * Math.min(1, dt * (P.tumble > 0 ? 0 : 1.3))
      if (P.tumble > 0) { P.speed *= 1 - Math.min(1, dt * 4); P.tumble -= dt }
      if (P.inSwamp && P.z <= 0 && G.turbo <= 0) P.speed = Math.max(34, P.speed * (1 - dt * 5))
      const ctl = P.z > 0 ? 2.5 : P.onIce ? 1.4 : 9
      P.vx += (dir * P.speed * 0.95 - P.vx) * Math.min(1, dt * ctl)
      P.lean += (clamp(P.vx / 70, -1, 1) - P.lean) * Math.min(1, dt * 14)
      if (P.z > 0 || P.vz > 0) {
        P.z += P.vz * dt; P.vz -= 300 * dt; P.spin += dir * dt * 9
        if (P.z <= 0) {
          P.z = 0; P.vz = 0
          const rot = Math.round(Math.abs(P.spin) / 6.283)
          if (rot > 0) { G.stats.tricks += rot; addCombo(3 * rot); floatText(P.x, P.y - 30, `${rot * 360}! +${award(100 * rot)}`, '#ff7bac'); SFX.trick() }
          else { floatText(P.x, P.y - 26, 'ПРЫЖОК +' + award(20), '#fff') }
          P.spin = 0; SFX.land(); puff(P.x, P.y, 12, SNOW, 50, 0.4); cam.shake = Math.max(cam.shake, 2)
        }
      }
      P.inv = Math.max(0, P.inv - dt)
    } else if (G.state === 'menu') {
      P.speed = 46
      const tx = center(P.y) + Math.sin(G.t * 0.9) * 36
      P.vx = (tx - P.x) * 1.5; P.lean += (clamp(P.vx / 30, -1, 1) - P.lean) * dt * 6
    } else if (P.dead) {
      P.speed *= 1 - Math.min(1, dt * 3); P.vx *= 1 - Math.min(1, dt * 3)
    }
    if (G.state !== 'pause') {
      P.x += P.vx * dt; P.y += P.speed * dt
      const cxp = center(P.y), lim = halfW(P.y) + 30
      P.x = clamp(P.x, cxp - lim, cxp + lim)
    }

    // ── score / timers ──
    if (playing && !P.dead) {
      G.score += (P.speed * dt / M) * G.mult * (G.x2 > 0 ? 2 : 1)
      G.stats.dist = meters | 0
      if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; G.mult = 1 } }
      G.magnet = Math.max(0, G.magnet - dt); G.turbo = Math.max(0, G.turbo - dt); G.x2 = Math.max(0, G.x2 - dt)
      if (!G.newYear && meters >= 2027) { G.newYear = true; G.fire = 3; toast('🎆 2027 метров! С НОВЫМ ГОДОМ!'); foundEgg('newyear'); award(2027) }
      if (G.skyDue) { spawnSky(G.skyDue); G.skyDue = null }
      checkMissions(false)
    }
    if (G.fire > 0) { G.fire -= dt; if (rnd() < dt * 7) firework(cam.x + rr(-W / 2, W / 2) * 0.8, cam.y + rr(0.1, 0.7) * H) }
    G.flash = Math.max(0, G.flash - dt)

    // ── camera ──
    cam.x += (P.x - cam.x) * Math.min(1, dt * 5)
    cam.y = P.y - H * 0.3
    cam.shake = Math.max(0, cam.shake - dt * 22)

    // ── spawn rows ──
    while (G.rowY < cam.y + H + 48) { genRow(G.rowY); G.rowY += 16 }

    // ── tracks & trail ──
    if (P.z <= 0) {
      const last = G.tracks[G.tracks.length - 1]
      if (!last || Math.abs(last.y - P.y) + Math.abs(last.x - P.x) > 2) G.tracks.push({ x: P.x, y: P.y, l: P.lean })
      if (G.tracks.length > 260) G.tracks.splice(0, 40)
    } else if (G.tracks.length && !G.tracks[G.tracks.length - 1].gap) G.tracks.push({ gap: true, x: P.x, y: P.y })
    trailT -= dt
    if (trailT <= 0 && G.state !== 'pause') {
      trailT = 0.035
      const tr = itemOf('trail', save.equip.trail)
      if (P.z <= 0 && rnd() < 0.5) G.parts.push({ x: P.x + rr(-5, 5), y: P.y, vx: rr(-12, 12), vy: -rr(5, 25), life: 0.35, max: 0.35, c: '#fff', s: 1 })
      if (tr.id !== 'snow') {
        const c = tr.id === 'candy' || tr.id === 'rainbow' ? tr.cols[((G.t * 12) | 0) % tr.cols.length] : pick(tr.cols)
        G.parts.push({ x: P.x + rr(-4, 4), y: P.y - P.z - 2, vx: rr(-10, 10), vy: tr.id === 'fire' ? -rr(20, 50) : -rr(0, 16), life: rr(0.5, 1), max: 1, c, s: tr.id === 'spark' || tr.id === 'bolt' ? 1 : 2, glow: true })
      }
      if (G.turbo > 0) G.parts.push({ x: P.x + rr(-4, 4), y: P.y - 6, vx: rr(-20, 20), vy: -rr(40, 90), life: 0.4, max: 0.4, c: pick(['#ff9f1c', '#ffcf4a', '#fff']), s: 2, glow: true })
    }

    // ── entities ──
    P.onIce = false; P.inSwamp = false
    const air = P.z > 2
    for (const e of G.ents) {
      if (e.gone) continue
      if (e.type === 'npc') { e.y += e.v * dt; e.x += Math.cos(G.t * 1.3 + e.ph) * 26 * dt }
      const dx = e.x - P.x, dy = e.y - P.y
      if (!playing || P.dead) continue
      if (e.pick) {
        if (G.magnet > 0 && !e.pw && dx * dx + dy * dy < 80 * 80) { e.x -= dx * Math.min(1, dt * 9); e.y -= (dy + 2) * Math.min(1, dt * 9) }
        if (Math.abs(dx) < 10 && Math.abs(dy + 2) < 10) collect(e)
        continue
      }
      if (Math.abs(dy) > 60) { if (dy < -60) e.passed = true; continue }
      switch (e.type) {
        case 'ice': if (!air && (dx * dx) / (e.rx * e.rx) + (dy * dy) / (e.ry * e.ry) < 1) P.onIce = true; break
        case 'swamp':
          if (!air && (dx * dx) / (e.rx * e.rx) + (dy * dy) / (e.ry * e.ry) < 1) {
            if (!e.wet) { e.wet = true; floatText(P.x, P.y - 24, 'ФУ, БОЛОТО!', '#9bc53d'); SFX.swamp() }
            P.inSwamp = true; if (rnd() < dt * 30) puff(P.x, P.y, 2, ['#5d7a3a', '#7aa32c'], 30, 0.4)
          }
          break
        case 'ramp':
          if (!air && P.vz <= 0 && Math.abs(dx) < 12 && Math.abs(dy) < 7 && P.tumble <= 0) { P.vz = 105 + P.speed * 0.25; P.z = 1; SFX.jump(); addCombo(1) }
          break
        case 'gate':
          if (!e.passed && dy < 0) {
            e.passed = true
            if (Math.abs(dx) < e.w / 2) { e.ok = true; G.stats.gates++; addCombo(2); floatText(e.x, e.y - 22, 'ВОРОТА +' + award(25), '#7fe3ff'); SFX.gate() }
          }
          break
        case 'ogre': case 'yeti':
          if (e.egg && !e.met && dx * dx + dy * dy < 56 * 56) {
            e.met = true
            if (e.type === 'yeti') { floatText(e.x, e.y - 26, 'ДАЙ ПЯТЬ! +' + award(150), '#fff'); addCombo(2); SFX.gate() }
            foundEgg(e.egg)
          }
          break
        case 'web':
          if (!e.passed && dy < 0) { e.passed = true; if (Math.abs(dx) < 22) { G.turbo = Math.max(G.turbo, 2); floatText(e.x, e.y - 30, 'ПАУТИНА-РОГАТКА!', '#e84537'); award(150); SFX.jump(); foundEgg('web') } }
          break
        case 'hammer':
          if (!e.used && Math.abs(dx) < 11 && Math.abs(dy) < 9 && !air) {
            if (G.mult >= 3) { e.used = true; e.lifted = true; lightning(); foundEgg('hammer') }
            else if (!e.cool || G.t > e.cool) { e.cool = G.t + 1; P.vx = (dx > 0 ? -1 : 1) * 110; floatText(e.x, e.y - 28, 'НЕДОСТОИН! (x3)', '#c0cbdc'); SFX.nope(); cam.shake = 3 }
          }
          break
      }
      if (e.solid && !air) {
        const cy = dy - 1
        if (dx * dx + cy * cy < (e.r + 3.5) * (e.r + 3.5)) { e.hit = true; crash(e) }
        else if (!e.passed && dy < -5) {
          e.passed = true
          if (!e.hit && Math.abs(dx) < e.r + 13 && P.tumble <= 0 && !e.forest) {
            G.stats.near++; addCombo(1); SFX.near()
            floatText(P.x + (dx > 0 ? -10 : 10), P.y - 22, 'РЯДОМ! +' + award(10), '#84c669')
          }
        }
      }
    }
    // cull
    if (G.ents.length > 60 && (G.cullT = (G.cullT || 0) + dt) > 0.4) {
      G.cullT = 0
      G.ents = G.ents.filter((e) => !e.gone && e.y > cam.y - 50)
      G.paths = G.paths.filter((p) => p.y1 > cam.y - 40)
    }

    // ── sky visitors ──
    for (const s of G.sky) {
      s.t += dt; s.x += s.dir * 95 * dt; s.y += P.speed * 0.96 * dt
      s.drop -= dt
      if (s.drop <= 0 && Math.abs(s.x - cam.x) < W / 2 - 6) { s.drop = 0.16; gift(s.x, s.y + 18, { from: s.kind }) }
      if (rnd() < dt * 40) G.parts.push({ x: s.x - s.dir * 14, y: s.y - 30 + rr(-2, 2), vx: -s.dir * 30, vy: rr(-8, 8), life: 0.5, max: 0.5, c: s.kind === 'santa' ? pick(['#ffcf4a', '#fff']) : pick(['#7fe3ff', '#fff']), s: 1, glow: true })
    }
    G.sky = G.sky.filter((s) => Math.abs(s.x - cam.x) < W / 2 + 60)

    // ── particles, texts, snowfall ──
    for (const p of G.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt
      if (p.drag) { p.vx *= 1 - dt * p.drag; p.vy *= 1 - dt * p.drag; p.vy += 30 * dt }
    }
    G.parts = G.parts.filter((p) => p.life > 0)
    for (const t of G.texts) { t.life -= dt; t.y -= 22 * dt }
    G.texts = G.texts.filter((t) => t.life > 0)
    while (G.flakes.length < 70) G.flakes.push({ x: rnd() * 600, y: rnd() * 600, v: rr(14, 40), s: rnd() < 0.25 ? 2 : 1, w: rnd() * 6 })
    for (const f of G.flakes) { f.y += (f.v - P.speed * 0.25) * dt; f.x += (Math.sin(G.t * 1.5 + f.w) * 8 - 10 - P.vx * 0.1) * dt }

    // ── game over ──
    if (P.dead && G.state === 'play') { G.overT -= dt; if (G.overT <= 0) gameOver() }
  }

  // ───────────────────────── missions ─────────────────────────
  function checkMissions(final) {
    for (const m of save.missions) {
      if (m.done) continue
      if (G.stats[MISSIONS[m.t].stat] >= missionGoal(m)) {
        m.done = true; const r = missionReward(m); save.coins += r; persist()
        toast(`✔ Задание: ${MISSIONS[m.t].text(missionGoal(m))} +${r} 🎁`); SFX.egg()
      }
    }
    if (final) {
      save.missions = save.missions.map((m) => {
        if (!m.done) return m
        const usedT = save.missions.map((x) => x.t)
        const pool = Object.keys(MISSIONS).filter((t) => !usedT.includes(t))
        const lvls = (save.mLvl = save.mLvl || {}); lvls[m.t] = (lvls[m.t] || 0) + 1
        const t = pick(pool)
        return { t, lvl: lvls[t] || 0 }
      })
    }
  }
  function missionsHtml(showDone) {
    return save.missions.map((m) => `<div class="mission${m.done ? ' done' : ''}"><span>${m.done && showDone ? '✔ ' : ''}${MISSIONS[m.t].text(missionGoal(m))}</span><b>+${missionReward(m)} 🎁</b></div>`).join('')
  }

  // ───────────────────────── render ─────────────────────────
  function text(c, s, x, y, col, align) {
    c.font = '8px PS2P'; c.textBaseline = 'top'
    const w = s.length * 8
    let lx = Math.round(align === 'left' ? x : x - w / 2)
    lx = clamp(lx, 2, Math.max(2, W - w - 2))
    c.fillStyle = INK
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) c.fillText(s, lx + ox, Math.round(y) + oy)
    c.fillStyle = col; c.fillText(s, lx, Math.round(y))
  }
  function bubble(c, lines, x, y) {
    const w = Math.max(...lines.map((l) => l.length)) * 8 + 8, h = lines.length * 10 + 6
    const lx = clamp(Math.round(x - w / 2), 2, W - w - 2), ty = Math.round(y - h)
    c.fillStyle = INK; c.fillRect(lx - 1, ty, w + 2, h); c.fillRect(lx, ty - 1, w, h + 2); c.fillRect(Math.round(x) - 2, ty + h, 4, 3)
    c.fillStyle = '#fff'; c.fillRect(lx, ty, w, h); c.fillRect(Math.round(x) - 1, ty + h, 2, 2)
    c.font = '8px PS2P'; c.textBaseline = 'top'; c.fillStyle = INK
    lines.forEach((l, i) => c.fillText(l, lx + 4 + ((w - 8 - l.length * 8) >> 1), ty + 4 + i * 10))
  }
  function ellipse(c, x, y, rx, ry, col) {
    c.fillStyle = col
    for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry))); c.fillRect(Math.round(x) - w, Math.round(y) + j, w * 2, 1) }
  }
  const BULBS = [[6, 9], [10, 12], [4, 16], [11, 19], [3, 23], [8, 21], [12, 25], [7, 14]]
  const BULB_C = ['#e84537', '#ffcf4a', '#7fe3ff', '#ff7bac']
  const lights = []
  function nightAmount(meters) {
    const ph = ((meters + 280) % 1700) / 1700
    const s = (a, b, v) => clamp((v - a) / (b - a), 0, 1)
    return ph < 0.5 ? 0 : ph < 0.6 ? s(0.5, 0.6, ph) : ph < 0.9 ? 1 : 1 - s(0.9, 1, ph)
  }

  function drawEnt(c, e, sx, sy) {
    switch (e.type) {
      case 'tree': tile(c, 6, 0, sx - 8, sy - 32); tile(c, 6, 1, sx - 8, sy - 16); break
      case 'xmas': {
        tile(c, 6, 0, sx - 8, sy - 32); tile(c, 6, 1, sx - 8, sy - 16)
        const k = (G.t * 3 + e.seed) | 0
        BULBS.forEach(([bx, by], i) => { c.fillStyle = (i + k) % 3 ? BULB_C[(i + k) % 4] : '#fff'; c.fillRect(Math.round(sx) - 8 + bx, Math.round(sy) - 32 + by, 1, 1) })
        c.fillStyle = '#ffcf4a'; c.fillRect(Math.round(sx) - 1, Math.round(sy) - 34, 2, 3); c.fillRect(Math.round(sx) - 2, Math.round(sy) - 33, 4, 1)
        lights.push([sx, sy - 16, 20, BULB_C[k % 4]])
        break
      }
      case 'dead': tile(c, 7, 0, sx - 8, sy - 32); tile(c, 7, 1, sx - 8, sy - 16); break
      case 'treeS': tile(c, 6, 2, sx - 8, sy - 16); break
      case 'bush': tile(c, 7, 2, sx - 8, sy - 16); break
      case 'rock': tile(c, 9, 6, sx - 8, sy - 14); break
      case 'stump': tile(c, 11, 3, sx - 8, sy - 15); break
      case 'snowman':
        tile(c, 9, 5, sx - 8, sy - 16)
        if (e.talk) { c.fillStyle = '#e84537'; c.fillRect(Math.round(sx) - 3, Math.round(sy) - 9, 6, 1); if (sy > 30 && sy < H * 0.8) bubble(c, ['ОБОЖАЮ', 'ОБНИМАШКИ!'], sx, sy - 20) }
        break
      case 'npc': tile(c, 10 + (((G.t * 4 + e.seed) | 0) % 8 === 0 ? 1 : 0), e.kind, sx - 8, sy - 16); break
      case 'yeti':
        tile(c, e.met ? 8 : 6 + (((G.t * 3) | 0) % 2), 6, sx - 8, sy - 16)
        if (e.egg && !e.met && sy < H * 0.8) bubble(c, ['ДАЙ ПЯТЬ!'], sx, sy - 20)
        break
      case 'gate': {
        const w = e.w / 2, lift = e.ok ? -2 : 0
        tile(c, 8, 1, sx - w - 8, sy - 16 + lift); tile(c, 9, 1, sx + w - 8, sy - 16 + lift)
        if (!e.passed) { c.fillStyle = 'rgba(0,154,220,.35)'; for (let i = -w + 8; i < w - 6; i += 6) c.fillRect(Math.round(sx + i), Math.round(sy) - 2, 3, 1) }
        break
      }
      case 'gift': { const b = Math.round(Math.sin(G.t * 5 + e.seed) * 1.5); c.fillStyle = 'rgba(63,38,49,.18)'; c.fillRect(Math.round(sx) - 4, Math.round(sy) - 1, 8, 2); c.drawImage(SPR.gifts[e.v], Math.round(sx) - 5, Math.round(sy) - 11 + b - (e.air ? 6 : 0)); break }
      case 'cane': c.drawImage(SPR.cane, Math.round(sx) - 4, Math.round(sy) - 13 + Math.round(Math.sin(G.t * 5) * 1.5)); lights.push([sx, sy - 6, 10, '#fff']); break
      case 'magnet': case 'turbo': case 'x2': case 'heart': case 'shieldPick': {
        const img = { magnet: SPR.magnet, turbo: SPR.cocoa, x2: SPR.x2, heart: SPR.heart, shieldPick: SPR.shield }[e.type]
        const b = Math.round(Math.sin(G.t * 4 + e.seed) * 2)
        c.fillStyle = 'rgba(255,207,74,.5)'
        const rad = 9 + (((G.t * 6) | 0) % 2)
        c.fillRect(Math.round(sx) - rad, Math.round(sy) - 7, rad * 2, 1); c.fillRect(Math.round(sx), Math.round(sy) - 7 - rad, 1, rad * 2)
        c.drawImage(img, Math.round(sx - img.width / 2), Math.round(sy) - 7 - (img.height >> 1) + b)
        lights.push([sx, sy - 6, 16, '#ffcf4a'])
        break
      }
      case 'ogre':
        c.drawImage(SPR.ogre, Math.round(sx) - 8, Math.round(sy) - 15 + (((G.t * 2) | 0) % 2))
        if (sy > 20 && sy < H * 0.85 && ((G.t / 2.2) | 0) % 2 === 0) bubble(c, ['ЭТО МОЁ', 'БОЛОТО!'], sx, sy - 18)
        break
      case 'donkey':
        c.drawImage(SPR.donkey, Math.round(sx) - 7, Math.round(sy) - 14 + (((G.t * 2 + 1) | 0) % 2))
        if (sy > 20 && sy < H * 0.85 && ((G.t / 2.2) | 0) % 2 === 1) bubble(c, ['МЫ УЖЕ', 'ПРИЕХАЛИ?'], sx, sy - 17)
        break
      case 'hammer':
        tile(c, 9, 6, sx - 8, sy - 14)
        if (!e.lifted) { c.drawImage(SPR.hammer, Math.round(sx) - 6, Math.round(sy) - 22); if (((G.t * 2) | 0) % 3 === 0) { c.fillStyle = '#7fe3ff'; c.fillRect(Math.round(sx) + 5, Math.round(sy) - 20, 1, 2); c.fillRect(Math.round(sx) - 7, Math.round(sy) - 15, 1, 2) } }
        break
      case 'web': {
        c.fillStyle = '#fff'
        for (let i = -22; i <= 22; i++) { const sag = Math.round((1 - (i * i) / 484) * 5); c.fillRect(Math.round(sx) + i, Math.round(sy) - 26 + sag, 1, 1); if (i % 4 === 0) c.fillRect(Math.round(sx) + i, Math.round(sy) - 30 + (sag >> 1), 1, 4 + (sag >> 1)) }
        for (let i = -22; i <= 22; i++) c.fillRect(Math.round(sx) + i, Math.round(sy) - 30 + (Math.round((1 - (i * i) / 484) * 5) >> 1), 1, 1)
        const sw = Math.round(Math.sin(G.t * 2) * 2)
        c.fillRect(Math.round(sx), Math.round(sy) - 22, 1, 4)
        c.drawImage(SPR.hang, Math.round(sx) - 5 + sw, Math.round(sy) - 19)
        break
      }
    }
  }

  function render() {
    const c = ctx
    const meters = P.y / M
    const shx = cam.shake ? Math.round(rr(-1, 1) * cam.shake * 0.5) : 0, shy = cam.shake ? Math.round(rr(-1, 1) * cam.shake * 0.5) : 0
    const ox = Math.round(W / 2 - cam.x) + shx, oy = Math.round(-cam.y) + shy
    lights.length = 0

    // snow ground + speckles
    c.fillStyle = '#eef8fe'; c.fillRect(0, 0, W, H)
    const gx0 = Math.floor((cam.x - W / 2) / 16) - 1, gy0 = Math.floor(cam.y / 16) - 1
    for (let gy = gy0; gy < gy0 + H / 16 + 3; gy++) for (let gx = gx0; gx < gx0 + W / 16 + 3; gx++) {
      const h = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0
      if (h % 4 === 0) { c.fillStyle = h % 3 ? '#ffffff' : '#cfe7f7'; c.fillRect(gx * 16 + ox + (h >> 4) % 14, gy * 16 + oy + (h >> 9) % 14, 1 + (h >> 14) % 2, 1) }
      if (h % 23 === 0) { c.fillStyle = '#dcedf9'; c.fillRect(gx * 16 + ox + (h >> 5) % 8, gy * 16 + oy + (h >> 11) % 12, 5 + (h >> 16) % 5, 1) }
    }
    // flat things
    for (const e of G.ents) {
      if (!e.flat || e.gone) continue
      const sx = e.x + ox, sy = e.y + oy
      if (sy < -40 || sy > H + 40) continue
      if (e.type === 'ice') { ellipse(c, sx, sy, e.rx, e.ry, '#b7d2eb'); ellipse(c, sx, sy - 1, e.rx - 2, e.ry - 2, '#cfe7f7'); c.fillStyle = '#eef8fe'; c.fillRect(Math.round(sx - e.rx / 2), Math.round(sy - 3), 6, 1); c.fillRect(Math.round(sx + 2), Math.round(sy + 3), 8, 1) }
      else if (e.type === 'swamp') {
        ellipse(c, sx, sy, e.rx + 2, e.ry + 2, '#8a6f4a'); ellipse(c, sx, sy, e.rx, e.ry, '#5d7a3a'); ellipse(c, sx - 3, sy - 2, e.rx - 8, e.ry - 5, '#6c8f3f')
        const b = (G.t * 2) | 0; c.fillStyle = '#9bc53d'; c.fillRect(Math.round(sx) - 12 + (b % 3) * 9, Math.round(sy) + 2 - (b % 2) * 4, 2, 2)
      } else if (e.type === 'ramp') c.drawImage(SPR.ramp, Math.round(sx) - 13, Math.round(sy) - 9)
    }
    // ski tracks
    c.fillStyle = '#c5def1'
    for (const t of G.tracks) { if (t.gap) continue; const sx = Math.round(t.x + ox), sy = Math.round(t.y + oy); if (sy < -4) continue; c.fillRect(sx - 3 + Math.round(t.l * 2), sy, 1, 2); c.fillRect(sx + 2 + Math.round(t.l * 2), sy, 1, 2) }

    // depth-sorted sprites
    const list = []
    for (const e of G.ents) {
      if (e.flat || e.gone) continue
      const sy = e.y + oy
      if (sy < -6 || sy > H + 40) continue
      const sx = e.x + ox
      if (sx < -30 || sx > W + 30) continue
      list.push(e)
    }
    list.push(P)
    list.sort((a, b) => a.y - b.y)
    for (const e of list) {
      if (e === P) { drawPlayer(c, ox, oy); continue }
      drawEnt(c, e, e.x + ox, e.y + oy)
    }
    // particles
    for (const p of G.parts) { if (p.glow) continue; c.fillStyle = p.c; c.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.s, p.s) }
    // sky visitors + shadows
    for (const s of G.sky) {
      const img = s.kind === 'santa' ? (s.dir > 0 ? SPR.sleigh : SPR.sleighL) : (s.dir > 0 ? SPR.flyer : SPR.flyerL)
      const sx = Math.round(s.x + ox), sy = Math.round(s.y + oy)
      c.fillStyle = 'rgba(63,38,49,.16)'; c.fillRect(sx - (img.width >> 1) + 2, sy + 14, img.width - 4, 3)
      c.drawImage(img, sx - (img.width >> 1), sy - 36 + Math.round(Math.sin(s.t * 5) * 2))
      lights.push([sx, sy - 30, 26, '#ffcf4a'])
    }

    // night: darkness with light holes
    const n = nightAmount(meters)
    const ph = ((meters + 280) % 1700) / 1700
    const warm = Math.max(0, 1 - Math.abs(ph - 0.53) / 0.08) + Math.max(0, 1 - Math.abs(ph - 0.96) / 0.06)
    if (warm > 0) { c.fillStyle = `rgba(255,120,60,${0.16 * Math.min(1, warm)})`; c.fillRect(0, 0, W, H) }
    if (n > 0) {
      dctx.globalCompositeOperation = 'source-over'
      dctx.clearRect(0, 0, W, H)
      dctx.fillStyle = `rgba(14,20,66,${0.64 * n})`; dctx.fillRect(0, 0, W, H)
      dctx.globalCompositeOperation = 'destination-out'
      const hole = (x, y, r, a) => { const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = g; dctx.fillRect(x - r, y - r, r * 2, r * 2) }
      hole(P.x + ox, P.y + oy - 8 - P.z, 52, 0.9)
      hole(P.x + ox, P.y + oy + 40, 60, 0.55) // headlamp beam ahead
      for (const l of lights) hole(l[0], l[1], l[2], 0.75)
      c.drawImage(dark, 0, 0)
    }
    for (const p of G.parts) { if (!p.glow) continue; c.fillStyle = p.c; c.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.s, p.s) }

    // falling snow (screen space)
    c.fillStyle = '#fff'
    for (const f of G.flakes) c.fillRect((((f.x % W) + W) % W) | 0, (((f.y % H) + H) % H) | 0, f.s, f.s)

    // world texts
    for (const t of G.texts) { c.globalAlpha = Math.min(1, t.life * 3); text(c, t.s, t.x + ox, t.y + oy, t.c); c.globalAlpha = 1 }
    if (G.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, G.flash * 2)})`; c.fillRect(0, 0, W, H) }
    if (G.turbo > 0) { c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 8; i++) c.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1, 10 + rnd() * 16) }
  }

  function drawPlayer(c, ox, oy) {
    const sx = P.x + ox, sy = P.y + oy
    // shadow
    const sw = P.z > 0 ? Math.max(3, 6 - P.z / 8) : 6
    c.fillStyle = 'rgba(63,38,49,.2)'; c.fillRect(Math.round(sx - sw), Math.round(sy) - 1, Math.round(sw * 2), 2)
    if (P.inv > 0 && P.tumble <= 0 && ((G.t * 14) | 0) % 2) return
    if (P.tumble > 0 || P.dead || (P.z > 0 && Math.abs(P.spin) > 0.2)) {
      c.save(); c.translate(Math.round(sx), Math.round(sy - 9 - P.z))
      c.rotate(P.z > 0 ? P.spin : P.dead && P.tumble <= 0 ? 1.57 : (0.75 - P.tumble) * 14)
      c.drawImage(skierImg, -8, -10); c.restore()
    } else {
      const bob = P.z > 0 ? 0 : ((G.t * 6) | 0) % 2
      drawSkier(c, skierImg, sx, sy - P.z, P.lean, bob)
    }
    if (G.shield) { c.strokeStyle = '#7fe3ff'; c.lineWidth = 1; c.beginPath(); c.arc(Math.round(sx) + 0.5, Math.round(sy - 9 - P.z) + 0.5, 12 + (((G.t * 6) | 0) % 2), 0, 6.3); c.stroke() }
    if (G.magnet > 0) { c.fillStyle = '#ff7bac'; const a = G.t * 6; c.fillRect(Math.round(sx + Math.cos(a) * 12), Math.round(sy - 9 - P.z + Math.sin(a) * 12), 2, 2); c.fillRect(Math.round(sx - Math.cos(a) * 12), Math.round(sy - 9 - P.z - Math.sin(a) * 12), 2, 2) }
  }

  // ───────────────────────── HUD / screens ─────────────────────────
  const hudCache = {}
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v } }
  function updateHud() {
    setText('score', String(Math.floor(G.score)))
    setText('dist', Math.floor(P.y / M) + ' м')
    setText('hearts', '♥'.repeat(Math.max(0, P.hearts)) + '♡'.repeat(3 - Math.max(0, P.hearts)))
    setText('coinsHud', '🎁 ' + G.runCoins)
    const show = G.mult > 1 || G.combo > 0
    $('comboBox').classList.toggle('hidden', !show)
    if (show) { setText('mult', 'x' + G.mult); $('comboBar').firstElementChild.style.width = clamp(G.comboT / 3.6, 0, 1) * 100 + '%' }
    const pw = [['🧲', G.magnet, 9], ['☕', G.turbo, 4.5], ['x2', G.x2, 10]].filter((p) => p[1] > 0)
    const key = pw.map((p) => p[0]).join() + (G.shield ? 'S' : '')
    if (hudCache.pw !== key) { hudCache.pw = key; $('powers').innerHTML = pw.map((p) => `<div class="pw">${p[0]}<u><i></i></u></div>`).join('') + (G.shield ? '<div class="pw">🛡️ щит</div>' : '') }
    pw.forEach((p, i) => { $('powers').children[i].querySelector('i').style.width = (p[1] / p[2]) * 100 + '%' })
  }
  const show = (id, on) => $(id).classList.toggle('hidden', !on)
  function refreshMenu() {
    $('eggCount').textContent = Object.keys(save.eggs).length + '/' + EGGS.length
    $('menuStats').innerHTML = `🎁 ${save.coins} &nbsp; ★ рекорд ${save.best}` + (save.bestDist ? ` (${save.bestDist} м)` : '')
    $('menuMissions').innerHTML = '<div style="margin-bottom:4px;font-size:9px">ЗАДАНИЯ</div>' + missionsHtml(false)
    $('muteBtn').textContent = save.mute ? '♪ выкл' : '♪ вкл'
    $('shopCoins').textContent = save.coins
  }
  function startRun() {
    audioInit(); SFX.click()
    for (const m of save.missions) delete m.done
    resetWorld(true); G.state = 'play'
    show('menu', false); show('over', false); show('pause', false); show('shop', false); show('eggs', false); show('hud', true)
    floatText(0, 40, 'ПОЕХАЛИ!', '#ffcf4a')
  }
  function toMenu() {
    G.state = 'menu'; resetWorld(false)
    show('menu', true); show('over', false); show('pause', false); show('hud', false); refreshMenu()
  }
  function togglePause() {
    if (G.state === 'play' && !P.dead) { G.state = 'pause'; show('pause', true) }
    else if (G.state === 'pause') { G.state = 'play'; show('pause', false) }
  }
  function gameOver() {
    G.state = 'over'; G.overReady = false
    const score = Math.floor(G.score), dist = Math.floor(P.y / M)
    const isBest = score > save.best
    save.coins += G.runCoins; save.runs++
    if (isBest) { save.best = score; G.fire = 2.5 }
    save.bestDist = Math.max(save.bestDist, dist)
    const doneHtml = missionsHtml(true)
    checkMissions(true); persist()
    $('finalScore').textContent = score
    show('newBest', isBest)
    $('overStats').innerHTML = [['Дистанция', dist + ' м'], ['Подарки', '+' + G.runCoins + ' 🎁'], ['Опасные пролёты', G.stats.near], ['Ворота', G.stats.gates], ['Сальто', G.stats.tricks], ['Макс. комбо', 'x' + G.stats.maxMult], ['Рекорд', save.best]]
      .map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('')
    $('overMissions').innerHTML = doneHtml
    show('hud', false); show('over', true)
    setTimeout(() => { G.overReady = true }, 350)
  }

  // ── shop ──
  let shopCat = 'hat', tryOn = null
  function openShop() { tryOn = null; show('shop', true); renderShop() }
  function renderShop() {
    $('shopCoins').textContent = save.coins
    $('tabs').innerHTML = CATS.map((c) => `<button class="btn${c.id === shopCat ? ' on' : ''}" data-cat="${c.id}">${c.name}</button>`).join('')
    const box = $('items'); box.innerHTML = ''
    for (const it of ITEMS[shopCat]) {
      const owned = isOwned(shopCat, it), on = save.equip[shopCat] === it.id
      const el = document.createElement('div')
      el.className = 'item' + (on ? ' on' : '') + (owned ? '' : ' locked')
      const cvs = mk(16, 19), x = cvs.getContext('2d')
      if (shopCat === 'trail') { it.cols.forEach((col, i) => { x.fillStyle = col; x.fillRect(3 + ((i * 5) % 10), 2 + i * 3, 2, 2); x.fillRect(9 - ((i * 3) % 7), 4 + i * 3, 2, 2) }) }
      else x.drawImage(buildSkier(Object.assign({}, save.equip, { [shopCat]: it.id })), 0, 0)
      el.appendChild(cvs)
      const nm = document.createElement('div'); nm.textContent = it.name; el.appendChild(nm)
      const st = document.createElement('div')
      if (on) { st.className = 'own'; st.textContent = 'надето' }
      else if (owned) { st.className = 'own'; st.textContent = 'есть' }
      else if (it.egg) { st.className = 'lock'; st.textContent = '🥚 секрет' }
      else { st.className = 'price'; st.textContent = '🎁 ' + it.price }
      el.appendChild(st)
      el.onclick = () => clickItem(it)
      box.appendChild(el)
    }
    const eq = Object.assign({}, save.equip, tryOn ? { [tryOn.cat]: tryOn.it.id } : {})
    previewImg = buildSkier(eq); previewTrail = itemOf('trail', eq.trail)
    const info = $('previewInfo')
    if (tryOn) {
      const it = tryOn.it
      info.innerHTML = `<b>${it.name}</b>` + (it.egg ? `Секретная вещь. Подсказка: ${EGGS.find((e) => e.id === it.egg).hint}` : `Примерка. Цена: 🎁 ${it.price}.<br>${save.coins >= it.price ? 'Нажми ещё раз — купить.' : 'Не хватает ' + (it.price - save.coins) + ' 🎁'}`)
    } else info.innerHTML = '<b>Твой лыжник</b>Собирай подарки на склоне и находи пасхалки — открывай новые вещи.'
  }
  function clickItem(it) {
    audioInit()
    if (isOwned(shopCat, it)) { save.equip[shopCat] = it.id; tryOn = null; persist(); SFX.click() }
    else if (it.egg) { tryOn = { cat: shopCat, it }; SFX.nope() }
    else if (tryOn && tryOn.it === it && save.coins >= it.price) {
      save.coins -= it.price; save.owned[shopCat + ':' + it.id] = true; save.equip[shopCat] = it.id; tryOn = null; persist(); SFX.buy(); toast('Куплено: ' + it.name + '!')
    } else { tryOn = { cat: shopCat, it }; if (save.coins < it.price) SFX.nope(); else SFX.click() }
    skierImg = buildSkier(save.equip)
    renderShop(); refreshMenu()
  }
  let previewImg = null, previewTrail = null
  const pcv = $('preview'), pctx = pcv.getContext('2d')
  const pParts = []
  function renderPreview(dt) {
    if ($('shop').classList.contains('hidden') || !previewImg) return
    pctx.clearRect(0, 0, 40, 44)
    const lean = Math.sin(G.t * 1.6) * 0.9
    if (previewTrail && rnd() < 0.5) pParts.push({ x: 20 + lean * 3 + rr(-4, 4), y: 34, c: previewTrail.id === 'snow' ? '#fff' : pick(previewTrail.cols), l: 0.6 })
    for (const p of pParts) { p.l -= dt; p.y -= 40 * dt; pctx.fillStyle = p.c; pctx.fillRect(p.x | 0, p.y | 0, 2, 2) }
    while (pParts.length && pParts[0].l <= 0) pParts.shift()
    pctx.fillStyle = 'rgba(63,38,49,.2)'; pctx.fillRect(13, 38, 14, 2)
    drawSkier(pctx, previewImg, 20, 39, lean, ((G.t * 6) | 0) % 2)
  }
  function renderEggs() {
    $('eggList').innerHTML = EGGS.map((e) => {
      const f = save.eggs[e.id]
      return `<div class="egg${f ? '' : ' no'}"><div class="ic">${f ? e.ic : '❔'}</div><div><b>${f ? e.name : '???'}</b>${e.hint}<br><span style="color:#c7861a">${f ? '✔ ' : ''}Награда: ${e.unlock || '+' + e.coins + ' 🎁'}</span></div></div>`
    }).join('')
  }

  // ── buttons ──
  $('playBtn').onclick = startRun
  $('againBtn').onclick = () => { if (G.overReady) startRun() }
  $('shopBtn').onclick = () => { audioInit(); SFX.click(); openShop() }
  $('overShop').onclick = () => { SFX.click(); toMenu(); openShop() }
  $('overMenu').onclick = () => { SFX.click(); toMenu() }
  $('shopClose').onclick = () => { SFX.click(); show('shop', false) }
  $('eggsBtn').onclick = () => { audioInit(); SFX.click(); renderEggs(); show('eggs', true) }
  $('eggsClose').onclick = () => { SFX.click(); show('eggs', false) }
  $('pauseBtn').onclick = togglePause
  $('resumeBtn').onclick = togglePause
  $('quitBtn').onclick = () => { save.coins += G.runCoins; persist(); toMenu() }
  $('muteBtn').onclick = () => { audioInit(); save.mute = !save.mute; if (master) master.gain.value = save.mute ? 0 : 0.6; persist(); refreshMenu() }
  $('tabs').onclick = (e) => { const b = e.target.closest('[data-cat]'); if (b) { shopCat = b.dataset.cat; tryOn = null; SFX.click(); renderShop() } }
  let logoTaps = 0, logoT = 0
  $('logo').onclick = () => {
    audioInit(); const now = performance.now()
    logoTaps = now - logoT < 600 ? logoTaps + 1 : 1; logoT = now
    tone(midi(60 + logoTaps * 2), 0.08, 'square', 0.08)
    if (logoTaps >= 7) { logoTaps = 0; if (!foundEgg('konami')) toast('🌈 Радужный след уже твой') }
  }

  // ───────────────────────── loop ─────────────────────────
  let lastT = 0
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016)
    lastT = now
    if (G.state !== 'pause') update(dt)
    render()
    if (G.state === 'play') updateHud()
    renderPreview(dt)
    requestAnimationFrame(frame)
  }
  function boot() {
    buildSprites(); resize(); resetWorld(false); refreshMenu()
    requestAnimationFrame(frame)
  }
  tiles.onload = () => {
    const ready = document.fonts && document.fonts.load ? document.fonts.load('8px PS2P', 'ЖжAa1').catch(() => {}) : Promise.resolve()
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(boot)
  }
  tiles.src = 'tiles.png'
})()
