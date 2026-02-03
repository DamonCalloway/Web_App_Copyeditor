# Assessment Editor - PRD (Product Requirements Document)

## Original Problem Statement
Create a clone of Claude Sonnet 4.5 Projects that allows editing of assessment materials using the same style guides, master prompt, grammar/usage guides, and other reference documents stored in a knowledge base (so that the user does not have to attach all those docs to a chat message every single time they edit a document). Key requirement: File storage must be separable/configurable - able to use company's S3 for security reasons.

## User Personas
- **Assessment Editors**: Content reviewers who need AI assistance with consistent style guides
- **Team Leads**: Manage projects and configure settings for team adoption

## Core Requirements (Static)
1. **Knowledge Base Management**
   - Upload and store reference documents (PDF, TXT, MD, DOCX, PNG, JPG, BMP)
   - Automatic text extraction and indexing
   - RAG-powered retrieval for relevant context

2. **Project Organization**
   - Create/edit/delete/archive projects
   - Project-specific instructions (system prompt)
   - Project memory (persistent context)
   - File management per project

3. **AI Chat Integration**
   - Multiple LLM providers supported:
     - Anthropic Claude Sonnet 4.5 (Direct API with Extended Thinking & Web Search)
     - AWS Bedrock Claude (with Extended Thinking & Web Search via Tavily)
     - AWS Bedrock Mistral Large
     - AWS Bedrock Llama 3 (70B)
     - AWS Bedrock Qwen3 VL 235B
     - AWS Bedrock Amazon Titan Premier
     - OpenAI GPT-5 (via Emergent LLM Key)
     - Google Gemini 2.5 Pro (via Emergent LLM Key)
   - Chat history within projects
   - Toggle to include/exclude knowledge base
   - File attachments in chat
   - Adjustable Temperature and Top P settings

4. **Configurable Storage**
   - Local storage (default for development)
   - S3 storage (for enterprise deployment)
   - Easy switch via environment variables

5. **UI/UX**
   - Claude.ai-inspired design
   - Light/dark mode toggle
   - Sidebar navigation with recent chats

## What's Been Implemented

### Backend
- [x] FastAPI with MongoDB database
- [x] Projects CRUD API (create, read, update, archive, delete)
- [x] File upload/download with text extraction (PDF, DOCX, TXT, MD, images)
- [x] Conversations and messages API
- [x] Multi-provider AI chat:
  - [x] Anthropic Direct API with Extended Thinking & Web Search
  - [x] AWS Bedrock Claude via Converse API with Extended Thinking support
  - [x] AWS Bedrock Mistral via Converse API
- [x] Storage abstraction (LocalStorageProvider, S3StorageProvider)
- [x] RAG implementation with sentence-transformers embeddings
- [x] Chat with file attachments endpoint

### Frontend
- [x] Projects list page with search
- [x] Project detail page (Files, Conversations, Memory, Instructions)
- [x] Editable Memory and Instructions fields
- [x] File upload with indexing status
- [x] File viewer with markdown rendering
- [x] Chat interface with markdown rendering
- [x] Copy button on messages
- [x] Knowledge base toggle
- [x] Extended Thinking toggle (enabled for Anthropic Direct & Bedrock Claude)
- [x] Web Search toggle (Anthropic Direct only)
- [x] LLM Provider selector dropdown
- [x] Settings page with AWS Bedrock configuration
- [x] Dark/light theme toggle with proper text visibility
- [x] Sidebar with recent conversations
- [x] Chat file attachments (images, docs, etc.)
- [x] Auto-scroll to bottom with manual scroll button

### Bug Fixes (January 9, 2025)
- [x] Fixed: Chat message text invisible in light mode
- [x] Fixed: Mistral response corruption on long messages
- [x] Fixed: Bedrock Claude model identity confusion when switching providers
- [x] Added: Extended Thinking support for AWS Bedrock Claude Sonnet 4.5

### Bug Fixes (January 30, 2025)
- [x] Fixed: Knowledge Base document links now open in new browser tabs (target="_blank")
- [x] Fixed: Document viewer now has a permanently visible scrollbar for users without scroll wheels
- [x] Fixed: "Think" and "Web" toggle selections now persist per conversation across navigation and page reloads
- [x] Added: Temperature and Top P sliders in project settings dialog (accessible via gear icon in chat header)
- [x] Added: Multiple new LLM providers:
  - AWS Bedrock: Llama 3 (70B), Qwen3 VL 235B, Amazon Titan Premier
  - Emergent LLM Key: OpenAI GPT-5, Google Gemini 2.5 Pro
- [x] Added: Deployment files (Dockerfile, docker-compose.yml) for AWS self-hosting
- [x] Added: Image Crop Tool for Bedrock Claude - allows Claude to request cropped regions of attached images for detailed analysis (uses normalized 0-1 coordinates)

