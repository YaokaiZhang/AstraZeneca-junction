# Ajoissa frontend

```bash
npm install
npm run dev                         # http://localhost:5173
npm run build && npm run preview    # production build
```

## AI replies in the patient diary chat (optional)

The symptom-diary chat (`/#/patient/diary`) can use Claude Haiku 5.5 (`claude-haiku-5-5`) to write short replies
and pull out symptom tags, the start date, weight lost and smoking info from free text. The call happens on the
server: `server/llm.ts` is a Vite plugin that adds `POST /api/chat` and `GET /api/health` to both `vite` (dev) and
`vite preview`. The Anthropic API key is read from `LLM_KEY` in the server's environment and is never bundled
into the browser code (do **not** use a `VITE_` variable for it).

```bash
LLM_KEY=sk-ant-... npm run dev
# or
npm run build && LLM_KEY=sk-ant-... npx vite preview
```

Without `LLM_KEY` (or on a static host with no `/api`), or if a call fails, the chat silently falls back to the
original scripted bot. Urgency (the two-week flag) always comes from `src/pages/patient/logic.ts`, never from the
model. People can switch AI replies off under Privacy; only the recent chat text is sent, never profile data.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
