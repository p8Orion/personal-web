/**
 * Glyphs for the stack flow. To add a tech:
 *
 * 1. If it's on simpleicons.org, import `simple-icons/icons/<slug>.svg?raw`
 *    and register it below (slug is the filename without .svg).
 * 2. If not (Microsoft marks, generic skills), drop a 24×24 path in CUSTOM.
 * 3. Add `{ icon: 'slug', name: 'Label' }` to the stack `flow` or contact `items`.
 */
import angular from 'simple-icons/icons/angular.svg?raw'
import docker from 'simple-icons/icons/docker.svg?raw'
import github from 'simple-icons/icons/github.svg?raw'
import linux from 'simple-icons/icons/linux.svg?raw'
import nodedotjs from 'simple-icons/icons/nodedotjs.svg?raw'
import spring from 'simple-icons/icons/spring.svg?raw'
import unity from 'simple-icons/icons/unity.svg?raw'
import vmware from 'simple-icons/icons/vmware.svg?raw'
import x from 'simple-icons/icons/x.svg?raw'

function pathOf(svg: string): string {
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1])
  return paths.join(' ')
}

/** Microsoft / generic marks — not on simple-icons (trademark) or not a brand. */
const CUSTOM: Record<string, string> = {
  // Cloud
  azure:
    'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14a6 6 0 0 0 6 6h13a5 5 0 0 0 5-5c0-2.64-2.05-4.78-4.65-4.96z',
  // Cylinder stack
  sqlserver:
    'M12 2C7.58 2 4 3.34 4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5c0-1.66-3.58-3-8-3zm0 1.7c3.87 0 6.3.95 6.3 1.55S15.87 6.8 12 6.8 5.7 5.85 5.7 5.25 8.13 3.7 12 3.7zM5.7 8.4c1.55.72 3.85 1.15 6.3 1.15s4.75-.43 6.3-1.15v2.7c-1.55.72-3.85 1.15-6.3 1.15s-4.75-.43-6.3-1.15V8.4zm0 5.35c1.55.72 3.85 1.15 6.3 1.15s4.75-.43 6.3-1.15v2.7c-1.55.72-3.85 1.15-6.3 1.15s-4.75-.43-6.3-1.15v-2.7z',
  // BI bars
  powerbi: 'M3.2 20.5V10h4.1v10.5H3.2zm6.75 0V3.5h4.1v17H9.95zm6.75 0v-7h4.1v7h-4.1z',
  // Card
  payments:
    'M3.2 6.2A1.8 1.8 0 0 1 5 4.4h14a1.8 1.8 0 0 1 1.8 1.8v10.6a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8V6.2zm1.7 1.3v2.4h14.2V7.5H4.9z',
  // Spark
  ai: 'M12 2.1 13.2 9 20.5 10.5 13.2 12 12 21.9 10.8 12 3.5 10.5 10.8 9 12 2.1z',
  // LinkedIn "in" — not on simple-icons (trademark)
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  // Envelope
  email:
    'M3 5.6A1.6 1.6 0 0 1 4.6 4h14.8A1.6 1.6 0 0 1 21 5.6v12.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 18.4V5.6zm1.85.9 7.15 4.85L19.15 6.5H4.85zm14.3 1.55-6.95 4.72a1.15 1.15 0 0 1-1.3 0L4.85 8.05V18.2h14.3V8.05z',
}

export const ICONS: Record<string, string> = {
  spring: pathOf(spring),
  angular: pathOf(angular),
  node: pathOf(nodedotjs),
  sqlserver: CUSTOM.sqlserver,
  payments: CUSTOM.payments,
  unity: pathOf(unity),
  ai: CUSTOM.ai,
  docker: pathOf(docker),
  linux: pathOf(linux),
  azure: CUSTOM.azure,
  powerbi: CUSTOM.powerbi,
  vmware: pathOf(vmware),
  github: pathOf(github),
  linkedin: CUSTOM.linkedin,
  x: pathOf(x),
  email: CUSTOM.email,
}
