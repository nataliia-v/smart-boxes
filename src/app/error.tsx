'use client';
import { useLanguage } from '@/components/language';
export default function ErrorPage({reset}:{reset:()=>void}){const {t}=useLanguage();return <main className="setup"><h1>{t('pageError')}</h1><p>{t('pageErrorHelp')}</p><button className="button primary" onClick={reset}>{t('retry')}</button></main>;}
