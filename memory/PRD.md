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
   - Documents persist across conversations

2. **Project Organization**
   - Create/edit/delete projects
   - Project-specific instructions (system prompt)
   - Project memory (persistent context)
   - File management per project

3. **AI Chat Integration**
   - Claude Sonnet 4.5 via Emergent LLM key
   - Chat history within projects
   - Toggle to include/exclude knowledge base

4. **Configurable Storage**
   - Local storage (default for development)
   - S3 storage (for enterprise deployment)
   - Easy switch via environment variables

5. **UI/UX**
   - Claude.ai-inspired dark theme
   - Light/dark mode toggle
   - Sidebar navigation with recent chats

## What's Been Implemented (January 6, 2025)
### Backend
- [x] FastAPI with MongoDB database
- [x] Projects CRUD API
- [x] File upload/download with text extraction (PDF, DOCX, TXT, MD, images)
- [x] Conversations and messages API
- [x] AI chat endpoint with Claude Sonnet 4.5
- [x] Storage abstraction (LocalStorageProvider, S3StorageProvider)
- [x] Storage configuration API

### Frontend
- [x] Projects list page with search
- [x] Project detail page (Files, Conversations, Memory, Instructions)
- [x] File upload with indexing status
- [x] Chat interface with markdown rendering
- [x] Knowledge base toggle
- [x] Settings page with storage configuration
- [x] Dark/light theme toggle
- [x] Sidebar with recent conversations

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core project/file/chat functionality
- [x] AI integration
- [x] Configurable storage

### P1 (High Priority - Next Phase)
- [ ] Conversation rename/edit
- [ ] File preview (PDF viewer, image viewer)
- [ ] Bulk file upload with progress
- [ ] Search within files/conversations

### P2 (Medium Priority)
- [ ] Multi-user authentication
- [ ] User roles and permissions
- [ ] Project sharing
- [ ] File version history

### P3 (Nice to Have)
- [ ] Export conversation to document
- [ ] Templates for common assessment types
- [ ] Analytics dashboard
- [ ] Webhook integrations

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent integrations
- **Storage**: Local filesystem (dev) / S3 (production)

## Environment Configuration
```
# Backend (.env)
STORAGE_PROVIDER=local  # or 's3'
S3_BUCKET_NAME=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_REGION=us-east-1
EMERGENT_LLM_KEY=sk-emergent-...
```

## Next Tasks List
1. Add conversation rename functionality
2. Implement file preview for PDFs and images
3. Add search functionality across files
4. Implement proper error handling for storage switch
5. Add loading states for file indexing
