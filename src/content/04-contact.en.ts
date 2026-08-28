import { pic } from './pic.ts'
import type { ContactCopy } from './types.ts'

/** 04 CONTACT — english. URLs live in identity.ts */
export const contact = {
  eyebrow: '04 | Galumphing...',
  title: "Let's get in touch!",
  subtitle: '',
  text: 'I’d love to hear about you and what you’re working on. My cats say hi!',
  pics: [
    { src: pic('2-a.webp'), fit: 'horizontal' },
    { src: pic('2-b.webp'), fit: 'horizontal' },
    { src: pic('2-c.webp'), fit: 'horizontal' },
    { src: pic('2-d.webp'), fit: 'horizontal' },
  ],
  items: [
    { icon: 'linkedin', name: 'LinkedIn', social: 'linkedin' },
    //{ icon: 'github', name: 'GitHub', social: 'github' },
    { icon: 'x', name: 'Twitter/X', social: 'twitter' },
    { icon: 'email', name: 'nechegoyen90529@gmail.com', social: 'email' },
  ],
} satisfies ContactCopy
