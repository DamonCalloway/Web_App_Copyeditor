# Clod Sarnit - AWS Deployment Guide

Complete guide for deploying Clod Sarnit to AWS with S3 storage and Bedrock integration.

## Architecture Overview

```
                    ┌─────────────────┐
                    │   CloudFront    │
                    │   (optional)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │       ALB       │
                    │  (port 80/443)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐     ...    ┌───────▼────────┐
     │   ECS Task 1   │            │   ECS Task N   │
     │  (App + Nginx) │            │  (App + Nginx) │
     └────────┬───────┘            └───────┬────────┘
              │                            │
              └──────────────┬─────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│  MongoDB Atlas │   │   Amazon S3     │   │   Bedrock   │
│  or DocumentDB │   │  (file storage) │   │   (LLMs)    │
└───────────────┘   └─────────────────┘   └─────────────┘
```

---

## Prerequisites

1. **AWS Account** with access to:
   - Bedrock (Claude, Mistral, Llama, etc.)
   - S3
   - ECS/Fargate (or EC2)
   - ECR (optional, for container registry)

2. **Enable Bedrock Model Access:**
   - Go to AWS Console → Bedrock → Model access
   - Enable the models you want to use:
     - Claude 3.5/4 Sonnet (Anthropic)
     - Llama 3.1 70B (Meta)
     - Qwen3 VL 235B (Alibaba)
     - Titan Text Premier (Amazon)

3. **MongoDB Database:**
   - [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended) - Free tier available
   - OR AWS DocumentDB (MongoDB-compatible)

---

## Step 1: Create S3 Bucket and Access Point

### Option A: Using S3 Access Point (Recommended)

Access Points provide simplified access management for S3 buckets.

```bash
# Create bucket
aws s3 mb s3://your-clod-sarnit-bucket --region us-east-1

# Create access point
aws s3control create-access-point \
  --account-id YOUR_ACCOUNT_ID \
  --name clod-sarnit-access-point \
  --bucket your-clod-sarnit-bucket

# The access point alias will be generated automatically
# Format: <name>-<account-id>-s3alias
# Example: clod-sarnit-access-p-kghicfr1mec5pdg9u4hi1inmmzqphuse2b-s3alias
```

Use the **access point alias** as your `S3_BUCKET_NAME`:
```bash
S3_BUCKET_NAME=clod-sarnit-access-p-kghicfr1mec5pdg9u4hi1inmmzqphuse2b-s3alias
```

### Option B: Direct Bucket Access

```bash
# Create bucket for file storage
aws s3 mb s3://your-clod-sarnit-files --region us-east-1

# Configure CORS (required for file downloads)
aws s3api put-bucket-cors --bucket your-clod-sarnit-files --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'
```

---

## Step 2: Create IAM Role/Credentials

### Option A: IAM User (for EC2/local testing)

```bash
# Create IAM user
aws iam create-user --user-name clod-sarnit-app

# Attach required policies
aws iam attach-user-policy --user-name clod-sarnit-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam attach-user-policy --user-name clod-sarnit-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access keys
aws iam create-access-key --user-name clod-sarnit-app
```

### Option B: IAM Role (for ECS/Fargate - recommended)

Create a task execution role with these permissions:
- `AmazonBedrockFullAccess`
- `AmazonS3FullAccess`
- `AmazonECSTaskExecutionRolePolicy`

---

## Step 3: Set Up MongoDB

### MongoDB Atlas (Recommended)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Set up a database user
3. Whitelist your IP/VPC
4. Get the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/clod_sarnit?retryWrites=true&w=majority
   ```

### AWS DocumentDB

```bash
# Create DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier clod-sarnit-db \
  --engine docdb \
  --master-username admin \
  --master-user-password <your-password>
```

---

## Step 4: Create Environment File

Create `.env.aws` with your configuration:

```bash
# Database
MONGO_URL=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/clod_sarnit
DB_NAME=clod_sarnit

