import type { Metadata, Viewport } from 'next';
import './globals.css';
import './card-refinements.css';
import './sign-in.css';
import './legal.css';
export const metadata:Metadata={title:{default:'Smart Box — усе на своєму місці',template:'%s · Smart Box'},description:'Домашні речі, коробки та QR. Знаходьте потрібне без зайвих пошуків.',applicationName:'Smart Box',verification:{google:'bgxd0uuHlCBXD4d834n0E0v-Iszi4y8iDw0Gj2lZQLg'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Smart Box'},icons:{icon:'/icon.svg',apple:'/icons/180'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f8f9f4'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="uk"><body>{children}</body></html>;}
