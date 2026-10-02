import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { configured, env } from '@/lib/env';
import { Header } from '@/components/header';
import { Inventory } from '@/components/inventory';
export const dynamic='force-dynamic';
export default async function Boxes(){if(!configured())redirect('/?error=unavailable');const session=await auth();if(!session?.user)redirect('/');return <><Header signedIn/><Inventory appUrl={env().APP_URL}/></>;}
