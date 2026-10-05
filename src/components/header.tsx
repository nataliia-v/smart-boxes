import Link from 'next/link';
import { Box, LogOut } from 'lucide-react';
import { signOut } from '@/auth';
import { LanguageSwitch } from './language';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
export async function Header({signedIn=false}:{signedIn?:boolean}) {
  const locale=await getLocale();const t=(key:Parameters<typeof translate>[1])=>translate(locale,key);
  return <header className="header"><Link href={signedIn?'/app/boxes':'/'} className="brand"><span><Box size={24} strokeWidth={1.6}/></span><div>smart<span className="brand-light">box</span><small>{t('brandTagline')}</small></div></Link><span className="header-note">{t('headerNote')}</span><div className="header-actions">{signedIn&&<LanguageSwitch/>}{signedIn?<form action={async()=>{'use server';await signOut({redirectTo:'/'});}}><button className="button"><LogOut size={16}/>{t('signOut')}</button></form>:<Link href="/app/boxes" className="button">{t('myBoxes')}</Link>}</div></header>;
}
