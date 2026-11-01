import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(ROOT, 'public')
const IMAGE_RE = /\.(webp|png|jpg|jpeg|gif|avif)$/i

/** 递归扫描 public/image 下的所有图片，生成静态资源清单 */
function collectImages(dir, prefix = '') {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) return collectImages(path.join(dir, entry.name), rel)
    return IMAGE_RE.test(entry.name) ? [rel] : []
  })
}

const VIRTUAL_ID = 'virtual:asset-manifest'
const RESOLVED_ID = '\0' + VIRTUAL_ID

function assetManifestPlugin() {
  return {
    name: 'asset-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      const files = collectImages(path.join(PUBLIC_DIR, 'image')).map(
        (file) => '/image/' + file.split(path.sep).join('/'),
      )
      return `export default ${JSON.stringify(files)}`
    },
  }
}

export default defineConfig({
  plugins: [vue(), assetManifestPlugin()],
  server: {
    port: 5173,
  },
})
