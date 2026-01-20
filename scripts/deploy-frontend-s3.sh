#!/bin/bash
# Deploy Frontend to S3 + CloudFront
# Usage: ./scripts/deploy-frontend-s3.sh

set -e

echo "🚀 Deploying Clod Sarnet Frontend to AWS S3"

# Configuration
S3_BUCKET="${S3_BUCKET_NAME:-clod-sarnet-frontend}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BACKEND_URL="${REACT_APP_BACKEND_URL}"

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: REACT_APP_BACKEND_URL environment variable not set"
    echo "   Usage: REACT_APP_BACKEND_URL=https://api.example.com ./scripts/deploy-frontend-s3.sh"
    exit 1
fi

echo "📦 Configuration:"
echo "   S3 Bucket: ${S3_BUCKET}"
echo "   AWS Region: ${AWS_REGION}"
echo "   Backend URL: ${BACKEND_URL}"
echo ""

# Create S3 bucket if it doesn't exist
echo "🏗️  Checking S3 bucket..."
if ! aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null; then
    echo "   Creating S3 bucket..."
    aws s3 mb "s3://${S3_BUCKET}" --region ${AWS_REGION}

    # Configure bucket for static website hosting
    aws s3 website "s3://${S3_BUCKET}" \
        --index-document index.html \
        --error-document index.html

    # Make bucket public (for static hosting)
    cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET}/*"
    }
  ]
}
EOF
    aws s3api put-bucket-policy --bucket ${S3_BUCKET} --policy file:///tmp/bucket-policy.json
    rm /tmp/bucket-policy.json
fi

# Build frontend
echo "🔨 Building frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    yarn install
fi

# Build with backend URL
echo "   Building with REACT_APP_BACKEND_URL=${BACKEND_URL}"
REACT_APP_BACKEND_URL=${BACKEND_URL} yarn build

# Upload to S3
echo "⬆️  Uploading to S3..."
aws s3 sync build/ "s3://${S3_BUCKET}" \
    --delete \
    --cache-control "public,max-age=31536000,immutable" \
    --exclude "index.html" \
    --exclude "*.map"

# Upload index.html with no-cache (for SPA routing)
aws s3 cp build/index.html "s3://${S3_BUCKET}/index.html" \
    --cache-control "no-cache" \
    --content-type "text/html"

cd ..

# Get CloudFront distribution ID (if exists)
echo "🔄 Checking for CloudFront distribution..."
CF_DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?DomainName=='${S3_BUCKET}.s3.amazonaws.com']].Id" \
    --output text 2>/dev/null || echo "")

if [ ! -z "$CF_DIST_ID" ]; then
    echo "   Found CloudFront distribution: ${CF_DIST_ID}"
    echo "   Creating invalidation..."
    aws cloudfront create-invalidation \
        --distribution-id ${CF_DIST_ID} \
        --paths "/*"
    echo "   ✅ Cache invalidated"
fi

echo ""
echo "✅ Frontend deployment complete!"
echo "📝 S3 URL: http://${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"
if [ ! -z "$CF_DIST_ID" ]; then
    CF_DOMAIN=$(aws cloudfront get-distribution --id ${CF_DIST_ID} --query 'Distribution.DomainName' --output text)
    echo "📝 CloudFront URL: https://${CF_DOMAIN}"
fi
echo ""
echo "Next steps:"
echo "  1. If no CloudFront, create distribution pointing to S3 bucket"
echo "  2. Set up custom domain with Route53 (optional)"
echo "  3. Test frontend in browser"
