import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Inventory } from '@/components/inventory';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
export async function generateMetadata():Promise<Metadata>{return {title:translate(await getLocale(),'guestTitle'),robots:{index:false,follow:false}};}
export const dynamic='force-dynamic';
export default async function Guest({params}:{params:Promise<{token:string}>}){const {token}=await params;return <><Header/><Inventory token={token}/></>;}
