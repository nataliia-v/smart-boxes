import { messages, translate, type Locale, type MessageKey } from './i18n';

// Stable wire codes; Ukrainian messages remain compatible with existing clients.
export const errors = {
  SIGN_IN_REQUIRED: ['Увійдіть через Google.', 'Please sign in with Google.'],
  ORIGIN_REJECTED: ['Запит з іншого сайту відхилено. Оновіть сторінку.', 'A request from another website was rejected. Refresh the page.'],
  BODY_TOO_LARGE: ['Файл або запит завеликий.', 'The file or request is too large.'],
  JSON_REQUIRED: ['Очікується JSON.', 'A JSON request is required.'],
  JSON_OBJECT_REQUIRED: ['Очікується JSON-об’єкт.', 'A JSON object is required.'],
  INVALID_REQUEST: ['Некоректний запит.', 'Invalid request.'],
  RATE_LIMIT: ['Забагато запитів. Зачекайте й спробуйте ще раз.', 'Too many requests. Please wait and try again.'],
  NOT_CONFIGURED: ['Сервіси ще не підключені. Адміністратору потрібно завершити налаштування сайту.', 'The service is not configured yet. The site administrator needs to finish setup.'],
  INVALID_FIELDS: ['Перевірте поля форми: назву, довжину тексту та версію запису.', 'Check the form fields: name, text length and record version.'],
  CONFLICT: ['Одночасна зміна. Оновіть список і повторіть запит.', 'Another change happened at the same time. Refresh and try again.'],
  OPERATION_FAILED: ['Не вдалося виконати операцію. Спробуйте ще раз.', 'Could not complete the operation. Please try again.'],
  BOX_REVOKED: ['Коробку не знайдено або доступ відкликано.', 'Box not found or access revoked.'],
  BOX_NOT_FOUND: ['Коробку не знайдено.', 'Box not found.'],
  VIEW_ONLY: ['Власник дозволив лише перегляд цієї коробки.', 'The owner allows viewing this box only.'],
  RETRY_BOX: ['Повторіть створення коробки.', 'Please try creating the box again.'],
  BOX_REFRESH: ['Коробку не знайдено. Оновіть список.', 'Box not found. Refresh the list.'],
  FORBIDDEN: ['Недоступно.', 'Access denied.'],
  ITEM_MOVED: ['Річ уже прибрана або переміщена.', 'The item has already been removed or moved.'],
  OWNER_BOX_ONLY: ['Тільки власник може керувати коробкою.', 'Only the owner can manage this box.'],
  BOX_CHANGED: ['Коробка вже змінилася. Оновіть сторінку.', 'The box has changed. Refresh the page.'],
  ITEM_PURGED: ['Річ остаточно видалена. Створіть нову річ.', 'The item was permanently deleted. Create a new item.'],
  ITEM_NOT_FOUND: ['Річ не знайдено.', 'Item not found.'],
  ALREADY_DONE: ['Цю операцію вже завершено. Оновіть список.', 'This operation was already completed. Refresh the list.'],
  ITEM_EDIT_CONFLICT: ['Річ уже змінилася. Оновіть список і відкрийте форму знову.', 'The item has changed. Refresh the list and reopen the form.'],
  PHOTO_UNAVAILABLE: ['Фотографія недоступна для цієї речі.', 'This photo is not available for this item.'],
  OWNER_PURGE_ONLY: ['Остаточно видаляти може лише власник.', 'Only the owner can permanently delete items.'],
  REMOVE_FIRST: ['Спершу перемістіть річ у «Прибрані».', 'Move the item to Removed first.'],
  ITEM_CHANGED: ['Річ уже змінилася. Оновіть список.', 'The item has changed. Refresh the list.'],
  OWNER_RESTORE_ONLY: ['Відновлювати може лише власник.', 'Only the owner can restore items.'],
  OWNER_HISTORY_ONLY: ['Історія доступна власнику.', 'Activity history is available to the owner only.'],
  PHOTO_TOO_LARGE: ['Фото має бути до 1,5 МБ після стиснення.', 'The compressed photo must be no larger than 1.5 MB.'],
  INVALID_PHOTO: ['Не вдалося прочитати зображення. Виберіть JPEG, PNG або WebP.', 'Could not read this image. Choose JPEG, PNG or WebP.'],
  PHOTO_NOT_FOUND: ['Фото не знайдено.', 'Photo not found.'],
  PHOTO_PENDING: ['Попереднє фото ще обробляється або не збереглося. Виберіть його повторно.', 'The previous photo is still processing or failed to save. Select it again.'],
  GOOGLE_RECONNECT: ['Доступ до фото тимчасово недоступний. Власнику потрібно повторно підключити Google.', 'Photos are temporarily unavailable. The owner needs to reconnect Google.'],
  GOOGLE_UNAVAILABLE: ['Google тимчасово недоступний.', 'Google is temporarily unavailable.'],
  DRIVE_FAILED: ['Google Drive не прийняв запит. Власнику потрібно перевірити підключення та вільне місце.', 'Google Drive rejected the request. The owner needs to check the connection and available space.'],
  FOLDER_DELETED: ['Папку Drive видалено. Спробуйте завантажити фото ще раз.', 'The Drive folder was deleted. Try uploading the photo again.'],
  PHOTO_DELETED: ['Фото видалено з Google Drive.', 'The photo was deleted from Google Drive.'],
  PAGE_NOT_FOUND: ['Сторінку не знайдено.', 'Page not found.'],
  PHOTO_REQUIRED: ['Очікується фото.', 'A photo upload is required.'],
  CHOOSE_PHOTO: ['Виберіть фото.', 'Choose a photo.'],
  ID_MISMATCH: ['ID речі не збігається.', 'The item ID does not match.'],
  OPERATION_NOT_FOUND: ['Операцію не знайдено.', 'Operation not found.'],
  FILE_25MB: ['Виберіть фото до 25 МБ.', 'Choose a photo up to 25 MB.'],
  BROWSER_PHOTO: ['Браузер не підтримує це фото. Виберіть JPEG/PNG або зробіть знімок.', 'Your browser cannot read this photo. Choose JPEG/PNG or take a photo.'],
  PROCESS_PHOTO: ['Не вдалося обробити фото.', 'Could not process the photo.'],
  COMPRESSED_TOO_LARGE: ['Фото завелике навіть після стиснення. Виберіть інше.', 'The photo is too large even after compression. Choose another one.'],
} as const satisfies Record<string, readonly [string,string]>;
export type ErrorCode = keyof typeof errors;
export function errorCode(message: string): ErrorCode {
  return (Object.keys(errors) as ErrorCode[]).find(key => errors[key][0] === message) ?? 'OPERATION_FAILED';
}
export function localizedError(locale: Locale, messageOrCode: string) {
  if (Object.hasOwn(errors,messageOrCode)) return errors[messageOrCode as ErrorCode][locale==='uk'?0:1];
  if (Object.hasOwn(messages,messageOrCode)) return translate(locale,messageOrCode as MessageKey);
  const code=Object.hasOwn(errors,messageOrCode)?messageOrCode as ErrorCode:errorCode(messageOrCode);
  return errors[code][locale==='uk'?0:1];
}
