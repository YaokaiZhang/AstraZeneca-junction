import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { llmApi } from './server/llm'

// https://vite.dev/config/
// llmApi() adds POST /api/chat + GET /api/health (server-side; reads LLM_KEY from the environment).
export default defineConfig({
  plugins: [react(), llmApi()],
})
