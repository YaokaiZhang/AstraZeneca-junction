import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { llmApi } from './server/llm'

// https://vite.dev/config/
// llmApi() adds POST /api/chat + GET /api/health (server-side; reads LLM_KEY from the environment).
export default defineConfig({
  plugins: [react(), llmApi()],
  // Hosted demo: `vite preview` only answers requests for known host names.
  // Modal sites end in .modal.run, Render sites in .onrender.com; set ALLOWED_HOST for any other domain.
  preview: {
    allowedHosts: ['.modal.run', '.onrender.com', ...(process.env.ALLOWED_HOST ? [process.env.ALLOWED_HOST] : [])],
  },
})
