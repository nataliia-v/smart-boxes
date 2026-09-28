function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Smart Boxes — усе на своєму місці')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** Run manually in the Apps Script editor once to authorize and check configuration. */
function setup_() {
  const book = book_();
  const folder = DriveApp.getFolderById(CONFIG.photoFolderId);
  console.log('Таблиця: ' + book.getName() + '; папка: ' + folder.getName());
  console.log('Коробок: ' + getInventory().boxes.length);
}

function book_() {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function locked_(work) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Зараз зберігаються інші зміни. Спробуйте ще раз.');
  try {
    return work();
  } finally {
    try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  }
}

function getInventory() {
  return locked_(function () {
    const boxes = [];
    const skipped = [];
    book_().getSheets().forEach(function (sheet) {
      if (!isBox_(sheet)) { skipped.push(sheet.getName()); return; }
      prepare_(sheet);
      boxes.push({
        id: String(sheet.getSheetId()),
        name: sheet.getName(),
        items: rows_(sheet).map(function (row) { return item_(row); })
      });
    });
    return { boxes: boxes, skipped: skipped, appUrl: ScriptApp.getService().getUrl() || '' };
  });
}

function createBox(name) {
  name = text_(name, 100, 'Назва коробки', true);
  if (/[:\\/?*\[\]]/.test(name)) throw new Error('Назва коробки не може містити : \\ / ? * [ ].');
  return locked_(function () {
    const book = book_();
    const exists = book.getSheets().some(function (s) {
      return s.getName().toLocaleLowerCase() === name.toLocaleLowerCase();
    });
    if (exists) throw new Error('Коробка з такою назвою вже існує.');
    const sheet = book.insertSheet(name);
    try {
      sheet.getRange('A1:D1').merge().setValue(literal_(name))
        .setBackground('#eaf1e7').setFontWeight('bold').setFontSize(18);
      sheet.getRange(2, 1, 1, 6).setValues([['№', 'Title', 'Photo', 'Description', CONFIG.idHeader, CONFIG.fileHeader]])
        .setBackground('#f0f4ed').setFontWeight('bold');
      sheet.setFrozenRows(2);
      sheet.setColumnWidth(1, 65);
      sheet.setColumnWidth(2, 300);
      sheet.setColumnWidth(3, 180);
      sheet.setColumnWidth(4, 300);
      sheet.hideColumns(5, 2);
      return { id: String(sheet.getSheetId()) };
    } catch (error) {
      book.deleteSheet(sheet);
      throw error;
    }
  });
}

