import type { Metadata, Viewport } from 'next';
import './globals.css';
import './card-refinements.css';
import './sign-in.css';
import './legal.css';
import './language.css';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
import { LanguageProvider } from '@/components/language';
export async function generateMetadata():Promise<Metadata>{const locale=await getLocale();return {title:{default:`Smart Box — ${translate(locale,'tagline')}`,template:'%s · Smart Box'},description:translate(locale,'metaDescription'),applicationName:'Smart Box',verification:{google:'bgxd0uuHlCBXD4d834n0E0v-Iszi4y8iDw0Gj2lZQLg'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Smart Box'},icons:{icon:'/icon.svg',apple:'/icons/180'}};}
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f8f9f4'};
export default async function Layout({children}:{children:React.ReactNode}){const locale=await getLocale();return <html lang={locale}><body><LanguageProvider initialLocale={locale}>{children}</LanguageProvider></body></html>;}
