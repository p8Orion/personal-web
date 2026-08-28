import { pic } from './pic.ts'
import type { CardCopy } from './types.ts'

/** 01 ABOUT — english */
export const about = {
  eyebrow: '🐈',
  title: 'My cats say hi!',
  subtitle: '',
  //text: 'Tota (the pig), Totito, Orange and Maillo',
  pics: [
    { src: pic('2-a.webp'), fit: 'horizontal' },
    { src: pic('2-b.webp'), fit: 'horizontal' },
    { src: pic('2-c.webp'), fit: 'horizontal' },
    { src: pic('2-d.webp'), fit: 'horizontal' },
  ],
} satisfies CardCopy
