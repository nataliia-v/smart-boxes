import { redirect } from 'next/navigation';

// Keep old bookmarks working; infrastructure instructions live in README.
export default function Setup() {
  redirect('/');
}
