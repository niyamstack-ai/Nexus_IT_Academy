# Nexus IT Academy — CMS & Website Builder

Dynamic coaching website with a full **admin panel** to update content, links, alumni stories, themes, colors, and fonts — without touching code.

## Quick Start

```bash
npm install
npm start
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Public website |
| http://localhost:3000/admin/ | Admin website builder |

**Default admin password:** `nexusadmin2026`  
Change via environment variable: `ADMIN_PASSWORD=your-secure-password`

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

## VPS Deployment (next step)

1. Clone repo on VPS
2. Set `ADMIN_PASSWORD` and `SESSION_SECRET` env vars
3. Run with PM2: `pm2 start server.js --name nexus-cms`
4. Point nginx to port 3000
5. Connect domain DNS to VPS

## Legacy Static Site

The original static copy is in `legacy/` and can be built with `node build.js` from `source.html`.
