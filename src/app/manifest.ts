import type { MetadataRoute } from 'next';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
export const dynamic='force-dynamic';
export default async function manifest():Promise<MetadataRoute.Manifest>{const locale=await getLocale();return {name:'Smart Box',short_name:'Smart Box',description:translate(locale,'manifestDescription'),start_url:'/app/boxes',scope:'/',display:'standalone',background_color:'#f8f9f4',theme_color:'#f8f9f4',lang:locale,icons:[{src:'/icons/192',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/512',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/512',sizes:'512x512',type:'image/png',purpose:'maskable'}]};}
