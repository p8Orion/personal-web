#!/bin/bash
set -e
mkdir -p /var/www/portfolio
find /var/www/portfolio -mindepth 1 -delete
tar -xf /tmp/portfolio-dist.tar -C /var/www/portfolio
chown -R www-data:www-data /var/www/portfolio
echo '=== images ==='
ls -la /var/www/portfolio/images
echo '=== curl 1-yo.webp ==='
curl -sS -I http://127.0.0.1/portfolio/images/1-yo.webp | sed -n '1,12p'
echo '=== curl index ==='
curl -sS -I http://127.0.0.1/portfolio/ | sed -n '1,10p'
rm -f /tmp/portfolio-dist.tar /tmp/install-portfolio.sh
echo done
