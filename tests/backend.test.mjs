import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';

const source = (await Promise.all(['Config', 'Code', 'Photos'].map(name => readFile(new URL(`../apps-script/${name}.gs`, import.meta.url), 'utf8')))).join('\n');
const image = () => ({ getContentUrl: () => 'https://example.test/photo.jpg', getAltTextTitle: () => 'Original photo', getAltTextDescription: () => 'Original' });

class Sheet {
  constructor(id, name, rows) { this.id = id; this.name = name; this.data = rows; this.maxRows = 100; this.maxCols = 26; this.photoWrites = 0; }
  getSheetId() { return this.id; } getName() { return this.name; }
  getMaxRows() { return this.maxRows; } getMaxColumns() { return this.maxCols; }
  getLastRow() { return this.data.length; }
  getRange(row, col, height = 1, width = 1) {
    const sheet = this;
    return {
      getValues() { return Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => sheet.data[row - 1 + i]?.[col - 1 + j] ?? '')); },
      getDisplayValues() { return this.getValues().map(r => r.map(String)); },
      getFormulas() { return this.getValues().map(r => r.map(v => typeof v === 'string' && v.startsWith('=') ? v : '')); },
      getValue() { return this.getValues()[0][0]; },
      setValues(values) {
        values.forEach((valuesRow, i) => valuesRow.forEach((v, j) => {
          if (col + j === 3 && row + i >= 3) sheet.photoWrites++;
          sheet.data[row - 1 + i] ||= [];
          sheet.data[row - 1 + i][col - 1 + j] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
        })); return this;
      },
      setValue(value) { return this.setValues([[value]]); }
    };
  }
  hideColumns() {} setRowHeight() {} insertRowsAfter(_, n) { this.maxRows += n; }
  insertColumnsAfter(_, n) { this.maxCols += n; }
  deleteRow(row) { this.data.splice(row - 1, 1); }
}

function fixture(rows = [[1, 'Пазли мʼякі', image(), ''], [5, 'Куб', image(), '']]) {
  const sheet = new Sheet(673832429, 'Іграшки 1–3 роки', [['Іграшки'], ['№', 'Title', 'Photo', 'Description'], ...rows]);
  const props = new Map(); const uploaded = []; let releases = 0;
  const context = vm.createContext({
    console,
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }), flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) || null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => releases++ }) },
    Utilities: {
      getUuid: randomUUID, DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_, text) => createHash('sha256').update(text).digest(),
      base64EncodeWebSafe: value => Buffer.from(value).toString('base64url'),
      base64Decode: value => [...Buffer.from(value, 'base64')],
      newBlob: value => value
    },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/test/exec' }) }
  });
  vm.runInContext(source, context);
  // Mock the Google network boundary only; CRUD, migration and validations run as written.
  context.upload_ = (_, title, id) => {
    const file = { getId: () => 'photo_' + id, setTrashed: value => { file.trashed = value; } }; uploaded.push(file);
    return { file, image: { getContentUrl: () => 'https://example.test/new.jpg', getAltTextTitle: () => title, getAltTextDescription: () => id } };
  };
  context.photoFile_ = () => ({ setName() {} });
  return { api: context, sheet, props, uploaded, releases: () => releases };
}

const jpeg = { mimeType: 'image/jpeg', base64: Buffer.from([255, 216, 255, 224, 0, 0, 255, 217]).toString('base64') };
const add = (api, changes = {}) => api.saveItem({ boxId: '673832429', requestId: randomUUID(), title: 'Водні розмальовки', description: '', photo: jpeg, ...changes });

test('imports legacy rows and images without changing image cells or numbers', () => {
  const { api, sheet } = fixture(); const inventory = api.getInventory();
  assert.deepEqual(Array.from(inventory.boxes[0].items, item => item.number), [1, 5]);
  assert.match(inventory.boxes[0].items[0].id, /^[a-f0-9-]{36}$/);
  assert.equal(inventory.boxes[0].items[0].photoUrl, 'https://example.test/photo.jpg');
  assert.equal(sheet.photoWrites, 0);
  const ids = inventory.boxes[0].items.map(item => item.id).join();
  assert.equal(api.getInventory().boxes[0].items.map(item => item.id).join(), ids);
});

