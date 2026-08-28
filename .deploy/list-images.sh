#!/bin/bash
echo '=== assets (images) ==='
ls -la /var/www/portfolio/assets | grep -E 'jpg|jpeg|png|webp|gif' || true
echo '=== images dir ==='
ls -la /var/www/portfolio/images 2>/dev/null || echo 'NO /var/www/portfolio/images'
echo '=== curl hashed jpg ==='
curl -sS -I http://127.0.0.1/portfolio/assets/1-yo-qOcy2qFt.jpg | sed -n '1,12p'
echo '=== curl 3-c ==='
curl -sS -I http://127.0.0.1/portfolio/assets/images/3-c.webp | sed -n '1,8p'
