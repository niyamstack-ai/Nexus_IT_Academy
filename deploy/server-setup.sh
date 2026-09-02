#!/bin/bash
# Nexus IT Academy - server setup for nexusitacad.niyamstack.com
# Run on your Linux VPS after SSH login

set -e

APP_DIR="/var/www/nexus-it-academy"
REPO="https://github.com/niyamstack-ai/Nexus_IT_Academy.git"
DOMAIN="nexusitacad.niyamstack.com"

echo "=== Nexus IT Academy - Go Live Setup ==="

# Install Node.js if missing
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 if missing
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Install Nginx if missing
if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing Nginx..."
  apt-get update -qq
  apt-get install -y nginx
fi

# Clone or update app
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ -d ".git" ]; then
  echo "Updating code..."
  git pull origin main
else
  echo "Downloading code..."
  git clone "$REPO" .
fi

echo "Installing packages..."
npm install --no-fund --no-audit

# Create .env (uses variables passed from GO-LIVE.ps1 or defaults)
cat > .env << EOF
PORT=3000
NODE_ENV=production
PUBLIC_URL=https://${DOMAIN}
ADMIN_USERNAME=${ADMIN_USERNAME:-NexusITAcademy}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-CHANGE_ME}
SESSION_SECRET=${SESSION_SECRET:-nexus-niyamstack-prod-$(date +%s)}
EOF

echo "Starting website..."
pm2 delete nexus-cms 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Nginx
echo "Configuring Nginx..."
cp deploy/nexusitacad.niyamstack.com.nginx /etc/nginx/sites-available/${DOMAIN}
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl reload nginx

# HTTPS with Certbot if available
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m admin@${DOMAIN} || true
else
  echo "Certbot not installed. Run: apt install certbot python3-certbot-nginx"
  echo "Then: certbot --nginx -d ${DOMAIN}"
fi

echo ""
echo "=========================================="
echo " DONE! Your site should be live at:"
echo " https://${DOMAIN}/"
echo " https://${DOMAIN}/admin/"
echo "=========================================="
