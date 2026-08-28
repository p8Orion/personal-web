import type { CardCopy } from './types.ts'

/** 01 SOBRE — español */
export const about = {
  eyebrow: '01 | Descombobulando...',
  title: '',
  subtitle: '',
  text: '',
  pics: [
    { src: new URL('./images/2-a.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-b.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-c.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-d.jpg', import.meta.url).href, fit: 'horizontal' },
  ],
} satisfies CardCopy
