import { Box } from 'lucide-react';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { configured } from '@/lib/env';
import { GoogleSignInButton } from '@/components/google-sign-in';

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
  if (configured()) {
    const session = await auth();
    if (session?.user && !error) redirect('/app/boxes');
  }
  return <main className="sign-in-page">
    <section className="sign-in-card" aria-labelledby="sign-in-title">
      <span className="sign-in-mark" aria-hidden="true"><Box size={34} strokeWidth={1.5} /></span>
      <p className="eyebrow">SMART BOX</p>
      <h1 id="sign-in-title">Усе на своєму місці.</h1>
      <p className="sign-in-intro">Увійдіть або створіть акаунт, щоб зберігати свої коробки та речі.</p>
      {error && <p className="error" role="alert">{error === 'unavailable' || error === 'Configuration'
        ? 'Вхід тимчасово недоступний. Спробуйте пізніше.'
        : 'Не вдалося увійти через Google. Спробуйте ще раз.'}</p>}
      <form action={continueWithGoogle}><GoogleSignInButton /></form>
      <p className="sign-in-note">Вперше тут? Акаунт створиться автоматично після входу через Google.</p>
    </section>
  </main>;
}
