import { pic } from './pic.ts'
import type { ContactCopy } from './types.ts'

/** 04 CONTACTO — español. URLs en identity.ts */
export const contact = {
  eyebrow: '04 | Desambiguando...',
  title: '¡Hablemos!',
  subtitle: '',
  text: 'Me encantaría saber de vos y de lo que estés haciendo. ¡Mis gatos te mandan saludos!',
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
