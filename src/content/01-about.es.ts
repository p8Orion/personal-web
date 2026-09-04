import { pic } from './pic.ts'
import type { CardCopy } from './types.ts'

/** 01 SOBRE — español */
export const about = {
  eyebrow: '🐈',
  title: '¡Mis gatos te mandan saludos!',
  subtitle: '',
  // Apagado por ahora: 'Tota (la chancha), Totito, Orange y Maillo'
  text: '',
  pics: [
    { src: pic('2-a.webp'), fit: 'horizontal' },
    { src: pic('2-b.webp'), fit: 'horizontal' },
    { src: pic('2-c.webp'), fit: 'horizontal' },
    { src: pic('2-d.webp'), fit: 'horizontal' },
  ],
} satisfies CardCopy
