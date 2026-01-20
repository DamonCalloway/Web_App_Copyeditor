# Clod Sarnet - AWS Deployment Guide

This guide will help you deploy Clod Sarnet to AWS with Bedrock for LLM and S3 for file storage.

## Architecture Overview

- **Frontend**: React app hosted on S3 + CloudFront (or EC2/ECS)
- **Backend**: FastAPI on ECS Fargate or EC2
- **Database**: MongoDB Atlas (recommended) or AWS DocumentDB
- **LLM**: AWS Bedrock (Claude/Mistral models)
- **File Storage**: Amazon S3
- **Optional**: Tavily API for web search

---

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed (for containerization)
4. **Node.js 18+** and **Yarn** (for frontend build)
5. **Python 3.11+** (for backend development)

---

## Step 1: Set Up MongoDB Database

### Option A: MongoDB Atlas (Recommended - Easiest)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (or paid if needed)
3. Create a database user with password
4. Whitelist your backend IP addresses (or use 0.0.0.0/0 for testing)
5. Get connection string: `mongodb+srv://<username>:<password>@cluster.mongodb.net/`

### Option B: AWS DocumentDB

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier clod-sarnet-db \
  --engine docdb \
  --master-username admin \
  --master-user-password YourSecurePassword123

# Create instance
aws docdb create-db-instance \
  --db-instance-identifier clod-sarnet-instance \
  --db-instance-class db.t3.medium \
  --engine docdb \
  --db-cluster-identifier clod-sarnet-db
```

---

## Step 2: Configure AWS Resources

### 2.1 Create S3 Bucket for File Storage

```bash
# Create S3 bucket
aws s3 mb s3://clod-sarnet-files --region us-east-1

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket clod-sarnet-files \
  --versioning-configuration Status=Enabled

# Block public access (important for security)
aws s3api put-public-access-block \
  --bucket clod-sarnet-files \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 2.2 Create IAM User for Backend

```bash
# Create IAM user
aws iam create-user --user-name clod-sarnet-backend

# Attach policies for Bedrock and S3
aws iam attach-user-policy \
  --user-name clod-sarnet-backend \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create custom policy for Bedrock
cat > bedrock-policy.json <<EOF
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
  --user-name clod-sarnet-backend \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json

# Create access keys
aws iam create-access-key --user-name clod-sarnet-backend
```

**Save the Access Key ID and Secret Access Key!**

### 2.3 Request Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Request access to:
   - Claude Sonnet 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
   - Claude 3.5 Sonnet (fallback)
   - Mistral Large (optional)
3. Wait for approval (usually instant for Claude 3.5, may take time for Claude 4)

---

## Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```bash
# Required AWS settings
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# MongoDB (use your Atlas or DocumentDB URL)
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=clod_sarnet

# Storage
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=clod-sarnet-files
S3_REGION=us-east-1

# Bedrock Model
BEDROCK_CLAUDE_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0

# Optional: For embeddings (RAG)
EMERGENT_LLM_KEY=your_anthropic_key_for_embeddings

# Optional: Web search
TAVILY_API_KEY=your_tavily_key
```

---

## Step 4: Deploy Backend to AWS

### Option A: Deploy to ECS Fargate (Recommended)

#### 4.1 Create ECR Repository

```bash
# Create repository
aws ecr create-repository --repository-name clod-sarnet-backend --region us-east-1

# Get repository URI (save this)
aws ecr describe-repositories --repository-names clod-sarnet-backend --query 'repositories[0].repositoryUri' --output text
```

#### 4.2 Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build backend image
cd backend
docker build -t clod-sarnet-backend .

# Tag image
docker tag clod-sarnet-backend:latest <YOUR_ECR_URI>:latest

# Push to ECR
docker push <YOUR_ECR_URI>:latest
```

#### 4.3 Create ECS Cluster and Service

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name clod-sarnet-cluster

# Create task execution role (if not exists)
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://ecs-trust-policy.json

# Attach policy
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

Create `task-definition.json`:

```json
{
  "family": "clod-sarnet-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "MONGO_URL", "value": "YOUR_MONGO_URL"},
        {"name": "DB_NAME", "value": "clod_sarnet"},
        {"name": "AWS_REGION", "value": "us-east-1"},
        {"name": "STORAGE_PROVIDER", "value": "s3"},
        {"name": "S3_BUCKET_NAME", "value": "clod-sarnet-files"},
        {"name": "BEDROCK_CLAUDE_MODEL_ID", "value": "us.anthropic.claude-sonnet-4-20250514-v1:0"}
      ],
      "secrets": [
        {"name": "AWS_ACCESS_KEY_ID", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/clod-sarnet",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "backend"
        }
      }
    }
  ]
}
```

Register task and create service:

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster clod-sarnet-cluster \
  --service-name clod-sarnet-backend \
  --task-definition clod-sarnet-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option B: Deploy to EC2 (Simpler for Testing)

```bash
# Launch EC2 instance (Amazon Linux 2023)
aws ec2 run-instances \
  --image-id ami-0c02fb55cc7f4441e \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=clod-sarnet-backend}]'

# SSH into instance
ssh -i your-key.pem ec2-user@<PUBLIC_IP>

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Clone your repo or copy files
git clone https://github.com/your-repo/clod-sarnet.git
cd clod-sarnet

# Create .env file with your configuration
nano .env

# Run with docker-compose
sudo docker-compose up -d backend
```

