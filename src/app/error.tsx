'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="setup"><h1>Не вдалося відкрити сторінку</h1><p>Спробуйте ще раз. Якщо це перший запуск, перевірте налаштування сервісів.</p><button className="button primary" onClick={reset}>Спробувати ще раз</button></main>;}
