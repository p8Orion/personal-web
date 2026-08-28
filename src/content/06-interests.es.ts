import type { InterestsCopy } from './types.ts'

/** 06 INTERESES — español */
export const interests = {
  eyebrow: '01 | Cortocircuitando...',
  title: '',
  subtitle: '',
  text: '',
  pics: [
    { src: new URL('./images/3-a.webp', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-b.webp', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-c.webp', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/3-d.webp', import.meta.url).href, fit: 'horizontal' },
  ],
  items: [
    { icon: '🤖', name: 'Inteligencia artificial', href: '' },
    {
      icon: '🧘',
      name: 'Filosofía de la mente y la conciencia, meditación y adyacentes',
      href: '',
    },
    { icon: '📷', name: 'Fotografía', href: 'https://www.instagram.com/p8orion_ph/' },
    { icon: '🌸', name: 'Perfumería', href: 'https://www.fragrantica.com/@p8orion' },
    { icon: '🎲', name: 'Juegos de mesa', href: '' },
    { icon: '🌱', name: 'Jardinería', href: '' },
  ],
} satisfies InterestsCopy
