#!/bin/bash
# Complete JAZAL delivery: Add jazal.vercel.app domain to temporary-sonic-harp project
# 
# Prerequisites:
# - Valid VERCEL_API_TOKEN with team_juda12 access
# - Or: Manual login to vercel.com dashboard
#
# Current state (verified Aug 31, 2026 3:57 PM):
# ✅ temporary-sonic-harp-0ymnpou.vercel.app → jazal-fusion-v4 
# ❌ jazal.vercel.app → jazal-clean-rebuild-v2 (OLD)
#
# Goal: jazal.vercel.app → jazal-fusion-v4

set -e

PROJECT_ID="prj_eAIzDeZ40S23Cf1bnLq91FVstQf0"
TEAM_ID="team_K3hgXgywEsrkEwfPOizvbFfs"
DOMAIN="jazal.vercel.app"

if [ -z "$VERCEL_API_TOKEN" ]; then
  echo "❌ VERCEL_API_TOKEN not set."
  echo ""
  echo "Option 1 - Get API token:"
  echo "  1. Visit: https://vercel.com/account/tokens"
  echo "  2. Create token with full access"
  echo "  3. Export: export VERCEL_API_TOKEN=<your_token>"
  echo ""
  echo "Option 2 - Manual dashboard (3 clicks):"
  echo "  1. Go to: https://vercel.com/juda12/temporary-sonic-harp/settings/domains"
  echo "  2. Add domain: jazal.vercel.app"
  echo "  3. If blocked: remove from old project first"
  exit 1
fi

echo "🔍 Checking project..."
PROJECT=$(curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID")

if echo "$PROJECT" | grep -q "error"; then
  echo "❌ API call failed:"
  echo "$PROJECT" | jq .
  exit 1
fi

echo "✅ Project accessed: $(echo $PROJECT | jq -r .name)"

echo ""
echo "🌐 Adding domain: $DOMAIN"
RESULT=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_API_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$PROJECT_ID/domains?teamId=$TEAM_ID" \
  -d "{\"name\": \"$DOMAIN\"}")

if echo "$RESULT" | grep -q "error"; then
  ERROR_CODE=$(echo "$RESULT" | jq -r .error.code)
  if [ "$ERROR_CODE" == "domain_already_in_use" ]; then
    echo "⚠️  Domain in use on another project. Removing it first..."
    # Find and remove from old project
    OLD_PROJECT=$(curl -s -H "Authorization: Bearer $VERCEL_API_TOKEN" \
      "https://api.vercel.com/v9/projects?teamId=$TEAM_ID" | \
      jq -r ".projects[] | select(.alias[] | contains(\"$DOMAIN\")) | .id")
    
    if [ -n "$OLD_PROJECT" ]; then
      echo "📌 Found on project: $OLD_PROJECT"
      curl -s -X DELETE -H "Authorization: Bearer $VERCEL_API_TOKEN" \
        "https://api.vercel.com/v9/projects/$OLD_PROJECT/domains/$DOMAIN?teamId=$TEAM_ID"
      echo "✅ Removed from old project"
      
      # Retry adding to new project
      RESULT=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_API_TOKEN" \
        -H "Content-Type: application/json" \
        "https://api.vercel.com/v10/projects/$PROJECT_ID/domains?teamId=$TEAM_ID" \
        -d "{\"name\": \"$DOMAIN\"}")
    fi
  fi
  
  if echo "$RESULT" | grep -q "error"; then
    echo "❌ Failed to add domain:"
    echo "$RESULT" | jq .
    exit 1
  fi
fi

echo "✅ Domain added successfully!"
echo ""
echo "🔗 Verifying deployment..."
sleep 5

CONTENT=$(curl -s "https://$DOMAIN/app.js" | grep -o "jazal-fusion-v4" || echo "")
if [ "$CONTENT" == "jazal-fusion-v4" ]; then
  echo "✅✅✅ SUCCESS! jazal.vercel.app now serves jazal-fusion-v4"
  echo ""
  echo "🎉 JAZAL delivery complete!"
  echo "📱 Live URL: https://jazal.vercel.app"
else
  echo "⏳ DNS propagating... May take 1-2 minutes."
  echo "   Verify: curl -s https://jazal.vercel.app/app.js | grep fusion-v3"
fi
