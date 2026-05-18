import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-handler',
    configureServer(server) {
      // Injeta TODAS as variáveis do .env no process.env para o handler ter acesso
      const env = loadEnv(server.config.mode, process.cwd(), '')
      Object.assign(process.env, env)

      server.middlewares.use('/api/ai', (req: any, res: any) => {
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', async () => {
          try {
            req.body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
            let statusCode = 200
            const wrappedRes = {
              status(code: number) { statusCode = code; return wrappedRes },
              json(data: unknown) {
                res.statusCode = statusCode
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              },
              setHeader(name: string, value: string) { res.setHeader(name, value) },
            }
            const { default: handler } = await server.ssrLoadModule('/api/ai.ts')
            await handler(req, wrappedRes)
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: { message: String(err) } }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    apiDevPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(projectRoot, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  esbuild: {
    drop: ['console', 'debugger'],
  },

  // Evita que o Vite tente detectar a raiz do workspace subindo diretÃ³rios
  // (o que pode falhar em ambientes com sandbox/permissÃµes restritas).
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
})
