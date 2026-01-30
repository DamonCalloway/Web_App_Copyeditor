# Clod Sarnit Deployment Guide

This guide covers deploying Clod Sarnit (Claude.ai clone) to various environments.

## Quick Start (Local Docker)

1. **Set environment variables** in a `.env` file at the project root:

```bash
# Required: At least one LLM provider
ANTHROPIC_API_KEY=your_anthropic_key          # For Anthropic Direct API
EMERGENT_LLM_KEY=your_emergent_key            # For GPT-5, Gemini

# Optional: AWS Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Optional: Web Search (Bedrock)
TAVILY_API_KEY=your_tavily_key
```

2. **Build and run:**

```bash
docker-compose up -d
```

3. **Access the app:** http://localhost

## Environment Variables Reference

### Database
| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://mongodb:27017` |
| `DB_NAME` | Database name | `clod_sarnit` |

### LLM Providers
| Variable | Description | Required? |
|----------|-------------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic Direct API key | One of these |
| `EMERGENT_LLM_KEY` | Emergent Universal Key (GPT-5, Gemini) | One of these |
| `AWS_ACCESS_KEY_ID` | AWS credentials for Bedrock | Optional |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for Bedrock | Optional |
| `AWS_REGION` | AWS region | `us-east-1` |

### Bedrock Model IDs (Optional)
| Variable | Default |
|----------|---------|
| `BEDROCK_CLAUDE_MODEL_ID` | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `BEDROCK_MISTRAL_MODEL_ID` | `mistral.mistral-large-2407-v1:0` |
| `BEDROCK_LLAMA3_MODEL_ID` | `meta.llama3-1-70b-instruct-v1:0` |
| `BEDROCK_QWEN3_MODEL_ID` | `qwen.qwen3-vl-235b-a22b` |
| `BEDROCK_TITAN_MODEL_ID` | `amazon.titan-text-premier-v1:0` |

### Web Search
| Variable | Description |
|----------|-------------|
| `TAVILY_API_KEY` | For Bedrock web search feature |

### Storage
| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | `local` or `s3` | `local` |
| `LOCAL_STORAGE_PATH` | Path for local file storage | `/app/uploads` |
| `S3_BUCKET_NAME` | S3 bucket for file storage | - |
| `S3_ACCESS_KEY` | S3 access key | - |
| `S3_SECRET_KEY` | S3 secret key | - |
| `S3_REGION` | S3 region | `us-east-1` |

---

## AWS Deployment Options

### Option 1: AWS ECS with Fargate

1. **Push to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker build -t clod-sarnit .
docker tag clod-sarnit:latest <account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest
```

2. **Create ECS Task Definition** with the environment variables from above.

3. **Use:**
   - MongoDB Atlas or DocumentDB for database
   - S3 for file storage (`STORAGE_PROVIDER=s3`)
   - ALB for load balancing

### Option 2: AWS Elastic Beanstalk

1. Create a `Dockerrun.aws.json`:
```json
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "<account>.dkr.ecr.us-east-1.amazonaws.com/clod-sarnit:latest",
    "Update": "true"
  },
  "Ports": [{"ContainerPort": 80}]
}
```

2. Deploy via EB CLI or Console.

### Option 3: EC2 with Docker

1. Launch an EC2 instance (t3.medium or larger recommended)
2. Install Docker and Docker Compose
3. Copy files and run `docker-compose up -d`

---

## S3 Storage Configuration

To use S3 for file storage instead of local:

1. Create an S3 bucket
2. Set environment variables:
```bash
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY=your_access_key  # Or use IAM roles
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1
```

3. The app will automatically store uploaded files in S3.

---

## Monitoring

- **Health Check:** `GET /health` returns `200 OK`
- **API Health:** `GET /api/config/features` returns feature configuration
- **Logs:** Available in `/var/log/supervisor/` inside the container

---

## Security Recommendations

1. **Use HTTPS** - Add an SSL certificate via ALB, CloudFront, or nginx
2. **Rotate API keys** regularly
3. **Use IAM roles** instead of access keys when possible
4. **Enable VPC** for database and storage
5. **Set up CloudWatch** for monitoring and alerting
