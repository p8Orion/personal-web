import { pic } from './pic.ts'
import type { ProjectsCopy } from './types.ts'

/** 02 PROJECTS — english */
export const projects = {
  eyebrow: '02 | Discombobulating...',
  title: 'My experiments',
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
      id: 'dip',
      title: '> A JDip mod where LLMs with different personalities play Diplomacy',
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
