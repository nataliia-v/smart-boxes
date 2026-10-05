import { Box } from 'lucide-react';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { configured } from '@/lib/env';
import { GoogleSignInButton } from '@/components/google-sign-in';
import Link from 'next/link';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
import { LanguageSwitch } from '@/components/language';

export const dynamic = 'force-dynamic';

async function continueWithGoogle() {
  'use server';
  if (!configured()) redirect('/?error=unavailable');
  try {
    await signIn('google', { redirectTo: '/app/boxes' });
  } catch (error) {
    if (error instanceof AuthError) redirect('/?error=signin');
    throw error; // Preserve the successful OAuth redirect.
  }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  if (configured()) {
    const session = await auth();
    if (session?.user && !error) redirect('/app/boxes');
  }
  return <main className="sign-in-page">
    <section className="sign-in-card" aria-labelledby="sign-in-title">
      <div className="sign-in-language"><LanguageSwitch /></div>
      <span className="sign-in-mark" aria-hidden="true"><Box size={34} strokeWidth={1.5} /></span>
      <p className="eyebrow">SMART BOX</p>
      <h1 id="sign-in-title">{t('tagline')}</h1>
      <p className="sign-in-intro">{t('signInIntro')}</p>
      {error && <p className="error" role="alert">{error === 'unavailable' || error === 'Configuration'
        ? t('signInUnavailable')
        : t('signInFailed')}</p>}
      <form action={continueWithGoogle}><GoogleSignInButton /></form>
      <p className="sign-in-note">{t('signInNote')}</p>
      <p className="sign-in-legal">{t('acceptTerms')} <Link href="/terms">{t('terms')}</Link>. {t('privacyIntro')} <Link href="/privacy">{t('privacyLink')}</Link>.</p>
    </section>
  </main>;
}
