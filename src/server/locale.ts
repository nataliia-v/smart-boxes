import { cookies, headers } from 'next/headers';
import { localeCookie, resolveLocale } from '@/lib/i18n';
export async function getLocale() {
  return resolveLocale((await cookies()).get(localeCookie)?.value, (await headers()).get('accept-language') || '');
}
