import type { StackCopy } from './types.ts'

/** 03 STACK — english */
export const stack = {
  eyebrow: '03 | Kerfuffling...',
  title: 'My toolbox',
  subtitle: '',
  text: '',
  pics: [],
  flow: [
    { icon: 'spring', name: 'Spring' },
    { icon: 'angular', name: 'Angular' },
    { icon: 'node', name: 'Node.js' },
    { icon: 'payments', name: 'Payment integrations' },
    { icon: 'ai', name: 'AI / LLMs' },
    { icon: 'linux', name: 'Linux' },
    { icon: 'docker', name: 'Docker' },
    { icon: 'vmware', name: 'VMware vSphere / ESXi' },
    { icon: 'azure', name: 'Azure Cloud' },
    { icon: 'sqlserver', name: 'SQL Server' },
    { icon: 'powerbi', name: 'Power BI' },
    { icon: 'unity', name: 'Unity engine' },
  ],
} satisfies StackCopy
