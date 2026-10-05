import Link from 'next/link';
import { Box } from 'lucide-react';
import type { ReactNode } from 'react';
import { LegalLinks } from './legal-links';
import { legal } from '@/lib/legal';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
import { LanguageSwitch } from './language';

export async function LegalPage({ title, english, children }: { title: string; english: string; children: ReactNode }) {
  const locale=await getLocale();const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  return <div className="legal-shell">
    <header className="legal-header"><Link href="/" className="brand"><Box size={25} aria-hidden="true" />Smart Box</Link><div className="legal-header-actions"><LanguageSwitch/><Link href="/">{t('home')}</Link></div></header>
    <main className="legal-content">
      <p className="eyebrow">{english}</p>
      <h1>{title}</h1>
      <p className="legal-date">{t('legalDate')}</p>
      {children}
    </main>
    <div className="legal-bottom"><LegalLinks /><a href={`mailto:${legal.email}`}>{legal.email}</a></div>
  </div>;
}
