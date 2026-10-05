'use client';
import Link from 'next/link';
import { useLanguage } from './language';

export function LegalLinks() {
  const { t }=useLanguage();
  return <nav className="legal-links" aria-label={t('legalNav')}>
    <Link href="/privacy">{t('privacy')}</Link>
    <Link href="/terms">{t('terms')}</Link>
  </nav>;
}
