import { cpSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

function copyContentImages(): Plugin {
  const from = resolve(root, 'src/content/images')
  const copyWebp = (dir: string) => {
    mkdirSync(dir, { recursive: true })
    for (const name of readdirSync(from)) {
      if (!name.endsWith('.webp')) continue
      cpSync(join(from, name), join(dir, name))
    }
  }
  return {
    name: 'copy-content-images',
    configResolved() {
      copyWebp(resolve(root, 'public/images'))
    },
    closeBundle() {
      copyWebp(resolve(root, 'dist/images'))
    },
  }
}

function injectAgentMessage(): Plugin {
  return {
    name: 'inject-agent-message',
    transformIndexHtml(html) {
      const message = readFileSync(resolve(root, 'src/content/message.md'), 'utf8').trim()
      return html.replace('<!-- agent-message -->', `<!--\n${message}\n-->`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), copyContentImages(), injectAgentMessage()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
