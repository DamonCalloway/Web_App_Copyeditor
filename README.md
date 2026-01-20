# Clod Sarnet - AI-Powered Copyediting Assessment Tool

A Claude Projects-like web application for copyediting and assessing documents using AI. Built with React, FastAPI, and powered by AWS Bedrock (Claude) or Anthropic API.

## ✨ Features

- **📁 Project Management** - Organize documents and conversations by project
- **📄 Document Upload** - Support for PDF, DOCX, TXT, MD, and image files
- **🤖 Multiple LLM Providers**
  - AWS Bedrock (Claude Sonnet 4, Claude 3.5, Mistral)
  - Anthropic Direct API
- **🧠 RAG-Powered Knowledge Base** - Semantic search across uploaded documents
- **💭 Extended Thinking** - Enable Claude's extended thinking for complex tasks
- **🔍 Web Search** - Integrate web search into conversations (via Tavily)
- **💾 Flexible Storage** - Local file storage or Amazon S3
- **🎨 Modern UI** - Built with React, shadcn/ui, and Tailwind CSS
- **🔐 Secure** - Runs entirely on your AWS infrastructure

## 🚀 Quick Start

See **[QUICKSTART.md](QUICKSTART.md)** for fastest deployment path (30 minutes).

### Local Development

```bash
# 1. Install dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && yarn install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start MongoDB (via Docker)
docker-compose up mongodb

# 4. Start backend
cd backend
uvicorn server:app --reload --port 8000

# 5. Start frontend (in new terminal)
cd frontend
REACT_APP_BACKEND_URL=http://localhost:8000 yarn start
```

Open http://localhost:3000

## 📦 Deployment

### AWS Deployment (Recommended)

Full deployment guide: **[DEPLOYMENT.md](DEPLOYMENT.md)**

Quick deploy:
```bash
# 1. Set up AWS resources
./scripts/setup-aws-resources.sh

# 2. Deploy backend to ECS
./scripts/deploy-backend-ecr.sh

# 3. Deploy frontend to S3
REACT_APP_BACKEND_URL=<your-backend> ./scripts/deploy-frontend-s3.sh

# 4. Test deployment
./scripts/test-deployment.sh http://<your-backend>
```

### Docker Compose (Local Testing)

```bash
# Configure .env file
cp .env.example .env

# Start all services
docker-compose up -d

# Access app
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# MongoDB: mongodb://admin:password123@localhost:27017
```

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │ (S3 + CloudFront)
│  (Port 3000)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FastAPI Backend│ (ECS Fargate / EC2)
│  (Port 8000)    │
└────────┬────────┘
         │
    ┌────┴──────────────────────┐
    ↓                            ↓
┌─────────┐              ┌──────────────┐
│ MongoDB │              │  AWS Bedrock │
│  Atlas  │              │   (Claude)   │
└─────────┘              └──────────────┘
                                 ↓
                         ┌──────────────┐
                         │  Amazon S3   │
                         │ (File Store) │
                         └──────────────┘
```

## 🛠️ Technology Stack

**Frontend:**
- React 19
- React Router
- shadcn/ui components
- Tailwind CSS
- Axios
- React Markdown

**Backend:**
- FastAPI
- Motor (async MongoDB)
- LiteLLM (multi-provider LLM support)
- boto3 (AWS SDK)
- PyPDF2, python-docx (document processing)
- Custom RAG implementation

**Infrastructure:**
- AWS Bedrock (LLM)
- Amazon S3 (file storage)
- MongoDB Atlas (database)
- AWS ECS Fargate (backend hosting)
- CloudFront (frontend CDN)

## 📋 Requirements

**Backend:**
- Python 3.11+
- MongoDB 7.0+
- AWS account with Bedrock access

**Frontend:**
- Node.js 18+
- Yarn package manager

## ⚙️ Configuration

Key environment variables (see `.env.example`):

```bash
# Database
MONGO_URL=mongodb+srv://...
DB_NAME=clod_sarnet

# AWS (for Bedrock & S3)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Storage
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=clod-sarnet-files

# LLM
BEDROCK_CLAUDE_MODEL_ID=us.anthropic.claude-sonnet-4-20250514-v1:0

# Optional: Direct Anthropic API
ANTHROPIC_API_KEY=...

# Optional: Web search
TAVILY_API_KEY=...
```

## 📖 Usage

1. **Create a Project**
   - Click "New Project"
   - Add project name, description, and custom instructions
   - Select LLM provider (bedrock-claude, bedrock-mistral, or anthropic)

2. **Upload Documents**
   - Navigate to project
   - Upload PDFs, DOCX, or text files
   - Documents are automatically indexed for RAG

3. **Start Conversations**
   - Create new conversation in project
   - Ask questions about uploaded documents
   - Enable extended thinking for complex reasoning
   - Enable web search for current information

4. **Advanced Features**
   - Star important projects/conversations
   - Archive completed work
   - Download files
   - Re-index knowledge base

## 🔒 Security

- All data stored in your AWS account
- Files in private S3 bucket
- MongoDB connection secured with TLS
- No data sent to third parties (except LLM providers)
- IAM policies follow least-privilege principle

## 💰 Cost Estimation

**Monthly costs (light usage):**
- EC2 t3.medium: ~$30
- MongoDB Atlas M10: ~$57
- S3 storage (10GB): ~$0.23
- CloudFront: ~$1-5
- Bedrock usage: ~$3-15 per 1M tokens

**Total: ~$90-110/month** (excluding Bedrock usage)

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Test deployment
./scripts/test-deployment.sh http://your-backend-url
```

## 📝 License

This project is for internal use. All rights reserved.

## 🤝 Contributing

This is a private project. For issues or improvements, contact the development team.

## 🆘 Support

**Common Issues:**

- **Bedrock Access Denied**: Request model access in AWS Console → Bedrock → Model access
- **MongoDB Connection Failed**: Check connection string and network access in MongoDB Atlas
- **Files Not Uploading**: Verify S3 bucket permissions and IAM policy
- **CORS Errors**: Update `CORS_ORIGINS` in backend .env

**Logs:**
```bash
# Local development
docker logs clod-sarnet-backend

# AWS ECS
aws logs tail /ecs/clod-sarnet --follow

# Check specific error
aws logs filter-pattern ERROR /ecs/clod-sarnet
```

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get running in 30 minutes
- [Deployment Guide](DEPLOYMENT.md) - Full AWS deployment instructions
- [API Documentation](http://localhost:8000/docs) - FastAPI auto-generated docs

## 🎯 Roadmap

- [ ] User authentication and authorization
- [ ] Team collaboration features
- [ ] Advanced document comparison
- [ ] Export conversations to PDF
- [ ] Custom model fine-tuning
- [ ] Integration with company tools

---

**Built with ❤️ for better copyediting workflows**
