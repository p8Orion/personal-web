import { pic } from './pic.ts'
import type { CardCopy } from './types.ts'

/** 00 INTRO — español */
export const intro = {
  eyebrow: 'Inicializando...',
  title: '¡Hola! Soy Nestor',
  subtitle: '',
  text: '',
  pics: [
    {
      src: pic('1-yo.webp'),
      fit: 'vertical',
    },
  ],
} satisfies CardCopy