/** id + revision for edits; requestId for idempotent creates. */
function saveItem(input) {
  if (!input || typeof input !== 'object') throw new Error('Некоректні дані речі.');
  const title = text_(input.title, 200, 'Назва речі', true);
  const description = text_(input.description, 3000, 'Опис', false);
  const id = uuid_(input.id || input.requestId);
  const photoBlob = input.photo ? photoBlob_(input.photo) : null;
  return locked_(function () {
    const sheet = sheet_(input.boxId);
    prepare_(sheet);
    const rows = rows_(sheet);
    const existing = rows.find(function (row) { return row.values[4] === id; });
    if (!input.id && existing) return { id: id, boxId: String(sheet.getSheetId()) };
    if (input.id && !existing) throw new Error('Цю річ уже видалено. Оновіть список.');
    if (existing && input.revision !== revision_(existing)) {
      throw new Error('Річ уже змінилася. Закрийте форму, оновіть список і відкрийте її знову.');
    }
    if (!photoBlob && (!existing || !hasPhoto_(existing.values[2], existing.formula))) {
      throw new Error('Додайте фотографію речі.');
    }
    const number = existing ? existing.values[0] : nextNumber_(sheet, rows);
    const rowIndex = existing ? existing.index : Math.max(CONFIG.firstDataRow, sheet.getLastRow() + 1);
    if (rowIndex > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
    let file = null;
    let written = false;
    try {
      let photo = existing ? (existing.formula || existing.values[2]) : '';
      let fileId = existing ? existing.values[5] : '';
      if (photoBlob) {
        const uploaded = upload_(photoBlob, title, id);
        file = uploaded.file;
        fileId = file.getId();
        photo = uploaded.image;
      } else if (fileId) {
        // Never let a manually edited hidden cell grant access to files outside our folder.
        photoFile_(fileId).setName(filename_(title, id));
      }
      if (existing && !photoBlob) {
        // Keep imported cell images untouched when only text changes.
        sheet.getRange(rowIndex, 2).setValue(literal_(title));
        sheet.getRange(rowIndex, 4).setValue(literal_(description));
      } else {
        sheet.getRange(rowIndex, 1, 1, 6).setValues([[
          number, literal_(title), photo, literal_(description), id, fileId
        ]]);
      }
      SpreadsheetApp.flush();
      written = true;
      sheet.setRowHeight(rowIndex, 150);
      return { id: id, boxId: String(sheet.getSheetId()) };
    } catch (error) {
      if (file && !written) {
        try { file.setTrashed(true); } catch (cleanupError) { console.error(cleanupError); }
      }
      throw error;
    }
  });
}

function deleteItem(boxId, id, revision) {
  id = uuid_(id);
  return locked_(function () {
    const sheet = sheet_(boxId);
    prepare_(sheet); // Persist the high-water mark before deleting the highest number.
    const row = rows_(sheet).find(function (entry) { return entry.values[4] === id; });
    if (!row) return { deleted: true };
    if (revision_(row) !== revision) throw new Error('Річ уже змінилася. Оновіть список перед видаленням.');
    sheet.deleteRow(row.index);
    // Retain originals in Drive so deleting an item does not destroy its photo.
    return { deleted: true };
  });
}

function getItemPhoto(boxId, id) {
  id = uuid_(id);
  const row = rows_(sheet_(boxId)).find(function (entry) { return entry.values[4] === id; });
  if (!row) throw new Error('Річ не знайдено.');
  return photoUrl_(row.values[2], row.formula);
}

function sheet_(id) {
  if (!/^\d+$/.test(String(id))) throw new Error('Некоректний ID коробки.');
  const sheet = book_().getSheets().find(function (s) { return String(s.getSheetId()) === String(id); });
  if (!sheet || !isBox_(sheet)) throw new Error('Коробку не знайдено або її колонки мають іншу структуру.');
  return sheet;
}

function isBox_(sheet) {
  if (sheet.getMaxRows() < 2 || sheet.getMaxColumns() < 4) return false;
  const h = sheet.getRange(2, 1, 1, 4).getDisplayValues()[0].map(function (v) { return v.trim().toLowerCase(); });
  return ['№', 'номер', 'number'].includes(h[0]) && ['title', 'назва'].includes(h[1]) &&
    ['photo', 'фото'].includes(h[2]) && ['', 'description', 'опис'].includes(h[3]);
}

function prepare_(sheet) {
  if (sheet.getMaxColumns() < 6) sheet.insertColumnsAfter(sheet.getMaxColumns(), 6 - sheet.getMaxColumns());
  const headers = sheet.getRange(2, 5, 1, 2).getValues()[0];
  const expected = [CONFIG.idHeader, CONFIG.fileHeader];
  headers.forEach(function (header, i) {
    if (header !== expected[i]) {
      const column = sheet.getRange(1, i + 5, Math.max(2, sheet.getLastRow()), 1).getValues();
      if (column.some(function (r) { return r[0] !== ''; })) {
        throw new Error('У вкладці «' + sheet.getName() + '» колонки E–F зайняті. Для службових ID потрібні дві вільні колонки.');
      }
    }
  });
  // Validate before making any migration changes.
  const rows = rows_(sheet);
  const numbers = new Set();
  const ids = new Set();
  rows.forEach(function (row) {
    const n = Number(row.values[0]);
    if (!Number.isSafeInteger(n) || n < 1 || numbers.has(n)) {
      throw new Error('Перевірте номери у вкладці «' + sheet.getName() + '»: рядок ' + row.index + '. Потрібні унікальні додатні цілі числа.');
    }
    numbers.add(n);
    if (row.values[4]) {
      uuid_(row.values[4]);
      if (ids.has(row.values[4])) throw new Error('Повторений службовий ID у вкладці «' + sheet.getName() + '».');
      ids.add(row.values[4]);
    }
  });
  sheet.getRange(2, 5, 1, 2).setValues([expected]);
  if (!sheet.getRange(2, 4).getValue()) sheet.getRange(2, 4).setValue('Description');
  rows.forEach(function (row) {
    if (!row.values[4]) sheet.getRange(row.index, 5).setValue(Utilities.getUuid());
  });
  sheet.hideColumns(5, 2);
  rememberMax_(sheet, rows);
}

function rows_(sheet) {
  const count = sheet.getLastRow() - CONFIG.firstDataRow + 1;
  if (count <= 0) return [];
  const range = sheet.getRange(CONFIG.firstDataRow, 1, count, 6);
  const formulas = range.getFormulas();
  return range.getValues().map(function (values, i) {
    return { values: values, index: i + CONFIG.firstDataRow, formula: formulas[i][2] };
  }).filter(function (row) { return row.values.slice(0, 4).some(function (v) { return v !== ''; }); });
}

function counterKey_(sheet) { return CONFIG.spreadsheetId + ':' + sheet.getSheetId() + ':max'; }

function rememberMax_(sheet, rows) {
  const properties = PropertiesService.getScriptProperties();
  const max = rows.reduce(function (n, row) { return Math.max(n, Number(row.values[0]) || 0); }, 0);
  const stored = Number(properties.getProperty(counterKey_(sheet)) || 0);
  const high = Math.max(max, stored);
  if (!Number.isSafeInteger(high)) throw new Error('Некоректний лічильник номерів.');
  if (high !== stored) properties.setProperty(counterKey_(sheet), String(high));
  return high;
}

function nextNumber_(sheet, rows) {
  const next = rememberMax_(sheet, rows) + 1;
  if (!Number.isSafeInteger(next)) throw new Error('Ліміт номерів вичерпано.');
  PropertiesService.getScriptProperties().setProperty(counterKey_(sheet), String(next));
  return next;
}

function item_(row) {
  let photoUrl = '';
  try { photoUrl = photoUrl_(row.values[2], row.formula); } catch (error) { console.error(error); }
  return {
    id: row.values[4], number: Number(row.values[0]), title: String(row.values[1]),
    description: String(row.values[3]), photoUrl: photoUrl,
    hasPhoto: hasPhoto_(row.values[2], row.formula), revision: revision_(row)
  };
}

function revision_(row) {
  const v = row.values;
  const photo = v[2] && typeof v[2].getContentUrl === 'function'
    ? [v[2].getAltTextTitle(), v[2].getAltTextDescription()] : String(v[2]);
  const data = JSON.stringify([v[0], v[1], photo, v[3], v[4], v[5], row.formula]);
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data));
}

function hasPhoto_(value, formula) {
  return Boolean(formula || (value && typeof value.getContentUrl === 'function') || /^https:\/\//i.test(String(value)));
}

function photoUrl_(value, formula) {
  if (value && typeof value.getContentUrl === 'function') return value.getContentUrl();
  const match = formula && formula.match(/^=IMAGE\(\s*"(https:\/\/[^"\s]+)"/i);
  const url = match ? match[1] : String(value || '');
  return /^https:\/\//i.test(url) ? url : '';
}

function text_(value, max, label, required) {
  if (value == null) value = '';
  if (typeof value !== 'string') throw new Error(label + ': очікується текст.');
  value = value.trim();
  if ((required && !value) || value.length > max) throw new Error(label + ': введіть ' + (required ? '1–' : 'до ') + max + ' символів.');
  return value;
}

function uuid_(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)) {
    throw new Error('Некоректний ID речі. Оновіть сторінку.');
  }
  return value;
}

function literal_(text) {
  return /^[=+\-@']/.test(text) ? "'" + text : text;
}
