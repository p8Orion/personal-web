import { pic } from './pic.ts'
import type { ProjectsCopy } from './types.ts'

/** 02 PROYECTOS — español */
export const projects = {
  eyebrow: '02 | Descombobulando...',
  title: '',
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
      title: 'Un ajedrez bizarro con ejércitos propios y terreno variado',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'pixel-world',
      title: 'Un mundo multijugador de pixel art en la web',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'supply-chain',
      title: 'Un mundo 3D para un juego de cadenas de suministro geopolíticas',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'treasure-hunt',
      title: 'Una búsqueda del tesoro con realidad aumentada en el mundo real',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
  ],
} satisfies ProjectsCopy
