function normalizeDomain(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

function isValidIpv4(ip) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split(".").every((part) => {
      const n = Number(part);
      return n >= 0 && n <= 255;
    });
}

function buildDnsRecords(domainConfig) {
  const domain = normalizeDomain(domainConfig?.customDomain);
  const ip = String(domainConfig?.serverIp || "").trim();
  const useWwwCname = domainConfig?.wwwRecordType === "CNAME";
  const records = [];

  if (!domain || !ip) {
    return { domain, ip, records, ready: false };
  }

  records.push({
    type: "A",
    host: "@",
    hostLabel: "@ (root / apex)",
    value: ip,
    ttl: "3600",
    purpose: `Opens ${domain} on your VPS`
  });

  if (domainConfig?.includeWww !== false) {
    if (useWwwCname) {
      records.push({
        type: "CNAME",
        host: "www",
        hostLabel: "www",
        value: domain,
        ttl: "3600",
        purpose: "Opens www." + domain
      });
    } else {
      records.push({
        type: "A",
        host: "www",
        hostLabel: "www",
        value: ip,
        ttl: "3600",
        purpose: "Opens www." + domain + " on your VPS"
      });
    }
  }

  return { domain, ip, records, ready: true };
}

function buildNginxConfig(domainConfig) {
  const { domain, ip, ready } = buildDnsRecords(domainConfig);
  if (!ready) return "";

  const wwwLine = domainConfig?.includeWww !== false
    ? `    server_name ${domain} www.${domain};`
    : `    server_name ${domain};`;

  return `# Nginx config for ${domain} → Niyamstack VPS (${ip})
# Save as: /etc/nginx/sites-available/${domain}
# Then: sudo ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/
#       sudo nginx -t && sudo systemctl reload nginx
# SSL: sudo certbot --nginx -d ${domain}${domainConfig?.includeWww !== false ? ` -d www.${domain}` : ""}

server {
    listen 80;
${wwwLine}

    location / {
        proxy_pass http://127.0.0.1:${domainConfig?.appPort || 3000};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
}

function buildSetupSteps(domainConfig) {
  const { domain, records, ready } = buildDnsRecords(domainConfig);
  if (!ready) {
    return [
      "Enter your custom domain (e.g. nexusitacad.com)",
      "Enter your Niyamstack VPS public IP address",
      "Save & Publish — DNS instructions will appear here"
    ];
  }

  return [
    `Log in to your domain registrar (where you bought ${domain})`,
    "Open DNS Management / DNS Zone / Name Servers section",
    `Add the ${records.length} DNS record(s) shown below exactly as listed`,
    "Remove old Shopify or Classplus A/CNAME records if they exist",
    "Wait 15 minutes to 48 hours for DNS propagation",
    "On your VPS: deploy this CMS with PM2 (npm start on port " + (domainConfig?.appPort || 3000) + ")",
    "Copy the Nginx config below to your VPS and reload Nginx",
    "Run Certbot for free HTTPS: certbot --nginx -d " + domain,
    "Visit https://" + domain + " — your site should be live"
  ];
}

module.exports = {
  normalizeDomain,
  isValidIpv4,
  buildDnsRecords,
  buildNginxConfig,
  buildSetupSteps
};
