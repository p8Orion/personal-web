import { pic } from './pic.ts'
import type { CardCopy } from './types.ts'

/** 00 INTRO — español */
export const intro = {
  eyebrow: '00 | Inicializando...',
  title: '¡Hola! Soy Nestor',
  subtitle: '',
  text: 'Soy un profesional del software, de Argentina. Trabajo en el sector de energía y servicios públicos.',
  pics: [
    {
      src: pic('1-yo.webp'),
      fit: 'vertical',
    },
  ],
} satisfies CardCopy
