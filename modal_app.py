"""Host the Ajoissa app on Modal (https://modal.com).

The container installs Node, builds the app from ./frontend and serves it with `vite preview`, which also runs the
small /api server (the AI briefing). The Anthropic key comes from a Modal secret named `ajoissa-llm` holding
LLM_KEY: it is never in this repo or in the browser.

    pip install modal
    modal setup                                   # log in once
    modal secret create ajoissa-llm LLM_KEY=...   # or create it in the Modal dashboard under Secrets
    modal deploy modal_app.py                     # prints the public URL

One container only, so the per-visitor caps on paid AI calls (server/llm.ts) hold across all visitors.
`min_containers=1` keeps it awake for judging; set it to 0 afterwards so it scales to zero when idle.
"""
import subprocess

import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl", "ca-certificates", "gnupg")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_dir(
        "frontend",
        "/app",
        copy=True,
        ignore=["node_modules", "dist", "**/node_modules/**", ".env", ".env.*"],
    )
    .run_commands("cd /app && npm ci && npm run build")
)

app = modal.App("ajoissa", image=image)


@app.function(
    secrets=[modal.Secret.from_name("ajoissa-llm")],
    min_containers=1,
    max_containers=1,
    timeout=3600,
)
@modal.concurrent(max_inputs=100)
@modal.web_server(port=8000, startup_timeout=120)
def web():
    subprocess.Popen(
        "npx vite preview --host 0.0.0.0 --port 8000 --strictPort",
        shell=True,
        cwd="/app",
    )