test('reserves numbers across deletion and retries without creating duplicate rows', () => {
  const { api } = fixture(); const requestId = randomUUID();
  add(api, { requestId }); add(api, { requestId });
  let items = api.getInventory().boxes[0].items;
  assert.equal(items.length, 3); assert.equal(items[2].number, 6);
  api.deleteItem('673832429', items[2].id, items[2].revision);
  add(api); items = api.getInventory().boxes[0].items;
  assert.equal(items[2].number, 7);
});

test('editing preserves existing cell images; stale edits and deletes are rejected', () => {
  const { api, sheet } = fixture(); const old = api.getInventory().boxes[0].items[0];
  const input = { boxId: '673832429', ...old, title: 'Нова назва', description: 'Опис' };
  api.saveItem(input);
  assert.equal(sheet.data[2][1], 'Нова назва'); assert.equal(sheet.photoWrites, 0);
  assert.throws(() => api.saveItem(input), /уже змінилася/);
  assert.throws(() => api.deleteItem('673832429', old.id, old.revision), /уже змінилася/);
});

test('edits identify the item after spreadsheet row reordering', () => {
  const { api, sheet } = fixture(); const old = api.getInventory().boxes[0].items[0];
  [sheet.data[2], sheet.data[3]] = [sheet.data[3], sheet.data[2]];
  api.saveItem({ ...old, boxId: '673832429', title: 'Знайшли правильну річ' });
  assert.equal(sheet.data[3][1], 'Знайшли правильну річ');
  assert.equal(sheet.data[2][1], 'Куб');
});

test('rejects duplicate numbers and occupied service columns before migration', () => {
  const { api, sheet } = fixture([[1, 'A', image(), ''], [1, 'B', image(), '']]);
  assert.throws(() => api.getInventory(), /Перевірте номери/);
  assert.equal(sheet.data[1][4], undefined);
  const occupied = fixture(); occupied.sheet.data[2][4] = 'User content';
  assert.throws(() => occupied.api.getInventory(), /колонки E–F зайняті/);
  assert.equal(occupied.sheet.data[2][4], 'User content');
});

test('requires a valid photo for new items and stores formula-like text literally', () => {
  const { api, sheet, uploaded, releases } = fixture();
  assert.throws(() => add(api, { photo: null }), /Додайте фотографію/);
  assert.throws(() => add(api, { photo: { mimeType: 'image/jpeg', base64: 'bm90LWltYWdl' } }), /JPEG/);
  assert.equal(uploaded.length, 0);
  add(api, { title: '=IMPORTXML("url")', description: '=1+1' });
  assert.equal(sheet.data[4][1], '=IMPORTXML("url")');
  assert.equal(api.literal_('=1+1'), "'=1+1");
  assert.ok(releases() >= 2);
});

test('Ukrainian filenames handle initial letters, apostrophes and unsafe characters', () => {
  const { api } = fixture();
  for (const [title, expected] of [
    ['Пазли мʼякі', 'pazly-miaki'], ['Водні розмальовки', 'vodni-rozmalovky'],
    ['Їжак і Ялинка', 'yizhak-i-yalynka'], ['Згода', 'zghoda'],
    ['  LEGO / Куб: 2  ', 'lego-kub-2'], ['🧸', 'item'], ['Ґудзик', 'gudzyk']
  ]) assert.equal(api.slug_(title), expected);
  assert.equal(api.filename_('Куб', 'abc'), 'kub_abc.jpg');
});

test('failed row write cleans up uploaded file and releases lock', () => {
  const { api, sheet, uploaded, releases } = fixture(); api.getInventory();
  const original = sheet.getRange.bind(sheet);
  sheet.getRange = (...args) => {
    const range = original(...args);
    if (args[0] === 5 && args[1] === 1) range.setValues = () => { throw new Error('Write failed'); };
    return range;
  };
  assert.throws(() => add(api), /Write failed/);
  assert.equal(uploaded[0].trashed, true); assert.equal(releases(), 2);
});
