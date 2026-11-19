# Pixelmorphic AI v79.0 — Railway Hobby Deployment Checklist

1. **Install v79.0 Locally First**
   - Extract this zip into your `pixelmorphic-samurai` project folder and run:
     ```bash
     node Pixelmorphic_Restore_Clean_Site.mjs
     ```
2. **Push to GitHub & Connect to Railway Hobby ($5/mo)**
   - Push your updated folder to a private GitHub repo, then in Railway click **New Project -> Deploy from GitHub Repo**.
3. **Mount a Persistent Volume (Critical so chats & users never reset)**
   - In your Railway service -> **Volumes** -> **Add Volume** -> Mount Path: `/data`.
   - `v79.0` automatically detects `/data` and stores isolated user workspaces, sessions, and accounts there.
4. **Set Environment Variables in Railway (Variables tab)**
   - `OPENROUTER_API_KEY` (your OpenRouter key)
   - `FAL_KEY` (your fal.ai key)
   - `SMTP_USER` (`pixelmetamorphic@gmail.com`)
   - `SMTP_PASS` (your Gmail App Password)
   - `ADMIN_INIT_PASSWORD` (choose a strong admin password)
   - `DATA_DIR=/data`
5. **Connect `pixelmorphicai.co` via Cloudflare DNS**
   - In Railway -> **Settings -> Networking -> Custom Domain** -> add `pixelmorphicai.co` and `www.pixelmorphicai.co`.
   - Copy the `CNAME` target Railway gives you and paste it into your active Cloudflare DNS panel.
