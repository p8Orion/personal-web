import { pic } from './pic.ts'
import type { CardCopy } from './types.ts'

/** 00 INTRO — english */
export const intro = {
  eyebrow: '00 | Booting up...',
  title: "Hey there! I'm Nestor",
  subtitle: '',
  text: "I'm a software engineer from Argentina, working in the energy and utilities sector.",
  pics: [
    {
      src: pic('1-yo.webp'),
      fit: 'vertical',
    },
  ],
} satisfies CardCopy