---

## Step 5: Deploy Frontend

### Option A: Deploy to S3 + CloudFront (Recommended)

#### 5.1 Build Frontend

```bash
cd frontend

# Set backend URL to your ECS/EC2 backend URL
export REACT_APP_BACKEND_URL=http://your-backend-alb.amazonaws.com

# Install dependencies
yarn install

# Build
yarn build
```

#### 5.2 Create S3 Bucket for Frontend

```bash
# Create bucket for frontend
aws s3 mb s3://clod-sarnet-frontend --region us-east-1

# Enable static website hosting
aws s3 website s3://clod-sarnet-frontend --index-document index.html --error-document index.html

# Upload build files
cd build
aws s3 sync . s3://clod-sarnet-frontend --acl public-read
```

#### 5.3 Create CloudFront Distribution

```bash
# Create CloudFront distribution (use AWS Console for easier setup)
# Origin: clod-sarnet-frontend.s3.amazonaws.com
# Default root object: index.html
# Enable HTTPS
```

### Option B: Deploy Frontend to EC2 with Nginx

```bash
# On your EC2 instance
docker-compose up -d frontend

# Or manually with nginx
sudo yum install nginx -y
sudo cp -r frontend/build/* /usr/share/nginx/html/
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 6: Configure Application

1. **Access your frontend** at CloudFront URL or EC2 public IP
2. **Create your first project**
3. **Configure LLM provider**:
   - Go to project settings
   - Select "bedrock-claude" as LLM provider
4. **Upload assessment materials** (PDFs, DOCX, etc.)
5. **Start chatting with Claude!**

---

## Step 7: Security Hardening (Production)

### 7.1 Use AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name clod-sarnet/aws-credentials \
  --secret-string '{"AWS_ACCESS_KEY_ID":"xxx","AWS_SECRET_ACCESS_KEY":"xxx"}'

# Update ECS task definition to use secrets (see task-definition.json above)
```

### 7.2 Set Up Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name clod-sarnet-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name clod-sarnet-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-xxx \
  --health-check-path /api

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>
```

### 7.3 Set Up HTTPS with ACM

```bash
# Request certificate
aws acm request-certificate \
  --domain-name clod-sarnet.yourdomain.com \
  --validation-method DNS

# Follow DNS validation steps
```

### 7.4 Configure WAF (Optional)

```bash
# Create Web ACL for CloudFront/ALB
aws wafv2 create-web-acl \
  --name clod-sarnet-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

---

## Testing Your Deployment

### Backend Health Check

```bash
curl http://your-backend-url:8000/api
# Should return: {"message": "Assessment Editor API", "version": "1.0.0"}
```

### Test Bedrock Connection

```bash
# Create a test project and conversation
# Upload a test document
# Send a message asking about the document
# Verify Claude responds using Bedrock
```

---

## Monitoring and Logging

### CloudWatch Logs

```bash
# View ECS logs
aws logs tail /ecs/clod-sarnet --follow

# View specific stream
aws logs get-log-events --log-group-name /ecs/clod-sarnet --log-stream-name backend/backend/xxx
```

### Cost Monitoring

- Monitor Bedrock usage in AWS Cost Explorer
- Set up CloudWatch billing alarms
- S3 storage costs (minimal for documents)

---

## Troubleshooting

### Backend Won't Start
- Check CloudWatch logs for errors
- Verify environment variables in ECS task definition
- Ensure security groups allow traffic on port 8000
- Verify IAM permissions for Bedrock and S3

### Bedrock Errors
- Verify model access is approved in AWS Console
- Check IAM permissions for `bedrock:InvokeModel`
- Ensure correct model ID in environment variables
- Check AWS region supports your chosen model

### Frontend Can't Connect to Backend
- Verify `REACT_APP_BACKEND_URL` was set during build
- Check CORS settings in backend (CORS_ORIGINS env var)
- Ensure security groups allow traffic between frontend and backend
- Check ALB health checks are passing

### File Upload Issues
- Verify S3 bucket permissions
- Check IAM user has S3 write access
- Ensure bucket name matches environment variable
- Check CloudWatch logs for S3 errors

---

## Automated Deployment Scripts

See `scripts/` directory for automation:

- `scripts/deploy-backend.sh` - Automated backend deployment
- `scripts/deploy-frontend.sh` - Automated frontend deployment
- `scripts/setup-aws.sh` - One-time AWS resource setup

---

## Cost Estimates

**Monthly costs for moderate usage:**
- ECS Fargate (1 task): ~$30/month
- MongoDB Atlas (M10): ~$57/month (or DocumentDB ~$200/month)
- S3 Storage (10GB): ~$0.23/month
- CloudFront: ~$1-5/month
- Bedrock (Claude): Pay per token (~$3-15 per 1M input tokens)
- **Total: ~$90-110/month** (excluding Bedrock usage)

**For low usage, EC2 t3.medium is cheaper than Fargate (~$30/month)**

---

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, AWS CodePipeline)
2. Configure automated backups for MongoDB
3. Set up monitoring and alerting (CloudWatch, PagerDuty)
4. Implement user authentication (if needed)
5. Set up staging environment

---

## Support

For issues or questions:
- Check CloudWatch logs
- Review AWS Bedrock documentation
- Check MongoDB Atlas status

---

**Congratulations! Clod Sarnet is now running entirely on your AWS infrastructure!** 🎉
