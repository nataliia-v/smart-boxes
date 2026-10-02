import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Inventory } from '@/components/inventory';
export const metadata:Metadata={title:'Вміст коробки',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Guest({params}:{params:Promise<{token:string}>}){const {token}=await params;return <><Header/><Inventory token={token}/></>;}
