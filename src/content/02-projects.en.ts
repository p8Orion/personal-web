import type { ProjectsCopy } from './types.ts'

/** 02 PROJECTS — english */
export const projects = {
  eyebrow: '02 | Discombobulating...',
  title: 'What I’ve tinkered with',
  subtitle: '',
  text: '',
  pics: [
    { src: new URL('./images/4-a.jpg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/4-b.png', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/4-c.jpeg', import.meta.url).href, fit: 'horizontal' },
    { src: new URL('./images/4-d.png', import.meta.url).href, fit: 'horizontal' },
  ],
  items: [
    {
      id: 'chess',
      title: '> A bizarre chess game with custom armies, terrain and victory conditions',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'pixel-world',
      title: '> A multiplayer pixel-art world over the web, with time passage and seasons',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'supply-chain',
      title: '> A 3D world for a geopolitical game, with supply and production chains',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
    {
      id: 'treasure-hunt',
      title: '> A real-world augmented reality treasure hunt for a tourist attraction',
      summary: '',
      tags: [],
      href: '',
      year: '',
    },
  ],
} satisfies ProjectsCopy
