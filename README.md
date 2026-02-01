# Clod Sarnit

A Claude.ai clone built with React, FastAPI, and MongoDB. Features multiple LLM providers including AWS Bedrock, project-based knowledge bases with RAG, and a familiar chat interface.

## Features

- 🤖 **Multiple LLM Providers:**
  - AWS Bedrock: Claude 4.5, Llama 3, Qwen3 VL, Titan
  - Anthropic Direct API (with Extended Thinking & Web Search)
  - OpenAI GPT-5 and Google Gemini (via Emergent LLM Key)

- 📁 **Project-Based Knowledge Base:**
  - Upload reference documents (PDF, DOCX, TXT, MD, images)
  - RAG-powered context retrieval
  - Per-project instructions and memory

- 💬 **Claude-like Chat Interface:**
  - File attachments in chat
  - Syntax-highlighted code blocks
  - Light/dark theme
  - Thinking process visualization

- 🔧 **Configurable:**
  - Temperature and Top P settings
  - LLM provider selection per conversation
  - S3 or local file storage

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone <your-repo>
cd clod-sarnit

# 2. Create .env file with at least one LLM provider key
cp .env.example .env
# Edit .env with your API keys

# 3. Start with Docker Compose
docker-compose up -d

# 4. Open http://localhost
```

## AWS Deployment

See [deployment/AWS_DEPLOYMENT.md](deployment/AWS_DEPLOYMENT.md) for complete AWS deployment instructions including:

- S3 storage configuration
- AWS Bedrock setup
- ECS/Fargate deployment
- MongoDB Atlas integration

### Quick AWS Setup

```bash
# 1. Configure AWS credentials
aws configure

# 2. Enable Bedrock models in AWS Console
# AWS Console → Bedrock → Model access → Enable Claude, Llama, etc.

# 3. Create S3 bucket for file storage
aws s3 mb s3://your-bucket-name --region us-east-1

# 4. Create .env.aws file
cp .env.aws.example .env.aws
# Edit with your AWS credentials and MongoDB connection string

# 5. Deploy
docker-compose -f docker-compose.aws.yml --env-file .env.aws up -d
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | MongoDB connection string | Yes |
| `AWS_ACCESS_KEY_ID` | AWS credentials for Bedrock | For Bedrock |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for Bedrock | For Bedrock |
| `ANTHROPIC_API_KEY` | Anthropic Direct API key | Optional |
| `STORAGE_PROVIDER` | `local` or `s3` | No (default: local) |
| `S3_BUCKET_NAME` | S3 bucket for files | For S3 |

See [.env.aws.example](.env.aws.example) for full configuration options.

## Tech Stack

- **Frontend:** React 19, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Motor (async MongoDB)
- **Database:** MongoDB
- **AI:** AWS Bedrock, Anthropic API, Emergent LLM Key
- **RAG:** sentence-transformers embeddings
- **Deployment:** Docker, Nginx, Supervisor

## Project Structure

```
├── backend/
│   ├── server.py        # FastAPI application
│   ├── rag.py           # RAG implementation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages
│   │   └── components/  # UI components
│   └── package.json
├── deployment/
│   ├── AWS_DEPLOYMENT.md
│   ├── nginx.conf
│   └── supervisord.conf
├── Dockerfile
├── docker-compose.yml      # Local development
└── docker-compose.aws.yml  # AWS production
```

## License

MIT
