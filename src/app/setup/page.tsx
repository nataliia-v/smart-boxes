import Link from 'next/link';
import { Header } from '@/components/header';

export default function Setup() {
  return <><Header /><main className="setup">
    <p className="eyebrow">ПЕРШЕ ПІДКЛЮЧЕННЯ</p>
    <h1>Ще кілька кроків —<br />і все на своєму місці.</h1>
    <p>Для роботи Smart Box потрібні база даних і Google-вхід. Адміністратору сайту потрібно завершити налаштування сервісів.</p>
    <ol>
      <li><strong>PostgreSQL</strong><p>Створіть базу в Neon або запустіть локально через Docker. Застосуйте Prisma-міграції.</p></li>
      <li><strong>Google Cloud</strong><p>Увімкніть Drive API та створіть OAuth web client. Додайте callback <code>/api/auth/callback/google</code>.</p></li>
      <li><strong>Налаштування сервера</strong><p>Заповніть змінні з <code>.env.example</code>. Секрети зберігайте лише на сервері.</p></li>
      <li><strong>Vercel</strong><p>Імпортуйте репозиторій і додайте production-налаштування. Повна інструкція є в README.</p></li>
    </ol>
    <Link href="/" className="button primary">На головну</Link>
  </main></>;
}
