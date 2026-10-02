export async function compressPhoto(file: File): Promise<Blob> {
  if (file.size > 25*1024*1024) throw new Error('Виберіть фото до 25 МБ.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('Браузер не підтримує це фото. Виберіть JPEG/PNG або зробіть знімок.'); }
    const scale = Math.min(1, 1200/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth*scale); canvas.height = Math.round(image.naturalHeight*scale);
    const ctx = canvas.getContext('2d')!; ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for (const quality of [.85,.7,.55]) {
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Не вдалося обробити фото.')), 'image/jpeg',quality));
      if (blob.size <= 1500000) return blob;
    }
    throw new Error('Фото завелике навіть після стиснення. Виберіть інше.');
  } finally { URL.revokeObjectURL(url); }
}
