# Nexus IT Academy — Static Website

Single-page static copy of [nexusitacad.com](https://nexusitacad.com/), built for independent hosting.

## Files

- `index.html` — main website (open directly or deploy to any static host)
- `build.js` — rebuild script (requires `source.html` from live site scrape)

## Rebuild

```bash
node build.js
```

## Deploy

Upload `index.html` to GitHub Pages, Netlify, Vercel, or any web server.

Images and fonts load from the Nexus IT Academy CDN.
