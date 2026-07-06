#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

AUTH_SECRET=$(openssl rand -base64 32)
HOSTNAME=$(hostname -I | awk '{print $1}')
# src/.env.local — used by Next.js dev (npm run dev)
{
  echo "AUTH_SECRET=${AUTH_SECRET}"
  echo "AUTH_URL=http://$HOSTNAME:6080"
  echo "KEYCLOAK_CLIENT_ID=sinkhole"
  echo "KEYCLOAK_ISSUER=http://keycloak:8080/realms/cdac"
  #echo "BACKEND_URL=http://pcap-api:5000/api"
  echo "BACKEND_URL=http://192.168.10.11:5000/api"

} > "$SCRIPT_DIR/src/.env.local"

echo "✔ Written: src/.env.local"

# .env — used by docker-compose (production)
{
  echo "# Next.js / NextAuth"
  echo "AUTH_SECRET=${AUTH_SECRET}"
  echo "AUTH_URL=http://$HOSTNAME:6080"
  echo "KEYCLOAK_CLIENT_ID=sinkhole"
  echo "KEYCLOAK_ISSUER=http://keycloak:8080/realms/cdac"
 # echo "BACKEND_URL=http://pcap-api:5000/api"
  echo "BACKEND_URL=http://192.168.10.11:5000/api"
  echo ""
  echo "# Postgres"
  echo "POSTGRES_DB=keycloak"
  echo "POSTGRES_USER=keycloak"
  echo "POSTGRES_PASSWORD=esec@sta#P1"
  echo "" 
  echo "# Keycloak"
  echo "KC_HOSTNAME=$HOSTNAME"
  echo "KEYCLOAK_ADMIN=admin"
  echo "KEYCLOAK_ADMIN_PASSWORD=esec@sta#P1"
} > "$SCRIPT_DIR/.env"

echo "✔ Written: .env"
echo ""
echo "Done. To deploy:"
echo "  docker compose up --build -d"
echo "  docker network connect sinkhole-u_keycloak_network pcap-api"
