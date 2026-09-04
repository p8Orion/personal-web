import { pic } from './pic.ts'
import type { ProjectsCopy } from './types.ts'

/** 02 PROYECTOS — español */
export const projects = {
  eyebrow: '02 | Descombobulando...',
  title: 'Mis experimentos',
  subtitle: '',
  text: '',
  pics: [
    { src: pic('4-a.webp'), fit: 'horizontal' },
    { src: pic('4-b.webp'), fit: 'horizontal' },
    { src: pic('4-c.webp'), fit: 'horizontal' },
    { src: pic('4-d.webp'), fit: 'horizontal' },
  ],
  items: [
    {
      id: 'chess',
      title: '> Un ajedrez con ejércitos personalizados, terreno y condiciones de victoria',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'pixel-world',
      title: '> Un mundo multijugador de pixel art en la web, con paso del tiempo',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'supply-chain',
      title: '> Un mundo 3D para un juego geopolítico, con cadenas de suministro',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'dip',
      title: '> Un mod de JDip (Diplomacy) donde juegan LLMs con distintas personalidades',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'treasure-hunt',
      title:
        '> Una búsqueda del tesoro con realidad aumentada, para una atracción turística',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
  ],
} satisfies ProjectsCopy
