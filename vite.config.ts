import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({registerType:'autoUpdate',includeAssets:['favicon.svg'],manifest:{name:'BP 分析',short_name:'BP 分析',description:'可解釋的《王者榮耀》BP 分析助手',lang:'zh-Hant',theme_color:'#07111f',background_color:'#07111f',display:'standalone',icons:[{src:'favicon.svg',sizes:'any',type:'image/svg+xml'}]},workbox:{globPatterns:['**/*.{js,css,html,json,svg,webp}']}})],
  test: { environment: 'node' }
})
