# Ajoissa — cancer, on time

Hackathon prototype for the AstraZeneca challenge. Spec: `docs/final-ideas.md`. Visual reference: `docs/design/reference.html`.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL. Three pages: `#/patient`, `#/hospital`, `#/county`.

All data is client-side (localStorage key `ajoissa-v1`). County figures and hospital patients are demo placeholders — every number carries a source badge. "Reset demo" in the sidebar clears everything.

## Quick test path

1. Patient → **Load example** → Pathway tab shows an overdue referral → pick a reason → copy the drafted message.
2. Patient → Privacy → share with hospital.
3. Hospital → your record appears at the top as **You** → open it to see the shared diary and risk.
4. County → click any tile → brief → print.
