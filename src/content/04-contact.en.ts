import type { ContactCopy } from './types.ts'

/** 04 CONTACT — english. URLs live in identity.ts */
export const contact = {
  eyebrow: '04 | Galumphing...',
  title: "Let's get in touch!",
  subtitle: '',
  text: 'My cats say hi!',
  pics: [
    { src: new URL('./images/2-a.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-b.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-c.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/2-d.jpg', import.meta.url).href, fit: 'horizontal' },
  ],
  items: [
    { icon: 'linkedin', name: 'LinkedIn', social: 'linkedin' },
    //{ icon: 'github', name: 'GitHub', social: 'github' },
    { icon: 'x', name: 'Twitter/X', social: 'twitter' },
    { icon: 'email', name: 'nechegoyen90529@gmail.com', social: 'email' },
  ],
} satisfies ContactCopy
