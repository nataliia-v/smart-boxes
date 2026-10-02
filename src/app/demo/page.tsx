import { Header } from '@/components/header';
import { Inventory } from '@/components/inventory';
export const metadata={title:'Демо',robots:{index:false,follow:false}};
export default function Demo(){return <><Header/><Inventory demo/></>;}
