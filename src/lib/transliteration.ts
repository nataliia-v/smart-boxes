export function slug(text: string) {
  const map: Record<string, string> = { а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',ж:'zh',з:'z',и:'y',і:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'' };
  const special: Record<string, string[]> = { є:['ye','ie'],ї:['yi','i'],й:['y','i'],ю:['yu','iu'],я:['ya','ia'] };
  const source = text.toLowerCase().normalize('NFC').replace(/[’ʼ'`‘]/g, '').replace(/зг/g, 'zgh');
  return Array.from(source).map((c,i) => special[c]?.[i === 0 || !/[a-zа-яіїєґ0-9]/i.test(source[i-1]) ? 0 : 1] ?? map[c] ?? c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'') || 'item';
}
