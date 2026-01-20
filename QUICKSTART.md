# Clod Sarnet - Quick Start Guide

Get Clod Sarnet running on AWS in 30 minutes!

## 🚀 Express Deployment (Fastest Path)

### Prerequisites

- AWS Account with Bedrock access
- AWS CLI configured (`aws configure`)
- MongoDB Atlas account (free tier works)
- Docker installed locally

### Step 1: Clone and Configure (5 min)

```bash
# Clone repository
git clone <your-repo-url>
cd Web_App_Copyeditor

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Minimum required in .env:**
```bash
# MongoDB Atlas URL (sign up at mongodb.com/cloud/atlas)
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=clod_sarnet

# AWS Credentials (from IAM user with Bedrock + S3 access)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# S3 bucket for files (will be created by setup script)
S3_BUCKET_NAME=clod-sarnet-files-yourname
STORAGE_PROVIDER=s3

# Bedrock model
BEDROCK_CLAUDE_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0

# CORS (update after you know your frontend URL)
CORS_ORIGINS=http://localhost:3000,https://your-frontend-url.com
```

### Step 2: Set Up AWS Resources (10 min)

```bash
# Run automated setup
./scripts/setup-aws-resources.sh
```

This creates:
- S3 bucket for file storage
- IAM user with Bedrock + S3 permissions
- ECS cluster
- CloudWatch log group

**Save the AWS credentials it outputs!**

### Step 3: Request Bedrock Access (5 min)

1. Go to AWS Console → Bedrock → Model access
2. Click "Modify model access"
3. Check boxes for:
   - Claude Sonnet 4 (or Claude 3.5 Sonnet if 4 not available)
4. Submit request (usually instant approval)

### Step 4: Deploy Backend (5 min)

**Option A: Deploy to ECS Fargate (Production)**

```bash
# Deploy to ECR and ECS
./scripts/deploy-backend-ecr.sh

# Then create ECS service (see DEPLOYMENT.md for details)
# Or use EC2 for simpler setup
```

**Option B: Deploy to EC2 (Easier for testing)**

```bash
# Launch EC2 instance (t3.medium)
aws ec2 run-instances \
  --image-id ami-0c02fb55cc7f4441e \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxx

# SSH and run
ssh -i your-key.pem ec2-user@<IP>
sudo yum install -y docker git
sudo systemctl start docker
git clone <your-repo>
cd Web_App_Copyeditor

# Create .env with your settings
nano .env

# Run backend
sudo docker-compose up -d backend
```

Get your backend URL: `http://<EC2-PUBLIC-IP>:8000`

### Step 5: Deploy Frontend (5 min)

```bash
# Set your backend URL
export REACT_APP_BACKEND_URL=http://<YOUR-BACKEND-URL>:8000

# Deploy to S3
./scripts/deploy-frontend-s3.sh
```

Or for EC2:
```bash
# On same EC2 instance
cd frontend
REACT_APP_BACKEND_URL=http://<EC2-IP>:8000 yarn build
sudo yum install nginx -y
sudo cp -r build/* /usr/share/nginx/html/
sudo systemctl start nginx
```

Frontend URL: `http://<YOUR-S3-BUCKET>.s3-website-us-east-1.amazonaws.com`

### Step 6: Test! (2 min)

```bash
# Test backend
./scripts/test-deployment.sh http://<YOUR-BACKEND-URL>:8000

# Test frontend in browser
# Open http://<YOUR-FRONTEND-URL>
```

---

## ✅ What to Test

1. **Create a project**
   - Click "New Project"
   - Name: "Test Assessment"
   - LLM Provider: "bedrock-claude"

2. **Upload a document**
   - Upload a PDF or DOCX file
   - Wait for processing (check "indexed" status)

3. **Start a conversation**
   - Create new conversation
   - Ask: "What is this document about?"
   - Claude should respond using Bedrock!

---

## 🎯 Production Checklist

Before going live:

- [ ] Set up HTTPS with ALB + ACM certificate
- [ ] Create CloudFront distribution for frontend
- [ ] Configure custom domain with Route53
- [ ] Enable CloudWatch monitoring
- [ ] Set up billing alerts
- [ ] Use AWS Secrets Manager for credentials
- [ ] Configure VPC and security groups properly
- [ ] Set up automated backups for MongoDB
- [ ] Test disaster recovery procedures

See `DEPLOYMENT.md` for full production setup.

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs clod-sarnet-backend

# Or on ECS
aws logs tail /ecs/clod-sarnet --follow
```

### "Bedrock access denied"
- Verify model access approved in Console
- Check IAM permissions include `bedrock:InvokeModel`
- Verify correct AWS region

### Frontend can't reach backend
- Update `CORS_ORIGINS` in backend .env
- Rebuild frontend with correct `REACT_APP_BACKEND_URL`
- Check security groups allow traffic

### Files not uploading
- Verify S3 bucket exists and is accessible
- Check IAM permissions for S3
- Look for errors in CloudWatch logs

---

## 💰 Cost Estimate

**Monthly costs for light usage:**
- EC2 t3.medium (backend): ~$30
- MongoDB Atlas M0 (free): $0
- S3 storage (1GB): ~$0.03
- CloudFront: ~$1
- Bedrock (pay per use): ~$0.15 per 1000 requests

**Total: ~$31-35/month** for development/testing

---

## 📚 Next Steps

- Read full `DEPLOYMENT.md` for production setup
- Configure CI/CD pipeline
- Set up monitoring and alerts
- Customize UI branding
- Add team members

---

## 🤝 Support

Issues? Check:
1. CloudWatch logs for errors
2. AWS Bedrock console for model access
3. MongoDB Atlas connection status
4. IAM permissions for your user

**Enjoy using Clod Sarnet!** 🎉
