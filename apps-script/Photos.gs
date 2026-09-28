function filename_(title, id) {
  return slug_(title) + '_' + id + '.jpg';
}

/** Ukrainian transliteration (word-initial є, ї, й, ю, я; зг → zgh). */
function slug_(text) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
    и: 'y', і: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: ''
  };
  const special = { є: ['ye', 'ie'], ї: ['yi', 'i'], й: ['y', 'i'], ю: ['yu', 'iu'], я: ['ya', 'ia'] };
  const source = text.toLowerCase().normalize('NFC').replace(/[’ʼ'`\u2018]/g, '').replace(/зг/g, 'zgh');
  const latin = Array.from(source).map(function (letter, i) {
    if (special[letter]) return special[letter][i === 0 || !/[a-zа-яіїєґ0-9]/i.test(source[i - 1]) ? 0 : 1];
    return Object.prototype.hasOwnProperty.call(map, letter) ? map[letter] : letter;
  }).join('');
  return latin.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || 'item';
}

function photoBlob_(photo) {
  if (!photo || photo.mimeType !== 'image/jpeg' || typeof photo.base64 !== 'string' ||
      photo.base64.length > Math.ceil(CONFIG.maxPhotoBytes / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64)) {
    throw new Error('Фото має бути JPEG до 1,5 МБ. Виберіть його повторно.');
  }
  const bytes = Utilities.base64Decode(photo.base64);
  if (bytes.length < 4 || bytes.length > CONFIG.maxPhotoBytes ||
      (bytes[0] & 255) !== 255 || (bytes[1] & 255) !== 216 || (bytes[2] & 255) !== 255) {
    throw new Error('Не вдалося прочитати JPEG-фотографію.');
  }
  return Utilities.newBlob(bytes, 'image/jpeg');
}

function upload_(blob, title, id) {
  const folder = DriveApp.getFolderById(CONFIG.photoFolderId);
  const file = folder.createFile(blob.setName(filename_(title, id)));
  try {
    // CellImageBuilder requires a fetchable URL. Share only this photo, not the folder.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const key = file.getResourceKey();
    const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200' +
      (key ? '&resourcekey=' + encodeURIComponent(key) : '');
    let ready = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200 && /^image\//i.test(response.getBlob().getContentType())) {
        ready = true;
        break;
      }
      Utilities.sleep(700 * (attempt + 1));
    }
    if (!ready) throw new Error('Google Drive ще не підготував фото. Спробуйте зберегти ще раз.');
    const image = SpreadsheetApp.newCellImage().setSourceUrl(url)
      .setAltTextTitle(title).setAltTextDescription('Smart Boxes photo ' + file.getId()).build();
    return { file: file, image: image };
  } catch (error) {
    try { file.setTrashed(true); } catch (cleanupError) { console.error(cleanupError); }
    throw error;
  }
}

function photoFile_(id) {
  if (!/^[\w-]+$/.test(String(id))) throw new Error('Некоректний ID фотографії.');
  const file = DriveApp.getFileById(id);
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === CONFIG.photoFolderId) return file;
  }
  throw new Error('Фото переміщене з папки Smart Boxes. Поверніть його або додайте нове.');
}
