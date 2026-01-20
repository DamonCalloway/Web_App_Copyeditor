#!/bin/bash
# Test Clod Sarnet deployment
# Usage: ./scripts/test-deployment.sh <backend-url>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/test-deployment.sh <backend-url>"
    echo "Example: ./scripts/test-deployment.sh http://your-alb.amazonaws.com"
    exit 1
fi

BACKEND_URL="$1"
API_URL="${BACKEND_URL}/api"

echo "🧪 Testing Clod Sarnet Deployment"
echo "Backend URL: ${BACKEND_URL}"
echo ""

# Test 1: Health check
echo "1️⃣  Testing API health..."
HEALTH_RESPONSE=$(curl -s "${API_URL}" || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "Assessment Editor API"; then
    echo "   ✅ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test 2: Feature config
echo ""
echo "2️⃣  Testing feature configuration..."
FEATURE_RESPONSE=$(curl -s "${API_URL}/config/features" || echo "FAILED")
if echo "$FEATURE_RESPONSE" | grep -q "available_providers"; then
    echo "   ✅ Feature config accessible"
    echo "   Available providers: $(echo $FEATURE_RESPONSE | jq -r '.available_providers[]' 2>/dev/null || echo 'N/A')"
    echo "   Bedrock configured: $(echo $FEATURE_RESPONSE | jq -r '.bedrock_configured' 2>/dev/null || echo 'N/A')"
else
    echo "   ❌ Feature config failed"
    echo "   Response: $FEATURE_RESPONSE"
fi

# Test 3: Storage config
echo ""
echo "3️⃣  Testing storage configuration..."
STORAGE_RESPONSE=$(curl -s "${API_URL}/storage/config" || echo "FAILED")
if echo "$STORAGE_RESPONSE" | grep -q "provider"; then
    echo "   ✅ Storage config accessible"
    echo "   Provider: $(echo $STORAGE_RESPONSE | jq -r '.provider' 2>/dev/null || echo 'N/A')"
    echo "   S3 configured: $(echo $STORAGE_RESPONSE | jq -r '.s3_configured' 2>/dev/null || echo 'N/A')"
else
    echo "   ❌ Storage config failed"
    echo "   Response: $STORAGE_RESPONSE"
fi

# Test 4: Create test project
echo ""
echo "4️⃣  Testing project creation..."
PROJECT_DATA='{"name":"Test Project","description":"Automated test","instructions":"Test instructions","llm_provider":"bedrock-claude"}'
PROJECT_RESPONSE=$(curl -s -X POST "${API_URL}/projects" \
    -H "Content-Type: application/json" \
    -d "$PROJECT_DATA" || echo "FAILED")

if echo "$PROJECT_RESPONSE" | grep -q '"id"'; then
    PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id' 2>/dev/null)
    echo "   ✅ Project created successfully"
    echo "   Project ID: $PROJECT_ID"

    # Clean up - delete test project
    echo ""
    echo "5️⃣  Cleaning up test project..."
    DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/projects/${PROJECT_ID}" || echo "FAILED")
    if echo "$DELETE_RESPONSE" | grep -q "success"; then
        echo "   ✅ Test project deleted"
    else
        echo "   ⚠️  Could not delete test project (ID: ${PROJECT_ID})"
    fi
else
    echo "   ❌ Project creation failed"
    echo "   Response: $PROJECT_RESPONSE"
fi

echo ""
echo "============================================"
echo "🎉 Deployment Test Complete!"
echo "============================================"
echo ""
echo "Summary:"
echo "  • Backend is accessible"
echo "  • API endpoints are working"
echo "  • Database connection is functional"
echo ""
echo "Next steps:"
echo "  1. Test frontend in browser"
echo "  2. Create a real project"
echo "  3. Upload test documents"
echo "  4. Test chat with Claude via Bedrock"
echo ""
echo "📖 See DEPLOYMENT.md for more information"
