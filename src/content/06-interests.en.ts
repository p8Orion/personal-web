import type { InterestsCopy } from './types.ts'

/** 06 INTERESTS — english */
export const interests = {
  eyebrow: '01 | Nerdsniping...',
  title: 'What keeps me curious',
  subtitle: '',
  text: '',
  pics: [
    { src: new URL('./images/3-a.webp', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-b.webp', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-f.png', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-d.webp', import.meta.url).href, fit: 'horizontal' },
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
