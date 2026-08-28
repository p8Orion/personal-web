import { pic } from './pic.ts'
import type { InterestsCopy } from './types.ts'

/** 06 INTERESTS — english */
export const interests = {
  eyebrow: '01 | Nerdsniping...',
  title: 'What keeps me curious',
  subtitle: '',
  text: '',
  pics: [
    { src: pic('3-a.webp'), fit: 'horizontal' },
    { src: pic('3-b.webp'), fit: 'horizontal' },
    { src: pic('3-f.webp'), fit: 'horizontal' },
    { src: pic('3-d.webp'), fit: 'horizontal' },
  ],
  items: [
    { icon: '🤖', name: 'Artificial intelligence', href: '' },
    { icon: '🌀', name: 'Philosophy of mind, meditation and adjacent topics', href: '' },
    { icon: '📷', name: 'Photography', href: 'https://www.instagram.com/p8orion_ph/' },
    { icon: '🌸', name: 'Perfumery', href: 'https://www.fragrantica.com/@p8orion' },
    { icon: '🎲', name: 'Board games', href: '' },
    { icon: '🌱', name: 'Gardening', href: '' },
  ],
} satisfies InterestsCopy
