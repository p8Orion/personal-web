import type { CardCopy } from './types.ts'

/** 00 INTRO — español */
export const intro = {
  eyebrow: 'Inicializando...',
  title: '¡Hola! Soy Nestor',
  subtitle: '',
  text: '',
  pics: [
    {
      src: new URL('./images/1-yo.jpg', import.meta.url).href,
      fit: 'vertical',
    },
  ],
} satisfies CardCopy
