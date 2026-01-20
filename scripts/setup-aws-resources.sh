#!/bin/bash
# One-time setup of AWS resources for Clod Sarnet
# Usage: ./scripts/setup-aws-resources.sh

set -e

echo "🚀 Setting up AWS resources for Clod Sarnet"
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="clod-sarnet"
S3_BUCKET_FILES="${PROJECT_NAME}-files-$(date +%s)"
S3_BUCKET_FRONTEND="${PROJECT_NAME}-frontend"

read -p "AWS Region [us-east-1]: " input_region
AWS_REGION="${input_region:-$AWS_REGION}"

echo ""
echo "📦 Configuration:"
echo "   AWS Region: ${AWS_REGION}"
echo "   File Storage Bucket: ${S3_BUCKET_FILES}"
echo "   Frontend Bucket: ${S3_BUCKET_FRONTEND}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Create S3 bucket for file storage
echo ""
echo "📦 Step 1: Creating S3 bucket for file storage..."
aws s3 mb "s3://${S3_BUCKET_FILES}" --region ${AWS_REGION}

# Block public access (important for security)
aws s3api put-public-access-block \
    --bucket ${S3_BUCKET_FILES} \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket ${S3_BUCKET_FILES} \
    --versioning-configuration Status=Enabled

echo "✅ S3 bucket created: ${S3_BUCKET_FILES}"

# 2. Create IAM user for backend
echo ""
echo "👤 Step 2: Creating IAM user for backend..."
IAM_USER="${PROJECT_NAME}-backend"

if aws iam get-user --user-name ${IAM_USER} 2>/dev/null; then
    echo "⚠️  User ${IAM_USER} already exists, skipping creation"
else
    aws iam create-user --user-name ${IAM_USER}
    echo "✅ IAM user created: ${IAM_USER}"
fi

# 3. Create IAM policies
echo ""
echo "🔐 Step 3: Creating IAM policies..."

# S3 policy
cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET_FILES}",
        "arn:aws:s3:::${S3_BUCKET_FILES}/*"
      ]
    }
  ]
}
EOF

aws iam put-user-policy \
    --user-name ${IAM_USER} \
    --policy-name S3FileAccess \
    --policy-document file:///tmp/s3-policy.json

# Bedrock policy
cat > /tmp/bedrock-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-user-policy \
    --user-name ${IAM_USER} \
    --policy-name BedrockAccess \
    --policy-document file:///tmp/bedrock-policy.json

rm /tmp/s3-policy.json /tmp/bedrock-policy.json

echo "✅ IAM policies attached"

# 4. Create access keys
echo ""
echo "🔑 Step 4: Creating access keys..."

# Delete old keys if any
OLD_KEYS=$(aws iam list-access-keys --user-name ${IAM_USER} --query 'AccessKeyMetadata[].AccessKeyId' --output text)
for KEY in $OLD_KEYS; do
    echo "   Deleting old key: ${KEY}"
    aws iam delete-access-key --user-name ${IAM_USER} --access-key-id ${KEY}
done

# Create new key
KEY_OUTPUT=$(aws iam create-access-key --user-name ${IAM_USER} --output json)
ACCESS_KEY_ID=$(echo $KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

echo "✅ Access keys created"

# 5. Create ECS cluster
echo ""
echo "🐳 Step 5: Creating ECS cluster..."
ECS_CLUSTER="${PROJECT_NAME}-cluster"

if aws ecs describe-clusters --clusters ${ECS_CLUSTER} --region ${AWS_REGION} 2>/dev/null | grep -q "ACTIVE"; then
    echo "⚠️  Cluster ${ECS_CLUSTER} already exists, skipping creation"
else
    aws ecs create-cluster --cluster-name ${ECS_CLUSTER} --region ${AWS_REGION}
    echo "✅ ECS cluster created: ${ECS_CLUSTER}"
fi

# 6. Create CloudWatch log group
echo ""
echo "📊 Step 6: Creating CloudWatch log group..."
LOG_GROUP="/ecs/${PROJECT_NAME}"

if aws logs describe-log-groups --log-group-name-prefix ${LOG_GROUP} --region ${AWS_REGION} 2>/dev/null | grep -q ${LOG_GROUP}; then
    echo "⚠️  Log group ${LOG_GROUP} already exists, skipping creation"
else
    aws logs create-log-group --log-group-name ${LOG_GROUP} --region ${AWS_REGION}
    echo "✅ CloudWatch log group created: ${LOG_GROUP}"
fi

# 7. Summary and next steps
echo ""
echo "============================================"
echo "✅ AWS Resources Setup Complete!"
echo "============================================"
echo ""
echo "📝 Save these credentials securely:"
echo ""
echo "AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}"
echo "AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}"
echo "AWS_REGION=${AWS_REGION}"
echo "S3_BUCKET_NAME=${S3_BUCKET_FILES}"
echo ""
echo "⚠️  IMPORTANT: Add these to your .env file!"
echo ""
echo "Next steps:"
echo "  1. Update .env file with the credentials above"
echo "  2. Request Bedrock model access in AWS Console:"
echo "     → Go to AWS Bedrock → Model access"
echo "     → Request access to Claude Sonnet 4"
echo "  3. Set up MongoDB (Atlas or DocumentDB)"
echo "  4. Deploy backend: ./scripts/deploy-backend-ecr.sh"
echo "  5. Deploy frontend: REACT_APP_BACKEND_URL=<your-backend-url> ./scripts/deploy-frontend-s3.sh"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
