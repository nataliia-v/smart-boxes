import Link from 'next/link';
import { getLocale } from '@/server/locale';
import { translate } from '@/lib/i18n';
export default async function NotFound(){const locale=await getLocale();return <main className="setup"><h1>{translate(locale,'notFound')}</h1><p>{translate(locale,'notFoundHelp')}</p><Link className="button primary" href="/">{translate(locale,'home')}</Link></main>;}
