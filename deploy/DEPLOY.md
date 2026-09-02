# Deploy to nexusitacad.niyamstack.com

## Live URLs

| URL | Purpose |
|-----|---------|
| https://nexusitacad.niyamstack.com/ | Public website |
| https://nexusitacad.niyamstack.com/admin/ | Admin panel |

## 1. VPS setup

```bash
git clone https://github.com/niyamstack-ai/Nexus_IT_Academy.git
cd Nexus_IT_Academy
npm install
cp .env.example .env
# Edit .env — set ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET
```

## 2. Start with PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

The app loads `.env` automatically via dotenv.

## 3. Nginx + HTTPS

```bash
sudo cp deploy/nexusitacad.niyamstack.com.nginx /etc/nginx/sites-available/nexusitacad.niyamstack.com
sudo ln -sf /etc/nginx/sites-available/nexusitacad.niyamstack.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nexusitacad.niyamstack.com
```

## 4. Niyamstack DNS

In your Niyamstack panel, point `nexusitacad.niyamstack.com` to this VPS (A record or internal routing as provided by Niyamstack).

## Admin login

Credentials are set in `.env` on the server (never commit `.env`):

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
