# Nexus IT Academy — CMS & Website Builder

Dynamic coaching website with a full **admin panel** to update content, links, alumni stories, themes, colors, and fonts — without touching code.

## Quick Start (non-technical — just double-click)

1. Double-click **`START-NEXUS.bat`** in the project folder
2. Browser opens automatically — website + admin panel
3. Login with your Admin ID and password (see `HOW-TO-USE.txt`)

To stop: double-click **`STOP-NEXUS.bat`**

## Quick Start (developers)

```bash
npm install
npm start
```

| URL | Purpose |
|-----|---------|
| https://nexusitacad.niyamstack.com/ | Public website (production) |
| https://nexusitacad.niyamstack.com/admin/ | Admin website builder |
| http://localhost:3000 | Local development |
| http://localhost:3000/admin/ | Local admin |

**Admin login:** Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` (see `.env.example`).  
Never commit `.env` to git.

## Admin Panel Features

- **Announcement bar** — Update "100+ Genuine Placement", hiring partners count, etc.
- **Register & Login links** — Enable/disable and set URLs (Classplus today, anything tomorrow)
- **Hero section** — Headline and feature bullets
- **Hiring partners** — Add/remove company logos
- **Alumni / success stories** — Add/remove carousel images
- **Journey steps** — 4-step placement journey
- **Job profiles** — SAP, MIM, Scrum Master, etc.
- **Fee structure** — Pay-after-placement timeline
- **Contact & footer** — Address, phone, email, footer logos
- **6 coaching themes** — Nexus Classic, Career Blue, Growth Green, Premium Purple, Trust Navy, Sunrise Orange
- **Custom colors & fonts** — Override any theme
- **Domain & Go Live** — Enter custom domain + VPS IP; get exact DNS records (@, www, A, CNAME) and Nginx config
- **Live preview** — See changes before publishing

## Project Structure

```
server.js              # Express server
lib/renderer.js        # Dynamic site HTML generator
lib/store.js           # JSON content storage
lib/themes.js          # Theme presets
data/site.default.json # Default content (reset source)
data/site.json         # Live content (auto-created, gitignored)
admin/                 # Admin panel UI
public/assets/         # Site CSS & JS
legacy/                # Original static Shopify copy
```

## Domain & Go Live (Admin)

In **Admin → Domain & Go Live**:

1. Enter your custom domain (e.g. `nexusitacad.com`)
2. Enter your **Niyamstack VPS public IP**
3. Save — the panel shows exact DNS records to add at your registrar:
   - **A record @** → VPS IP (root domain)
   - **A or CNAME www** → VPS IP or domain (optional)
4. Copy the generated **Nginx config** to your VPS
5. Run Certbot for HTTPS after DNS propagates

## VPS Deployment

See **[deploy/DEPLOY.md](deploy/DEPLOY.md)** for full steps to go live on `nexusitacad.niyamstack.com`.

1. Clone repo on VPS
2. Copy `.env.example` → `.env` and set admin credentials + `SESSION_SECRET`
3. `npm install && pm2 start deploy/ecosystem.config.cjs`
4. Configure Nginx using `deploy/nexusitacad.niyamstack.com.nginx`
5. Run Certbot for HTTPS

## Legacy Static Site

The original static copy is in `legacy/` and can be built with `node build.js` from `source.html`.
