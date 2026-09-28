/* Local preview only. Never uploaded to Apps Script. */
(() => {
  const key = 'smart-boxes-demo-v1';
  const image = (symbol, color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="480" viewBox="0 0 600 480"><rect width="600" height="480" fill="${color}"/><ellipse cx="300" cy="370" rx="120" ry="17" fill="#203527" opacity=".07"/><text x="300" y="280" text-anchor="middle" font-size="165">${symbol}</text></svg>`);
  const seed = [
    { id: '673832429', name: 'Іграшки 1–3 роки', high: 5, items: [
      ['Дошка з фігурками', 'Для вивчення англійської та маленьких відкриттів.', '🧩', '#eae8d9'],
      ['Пазли мʼякі', 'Повний набір у сумочці.', '🧸', '#e3e8df'],
      ['Водні розмальовки', 'Додати трохи води — і починається магія.', '🎨', '#ece4db'],
      ['Куб', '', '🧊', '#e1e8e8'],
      ['Пазл зебра з 4х елементів', '', '🦓', '#ebe9df']
    ].map(([title, description, symbol, color], i) => ({ id: crypto.randomUUID(), number: i + 1, title, description, photoUrl: image(symbol, color), hasPhoto: true, revision: crypto.randomUUID() })) },
    { id: '200', name: 'Мʼякі іграшки', high: 1, items: [{ id: crypto.randomUUID(), number: 1, title: 'Улюблений ведмедик', description: 'Той самий, без якого нікуди.', photoUrl: image('🧸', '#e9dfd1'), hasPhoto: true, revision: crypto.randomUUID() }] }
  ];
  let boxes;
  try { boxes = JSON.parse(localStorage.getItem(key)) || seed; } catch (_) { boxes = seed; }
  function persist() { localStorage.setItem(key, JSON.stringify(boxes)); }
  window.smartBoxesDemo = async (method, ...args) => {
    await new Promise(resolve => setTimeout(resolve, 180));
    if (method === 'getInventory') return structuredClone({ boxes, skipped: [], appUrl: location.origin + '/' });
    if (method === 'createBox') {
      const name = args[0].trim();
      if (!name || name.length > 100 || /[:\\/?*\[\]]/.test(name)) throw new Error('Введіть допустиму назву коробки.');
      if (boxes.some(box => box.name.toLowerCase() === name.toLowerCase())) throw new Error('Коробка з такою назвою вже існує.');
      const box = { id: String(Date.now()), name, items: [], high: 0 }; boxes.push(box); persist(); return { id: box.id };
    }
    if (method === 'saveItem') {
      const input = args[0]; const box = boxes.find(box => box.id === input.boxId);
      const old = box.items.find(item => item.id === input.id);
      if (old && old.revision !== input.revision) throw new Error('Річ уже змінилася. Оновіть список.');
      const item = { id: input.id || input.requestId, title: input.title.trim(), description: input.description.trim(), number: old?.number || ++box.high, photoUrl: input.photo ? 'data:image/jpeg;base64,' + input.photo.base64 : old?.photoUrl, hasPhoto: true, revision: crypto.randomUUID() };
      if (!item.title) throw new Error('Введіть назву речі.');
      if (old) box.items.splice(box.items.indexOf(old), 1, item); else box.items.push(item);
      persist(); return { id: item.id, boxId: box.id };
    }
    if (method === 'deleteItem') {
      const box = boxes.find(box => box.id === args[0]); box.items = box.items.filter(item => item.id !== args[1]); persist(); return { deleted: true };
    }
    if (method === 'getItemPhoto') return boxes.find(box => box.id === args[0])?.items.find(item => item.id === args[1])?.photoUrl || '';
    throw new Error('Unknown demo method');
  };
})();
