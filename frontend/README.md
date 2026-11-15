# Ajoissa frontend

See the [main README](../README.md) for what the app does and where its data comes from.

```bash
npm install
LLM_KEY=sk-ant-... npm run dev                          # http://localhost:5173
npm run build && LLM_KEY=sk-ant-... npx vite preview    # production build
npm test                                                # screening calculations and AI briefing checks
npm run lint
npm run rag:index                                       # after editing knowledge/sources/
```

## The AI briefing

`server/llm.ts` is a Vite plugin that adds `POST /api/briefing` and `GET /api/health` to both `vite` (dev) and
`vite preview`. The Anthropic API key is read from `LLM_KEY` in the server's environment and is never bundled into
the browser code (do **not** use a `VITE_` variable for it).

The browser sends only the calculated figures for one county and programme. The server finds a few passages in the
approved sources (`knowledge/`), asks the model for a four-line briefing that cites them, and checks the answer:
every number must match a calculated figure and every citation must point at a returned passage. The browser checks
again. If anything fails, or there is no key, the plan uses the template briefing and says why in one line.

## Hidden pages

`src/config.ts` has `SHOW_FULL_STORY = false`. That hides the earlier patient, hospital and county pages; their
routes redirect to the landing page.