# S3 Storage (using Access Point alias)
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=clod-sarnit-access-p-kghicfr1mec5pdg9u4hi1inmmzqphuse2b-s3alias
S3_REGION=us-east-1
# If using IAM roles (ECS), leave these empty
S3_ACCESS_KEY=
S3_SECRET_KEY=

# AWS Bedrock
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1

# Bedrock Model IDs (use cross-region inference profiles for Claude)
BEDROCK_CLAUDE_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_LLAMA3_MODEL_ID=meta.llama3-1-70b-instruct-v1:0
BEDROCK_QWEN3_MODEL_ID=qwen.qwen3-vl-235b-a22b
BEDROCK_TITAN_MODEL_ID=amazon.titan-text-premier-v1:0

# Optional: Direct Anthropic API (for native web search)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional: Tavily (for Bedrock web search)
TAVILY_API_KEY=tvly-xxxxx

# CORS (your domain)
CORS_ORIGINS=https://your-domain.com
```

---

## Step 5: Deploy

### Option A: EC2 with Docker Compose (Simplest)

```bash
# 1. Launch EC2 instance (t3.medium or larger)
# 2. SSH into instance and install Docker
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Clone your code or copy files
# 4. Create .env file with your config
# 5. Run
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d
```

### Option B: ECS with Fargate (Production)

1. **Push to ECR:**
```bash
# Create repository
aws ecr create-repository --repository-name clod-sarnit

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t clod-sarnit .
docker tag clod-sarnit:latest <account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest
```

2. **Create ECS Task Definition:**
```json
{
  "family": "clod-sarnit",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<account>:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::<account>:role/clod-sarnit-task-role",
  "containerDefinitions": [
    {
      "name": "clod-sarnit",
      "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest",
      "portMappings": [{"containerPort": 80, "protocol": "tcp"}],
      "environment": [
        {"name": "MONGO_URL", "value": "mongodb+srv://..."},
        {"name": "STORAGE_PROVIDER", "value": "s3"},
        {"name": "S3_BUCKET_NAME", "value": "your-bucket"},
        {"name": "AWS_REGION", "value": "us-east-1"}
      ],
      "secrets": [
        {"name": "AWS_ACCESS_KEY_ID", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "AWS_SECRET_ACCESS_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/clod-sarnit",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

3. **Create ECS Service with ALB:**
   - Create Application Load Balancer
   - Create Target Group (port 80, health check: `/health`)
   - Create ECS Service pointing to the task definition

---

## Step 6: Configure SSL/HTTPS

### Option A: AWS Certificate Manager + ALB
1. Request certificate in ACM for your domain
2. Add HTTPS listener to ALB (port 443)
3. Redirect HTTP to HTTPS

### Option B: CloudFront
1. Create CloudFront distribution
2. Origin: Your ALB or EC2
3. Enable HTTPS with ACM certificate

---

## Verification

1. **Health Check:** `curl https://your-domain.com/health`
2. **API Check:** `curl https://your-domain.com/api/config/features`
3. **Storage Check:** Upload a file and verify it appears in S3

---

## Troubleshooting

### Bedrock "Model not found" errors
- Verify model access is enabled in Bedrock console
- Use cross-region inference profiles for Claude: `us.anthropic.claude-...`
- Check your region supports the model

### S3 "Access Denied" errors
- Verify IAM permissions include S3 access
- Check bucket policy allows your role/user
- Verify CORS is configured on the bucket

### MongoDB connection issues
- Whitelist ECS/EC2 IP in MongoDB Atlas
- Check security groups allow outbound 27017
- Verify connection string format

---

## Cost Optimization

1. **Use Fargate Spot** for non-critical workloads (70% savings)
2. **Enable S3 Intelligent Tiering** for file storage
3. **Use Reserved Capacity** for consistent workloads
4. **Monitor Bedrock usage** - Claude is priced per token

---

## Security Best Practices

1. **Use Secrets Manager** for API keys instead of environment variables
2. **Enable VPC** for ECS tasks
3. **Use IAM roles** instead of access keys where possible
4. **Enable CloudTrail** for audit logging
5. **Rotate credentials** regularly
6. **Set up WAF** on ALB for protection
