import { pic } from './pic.ts'
import type { InterestsCopy } from './types.ts'

/** 06 INTERESES — español */
export const interests = {
  eyebrow: '01 | Cortocircuitando...',
  title: 'Lo que me da curiosidad',
  subtitle: '',
  text: '',
  pics: [
    { src: pic('3-a.webp'), fit: 'horizontal' },
    { src: pic('3-b.webp'), fit: 'horizontal' },
    { src: pic('3-c.webp'), fit: 'horizontal' },
    { src: pic('3-d.webp'), fit: 'horizontal' },
  ],
  items: [
    { icon: '🤖', name: 'Inteligencia artificial', href: '' },
    {
      icon: '🌀',
      name: 'Filosofía de la mente y la conciencia, meditación y adyacentes',
      href: '',
    },
    { icon: '📷', name: 'Fotografía', href: 'https://www.instagram.com/p8orion_ph/' },
    { icon: '🌸', name: 'Perfumería', href: 'https://www.fragrantica.com/@p8orion' },
    { icon: '🎲', name: 'Juegos de mesa', href: '' },
    { icon: '🌱', name: 'Jardinería', href: '' },
  ],
} satisfies InterestsCopy
