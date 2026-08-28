import type { CardCopy } from './types.ts'

/** 00 INTRO — english */
export const intro = {
  eyebrow: '00 | Booting up...',
  title: "Hi! I'm Nestor",
  subtitle: '',
  text: "I'm a software engineer from Argentina, working in the energy and utilities sector.",
  pics: [
    {
      src: new URL('./images/1-yo.jpg', import.meta.url).href,
      fit: 'vertical',
    },
  ],
} satisfies CardCopy
