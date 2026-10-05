'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { translate, itemCount, localeCookie, type Locale, type MessageKey } from '@/lib/i18n';

const Context = createContext<{ locale: Locale; setLocale: (value: Locale) => void }>({ locale: 'uk', setLocale: () => {} });
export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <Context.Provider value={{ locale, setLocale }}>{children}</Context.Provider>;
}
export function useLanguage() {
  const { locale, setLocale } = useContext(Context);
  return { locale, setLocale, t: (key: MessageKey, params?: Record<string,string|number>) => translate(locale,key,params), countItems: (n:number) => itemCount(locale,n) };
}
export function LanguageSwitch() {
  const { locale, setLocale } = useLanguage();
  const router = useRouter();
  function choose(value: Locale) {
    if(value === locale)return;
    document.cookie = `${localeCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setLocale(value);
    // Refresh server-rendered text and metadata without remounting client forms.
    router.refresh();
  }
  return <div className="language-switch" role="group" aria-label={locale === 'uk' ? 'Мова інтерфейсу' : 'Interface language'}>
    <button type="button" lang="uk" aria-label="Українська" aria-pressed={locale==='uk'} onClick={()=>choose('uk')}>UA</button>
    <button type="button" lang="en" aria-label="English" aria-pressed={locale==='en'} onClick={()=>choose('en')}>EN</button>
  </div>;
}
