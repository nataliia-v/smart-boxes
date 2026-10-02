import Link from 'next/link';
import { Box, QrCode, ScanLine, ArrowUpRight } from 'lucide-react';
import { signIn } from '@/auth';
import { configured } from '@/lib/env';
import { Header } from '@/components/header';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ready = configured();
  const { error } = await searchParams;
  return <><Header /><main className="landing">
    <p className="eyebrow">ТРОХИ ПОРЯДКУ. БІЛЬШЕ СПОКОЮ.</p>
    <h1>Ви знаєте, що це є.<br /><span>Тепер знаєте — де.</span></h1>
    <p className="landing-copy">Улюблені іграшки, зимові речі, маленькі скарби.<br />Дайте коробкам назви, додайте речі та наклейте QR.<br />Усе потрібне знайдеться за один скан.</p>
    {error && <p className="error" role="alert">Не вдалося завершити Google-вхід. Спробуйте ще раз і підтвердьте потрібні дозволи. Якщо помилка повторюється, перевірте OAuth-налаштування проєкту.</p>}
    <div className="landing-actions">
      {ready ? <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/app/boxes' }); }}>
        <button className="button primary large">Продовжити з Google <ArrowUpRight size={19} /></button>
      </form> : <Link href="/setup" className="button primary large">Налаштувати підключення <ArrowUpRight size={19} /></Link>}
    </div>
    {!ready && <p className="help">Для початку роботи потрібно підключити Google та базу даних.</p>}
    <div className="steps">
      {[
        { Icon: Box, title: 'Створіть коробку', text: 'Назва — і місце для речей готове.' },
        { Icon: QrCode, title: 'Додайте QR', text: 'Роздрукуйте та приклейте на коробку.' },
        { Icon: ScanLine, title: 'Знайдіть потрібне', text: 'Скануйте без реєстрації й установлення.' },
      ].map(({ Icon, title, text }) => <article key={title}>
        <Icon size={31} strokeWidth={1.3} /><h2>{title}</h2><p>{text}</p>
      </article>)}
    </div>
    <p className="privacy-note">Ваші фото — у вашому Google Drive. Ви обираєте, хто може змінювати вміст коробки.</p>
  </main></>;
}
