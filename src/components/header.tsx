import Link from 'next/link';
import { Box, LogOut } from 'lucide-react';
import { signOut } from '@/auth';
export function Header({signedIn=false}:{signedIn?:boolean}) {
  return <header className="header"><Link href={signedIn?'/app/boxes':'/'} className="brand"><span><Box size={24} strokeWidth={1.6}/></span><div>smart<span className="brand-light">box</span><small>УСЕ НА СВОЄМУ МІСЦІ</small></div></Link><span className="header-note">Знайдеться все.</span>{signedIn?<form action={async()=>{'use server';await signOut({redirectTo:'/'});}}><button className="button"><LogOut size={16}/>Вийти</button></form>:<Link href="/app/boxes" className="button">Мої коробки</Link>}</header>;
}
