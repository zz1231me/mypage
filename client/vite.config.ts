import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            mode === 'production' && ['babel-plugin-transform-remove-console']
          ].filter(Boolean)
        }
      })
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      },
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: mode === 'production' 
          ? '[hash:base64:8]'
          : '[name]__[local]__[hash:base64:5]'
      }
      // ✅ PostCSS는 postcss.config.js에서 자동 로드됨 (Tailwind, Autoprefixer)
    },
    
    assetsInclude: ['**/*.svg'],
    
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@fullcalendar/core',
        '@fullcalendar/react',
        '@fullcalendar/daygrid',
        '@fullcalendar/timegrid',
        '@fullcalendar/interaction',
        '@fullcalendar/list',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-popover',
        '@floating-ui/dom',
        '@floating-ui/react',
        'lucide-react',
        'axios',
        'zustand',
        'lodash.throttle',
        'color-name',
        'color-parse',
        'color-convert',
        'fuzzysort'
      ],
      exclude: ['ckeditor5', '@ckeditor/ckeditor5-react'],
      force: false,
      esbuildOptions: {
        target: 'es2022',
        supported: {
          'top-level-await': true
        }
      }
    },
    
    server: {
      host: '127.0.0.1',
      port: 8080,
      strictPort: true,
      hmr: {
        overlay: true,
        clientPort: 8080
      },
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**']
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('❌ 프록시 에러:', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (mode === 'development') {
                console.log('📤 프록시 요청:', req.method, req.url)
              }
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              if (mode === 'development') {
                console.log('📥 프록시 응답:', proxyRes.statusCode, req.url)
              }
            })
          },
        },
        '/uploads': {
          target: env.VITE_API_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
        },
      },
      cors: true,
      middlewareMode: false
    },
    
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      target: 'es2022',
      sourcemap: mode === 'development',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      minify: mode === 'production' ? 'esbuild' : false,
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react'
              }
              if (id.includes('ckeditor5') || id.includes('@ckeditor')) {
                return 'vendor-ckeditor'
              }
              if (id.includes('@fullcalendar')) {
                return 'vendor-calendar'
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-ui'
              }
              if (id.includes('axios') || id.includes('zustand') || 
                  id.includes('lodash') || id.includes('lucide-react')) {
                return 'vendor-utils'
              }
              return 'vendor-other'
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.')
            const ext = info?.[info.length - 1]
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name ?? '')) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name ?? '')) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            if (ext === 'css') {
              return `assets/css/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        },
        external: [],
        plugins: []
      },
      reportCompressedSize: true,
      emptyOutDir: true
    },
    
    preview: {
      host: '127.0.0.1',
      port: 8080,
      strictPort: true,
      open: false,
      cors: true
    },
    
    cacheDir: 'node_modules/.vite',
    
    define: {
      __DEV__: mode === 'development',
      __PROD__: mode === 'production',
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
      target: 'es2022'
    },
    
    logLevel: mode === 'development' ? 'info' : 'warn',
    clearScreen: false
  }
})
