#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Load from .env ────────────────────────────────────────────────────────────

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "✘ .env not found. Run setup.sh first."
  exit 1
fi

export $(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$' | xargs)

KC_URL="http://${KC_HOSTNAME}:8080"
KC_ADMIN_PASS="$KEYCLOAK_ADMIN_PASSWORD"
KC_ADMIN="$KEYCLOAK_ADMIN"
REALM="cdac"
CLIENT_ID="$KEYCLOAK_CLIENT_ID"

echo ""
echo "============================================"
echo "   Keycloak Setup"
echo "   $KC_URL"
echo "============================================"
echo ""

# ── Wait for Keycloak ─────────────────────────────────────────────────────────

echo "Waiting for Keycloak..."
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$KC_URL/realms/master")
  [ "$STATUS" = "200" ] && echo "✔ Keycloak ready" && break
  echo "  ($i/30) waiting..."
  sleep 5
done

# ── Get admin token ───────────────────────────────────────────────────────────

TOKEN=$(curl -s -X POST "$KC_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli&grant_type=password&username=${KC_ADMIN}&password=${KC_ADMIN_PASS}" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

[ -z "$TOKEN" ] && echo "✘ Failed to get admin token. Check Keycloak admin credentials." && exit 1
echo "✔ Admin token obtained"

AUTH="Authorization: Bearer $TOKEN"
BASE="$KC_URL/admin/realms"

# Remove any previous copy of the realm so the script is repeatable and stale
# user setup state cannot survive a rerun.
curl -s -X DELETE "$BASE/$REALM" \
  -H "$AUTH" > /dev/null
sleep 3

# ── Create realm ──────────────────────────────────────────────────────────────

curl -s -X POST "$KC_URL/admin/realms" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"realm\":\"$REALM\",\"enabled\":true,\"displayName\":\"CDAC Sinkhole\"}" \
  > /dev/null
echo "✔ Realm '$REALM' created"

# ── Disable required actions in realm ────────────────────────────────────────

curl -s -X PUT "$BASE/$REALM" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"requiredCredentials":["password"]}' > /dev/null

# Disable verify-email and other interactive required actions
for action in VERIFY_EMAIL UPDATE_PASSWORD UPDATE_PROFILE CONFIGURE_TOTP TERMS_AND_CONDITIONS VERIFY_PROFILE webauthn-register webauthn-register-passwordless delete_credential update_user_locale; do
  curl -s -X PUT "$BASE/$REALM/authentication/required-actions/$action" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"alias\":\"$action\",\"name\":\"$action\",\"enabled\":false,\"defaultAction\":false,\"priority\":0}" > /dev/null
done
echo "✔ Required actions disabled"

# ── Create client ─────────────────────────────────────────────────────────────

curl -s -X POST "$BASE/$REALM/clients" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"enabled\": true,
    \"publicClient\": true,
    \"directAccessGrantsEnabled\": true,
    \"standardFlowEnabled\": true,
    \"redirectUris\": [\"*\"],
    \"webOrigins\": [\"*\"]
  }" > /dev/null
echo "✔ Client '$CLIENT_ID' created"

# ── Create roles ──────────────────────────────────────────────────────────────

for ROLE in admin user; do
  curl -s -X POST "$BASE/$REALM/roles" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"name\":\"$ROLE\"}" > /dev/null
  echo "✔ Role '$ROLE' created"
done

# ── Function to create user ───────────────────────────────────────────────────

create_user() {
  local USERNAME=$1
  local PASSWORD=$2
  local ROLE=$3

  # Get user ID if it already exists
  USER_ID=$(curl -s "$BASE/$REALM/users?username=$USERNAME" \
    -H "$AUTH" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  # Create user when missing, then fetch the ID
  if [ -z "$USER_ID" ]; then
    curl -s -X POST "$BASE/$REALM/users" \
      -H "$AUTH" -H "Content-Type: application/json" \
      -d "{
        \"username\": \"$USERNAME\",
        \"enabled\": true,
        \"emailVerified\": true,
        \"requiredActions\": []
      }" > /dev/null

    USER_ID=$(curl -s "$BASE/$REALM/users?username=$USERNAME" \
      -H "$AUTH" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  fi

  # Normalize the user so old required actions do not survive re-runs
  curl -s -X PUT "$BASE/$REALM/users/$USER_ID" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USERNAME\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"requiredActions\": []
    }" > /dev/null

  # Set password
  curl -s -X PUT "$BASE/$REALM/users/$USER_ID/reset-password" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"type\":\"password\",\"value\":\"$PASSWORD\",\"temporary\":false}" > /dev/null

  # Get role ID
  ROLE_ID=$(curl -s "$BASE/$REALM/roles/$ROLE" \
    -H "$AUTH" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  # Assign role
  curl -s -X POST "$BASE/$REALM/users/$USER_ID/role-mappings/realm" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "[{\"id\":\"$ROLE_ID\",\"name\":\"$ROLE\"}]" > /dev/null

  echo "✔ User '$USERNAME' created with role '$ROLE'"
}

# ── Create users ──────────────────────────────────────────────────────────────

create_user "admin1" "Adm!n@Sinkhole_26" "admin"
create_user "user1"  "U\$er@Sinkhole_26"  "user"

echo ""
echo "============================================"
echo "   Keycloak Setup Complete!"
echo "============================================"
echo ""
echo "  Admin user : admin1 / Adm!n@Sinkhole_26"
echo "  User       : user1  / U\$er@Sinkhole_26"
echo ""
