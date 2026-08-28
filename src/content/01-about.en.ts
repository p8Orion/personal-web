import type { CardCopy } from './types.ts'

/** 01 ABOUT — english */
export const about = {
  eyebrow: '🐈',
  title: 'My cats say hi!',
  subtitle: '',
  //text: 'Tota (the pig), Totito, Orange and Maillo',
  pics: [
    { src: new URL('./images/2-a.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-b.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-c.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-d.jpg', import.meta.url).href, fit: 'horizontal' },
  ],
} satisfies CardCopy