### UI Enhancements (February 1, 2025)
- [x] New File Attachment UI: Redesigned attachment cards with Claude.ai-inspired square card layout
  - 140x160px cards with file icon/preview at top
  - Filename displayed in middle (auto-truncated for long names)
  - File type badge at bottom (MD, PDF, PNG, etc.)
  - Remove button (X) appears on hover
  - Image files show actual thumbnail preview in input area
  - Same card design applied to both input area and sent messages

### UI Enhancements (February 3, 2025)
- [x] Widened chat message area from max-w-3xl (768px) to max-w-5xl (1024px) for better screen utilization
- [x] Widened input area to match the messages area width
- [x] Claude-style sidebar behavior: Opening the right panel (Project Info) auto-collapses the left sidebar
- [x] Auto-expand sidebar: Closing the right panel automatically restores the left sidebar to full width

### AWS Deployment Setup (February 1, 2025)
- [x] Fixed S3 storage provider to work with Knowledge Base file retrieval
- [x] Created `docker-compose.aws.yml` for production AWS deployment
- [x] Created comprehensive AWS deployment guide at `/app/deployment/AWS_DEPLOYMENT.md`
- [x] Created `.env.aws.example` template with all required variables
- [x] Updated README with deployment instructions
- [x] Tested S3 integration successfully with Access Point

### Multi-User Authentication (February 2, 2025)
- [x] Implemented email/password authentication with registration and login
- [x] Implemented Google OAuth via Emergent-managed Auth
- [x] Email domain allowlist - only @pearson.com emails can register
- [x] Per-user data isolation - each user only sees their own projects and conversations
- [x] Admin role system - admins see all LLM providers, regular users see only Bedrock
- [x] Session management with cookies (7-day expiry)
- [x] User menu in sidebar with profile info and logout
- [x] Protected routes redirect to login page
- [x] Backwards compatibility - existing data (no user_id) visible to all authenticated users

### Admin Mode & Provider Access Control (February 1, 2025)
- [x] Implemented secret URL parameter `?admin=true` to unlock premium providers
- [x] Admin-only providers (Anthropic Direct API, OpenAI GPT-5, Google Gemini) hidden from regular users
- [x] AWS Bedrock providers available to all users (company account)
- [x] Admin flag persists in localStorage after first use
- [x] Non-admin users automatically default to Bedrock Claude

### Extended Thinking Improvements (February 1, 2025)
- [x] Added warning dialog when enabling Extended Thinking on Bedrock Claude
- [x] Warning explains KB access limitation due to Bedrock API constraint
- [x] Fixed thinking content extraction for litellm (multiple location checks)
- [x] Changed priority: Extended Thinking now disables tools instead of vice versa

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core project/file/chat functionality
- [x] AI integration with multiple providers
- [x] Configurable storage

### P1 (High Priority)
- [x] S3 storage backend implementation (architecture exists, tested and fixed)
- [ ] Multi-user authentication

### P2 (Medium Priority)
- [ ] File preview (PDF viewer, image viewer)
- [ ] Bulk file upload with progress
- [ ] Search within files/conversations
- [ ] Document version history
- [ ] Syntax highlighting for code blocks

### P3 (Nice to Have)
- [ ] Export conversation to document
- [ ] Templates for common assessment types
- [ ] Analytics dashboard
- [ ] Thinking budget slider in project settings

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI Providers**: 
  - Anthropic Claude via litellm
  - AWS Bedrock via boto3 Converse API
- **RAG**: sentence-transformers for local embeddings
- **Storage**: Local filesystem (dev) / S3 (production)

## Environment Configuration
```
# Backend (.env)
STORAGE_PROVIDER=local  # or 's3'
S3_BUCKET_NAME=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1
ANTHROPIC_API_KEY=sk-ant-...  # For direct Anthropic API
AWS_ACCESS_KEY_ID=...         # For Bedrock
AWS_SECRET_ACCESS_KEY=...     # For Bedrock
AWS_REGION=us-east-1
BEDROCK_CLAUDE_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0  # Claude Sonnet 4.5 (cross-region inference profile)
BEDROCK_MISTRAL_MODEL_ID=mistral.mistral-large-3-675b-instruct
```

## Extended Thinking Notes
- **Supported Models**: Claude 3.7 Sonnet, Claude Sonnet 4, Claude Sonnet 4.5, Claude Opus 4, Claude Haiku 4.5
- **Web Search**: Only available via direct Anthropic API (not on Bedrock)
- **Temperature**: Extended thinking is NOT compatible with temperature, top_p, or top_k parameters
- **Inference Profile**: Claude Sonnet 4.5 requires cross-region inference profile (us.anthropic.* prefix)

## Key Files Reference
- `/app/backend/server.py` - Main API, LLM integration
- `/app/backend/rag.py` - RAG implementation
- `/app/frontend/src/pages/ChatPage.jsx` - Chat UI
- `/app/frontend/src/pages/ProjectDetailPage.jsx` - Project management
- `/app/frontend/src/index.css` - Theme variables and prose styling
- `/app/frontend/src/App.css` - Message styling

## Next Tasks List
1. Test and enable S3 storage backend
2. Implement multi-user authentication
3. Add file preview for PDFs and images
4. Add search functionality across files
