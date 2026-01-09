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
     - AWS Bedrock Claude
     - AWS Bedrock Mistral
   - Chat history within projects
   - Toggle to include/exclude knowledge base
   - File attachments in chat

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
  - [x] AWS Bedrock Claude via Converse API
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
- [x] Extended Thinking toggle (collapsible thought process display)
- [x] Web Search toggle
- [x] LLM Provider selector dropdown
- [x] Settings page with AWS Bedrock configuration
- [x] Dark/light theme toggle with proper text visibility
- [x] Sidebar with recent conversations
- [x] Chat file attachments (images, docs, etc.)
- [x] Auto-scroll to bottom with manual scroll button

### Bug Fixes (January 9, 2025)
- [x] Fixed: Chat message text invisible in light mode
- [x] Fixed: Mistral response corruption on long messages

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core project/file/chat functionality
- [x] AI integration with multiple providers
- [x] Configurable storage

### P1 (High Priority)
- [ ] S3 storage backend implementation (architecture exists, needs testing)
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
BEDROCK_MISTRAL_MODEL_ID=mistral.mistral-large-3-675b-instruct
```

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
