#!/bin/bash
# Deploy Backend to AWS ECR and ECS
# Usage: ./scripts/deploy-backend-ecr.sh

set -e

echo "🚀 Deploying Clod Sarnet Backend to AWS"

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="clod-sarnet-backend"
ECS_CLUSTER="clod-sarnet-cluster"
ECS_SERVICE="clod-sarnet-backend"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo "📦 Configuration:"
echo "   AWS Region: ${AWS_REGION}"
echo "   AWS Account: ${AWS_ACCOUNT_ID}"
echo "   ECR URI: ${ECR_URI}"
echo ""

# Create ECR repository if it doesn't exist
echo "🏗️  Checking ECR repository..."
if ! aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} 2>/dev/null; then
    echo "   Creating ECR repository..."
    aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION}
fi

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI%/*}

# Build Docker image
echo "🔨 Building Docker image..."
cd backend
docker build -t ${ECR_REPO_NAME}:latest .
cd ..

# Tag image
echo "🏷️  Tagging image..."
docker tag ${ECR_REPO_NAME}:latest ${ECR_URI}:latest
docker tag ${ECR_REPO_NAME}:latest ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

# Push to ECR
echo "⬆️  Pushing to ECR..."
docker push ${ECR_URI}:latest
docker push ${ECR_URI}:$(date +%Y%m%d-%H%M%S)

# Update ECS service (if exists)
echo "🔄 Updating ECS service..."
if aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} 2>/dev/null | grep -q "ACTIVE"; then
    aws ecs update-service \
        --cluster ${ECS_CLUSTER} \
        --service ${ECS_SERVICE} \
        --force-new-deployment \
        --region ${AWS_REGION}
    echo "✅ Service updated! Waiting for deployment..."
    aws ecs wait services-stable \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION}
else
    echo "⚠️  ECS service not found. Please create it manually or run setup script."
fi

echo ""
echo "✅ Deployment complete!"
echo "📝 Image URI: ${ECR_URI}:latest"
echo ""
echo "Next steps:"
echo "  1. If this is first deployment, create ECS service"
echo "  2. Check CloudWatch logs for any errors"
echo "  3. Test backend: curl http://YOUR_ALB_URL/api"
