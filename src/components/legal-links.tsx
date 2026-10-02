import Link from 'next/link';

export function LegalLinks() {
  return <nav className="legal-links" aria-label="Правова інформація">
    <Link href="/privacy">Політика конфіденційності</Link>
    <Link href="/terms">Умови користування</Link>
  </nav>;
}
