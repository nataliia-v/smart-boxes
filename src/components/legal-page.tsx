import Link from 'next/link';
import { Box } from 'lucide-react';
import type { ReactNode } from 'react';
import { LegalLinks } from './legal-links';
import { legal } from '@/lib/legal';

export function LegalPage({ title, english, children }: { title: string; english: string; children: ReactNode }) {
  return <div className="legal-shell">
    <header className="legal-header"><Link href="/" className="brand"><Box size={25} aria-hidden="true" />Smart Box</Link><Link href="/">На головну</Link></header>
    <main className="legal-content">
      <p className="eyebrow">{english}</p>
      <h1>{title}</h1>
      <p className="legal-date">Дата набрання чинності та останнього оновлення: {legal.updated}.</p>
      {children}
    </main>
    <div className="legal-bottom"><LegalLinks /><a href={`mailto:${legal.email}`}>{legal.email}</a></div>
  </div>;
}
