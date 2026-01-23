# CLAUDE.md - AI Assistant Guide for Web_App_Copyeditor

## Project Overview

**Web_App_Copyeditor** is a full-stack AI-powered document editing and chat application with RAG (Retrieval-Augmented Generation) capabilities. The application allows users to:

- Create and manage projects with associated files and conversations
- Upload and process documents (PDF, DOCX, TXT, MD, images)
- Chat with AI assistants (Claude, Bedrock, Google Generative AI) with document context
- Perform semantic and keyword-based searches across documents
- Manage conversations with streaming responses and extended thinking capabilities

**Identity**: "E1 - The Anti-AI Designer" - A warm charcoal-themed intellectual interface that prioritizes content over chrome, with a sophisticated "Old Money Tech" aesthetic.

---

## Technology Stack

### Frontend
- **Framework**: React 19.0.0
- **Router**: React Router v7.5.1
- **Build Tool**: Create React App with Craco 7.1.0 (custom webpack configuration)
- **Styling**: Tailwind CSS 3.4.17 with custom charcoal theme
- **UI Library**: Shadcn (Radix UI primitives)
- **Icons**: Lucide React 0.507.0
- **Markdown**: UIW React Markdown Editor 4.0.11
- **HTTP Client**: Axios 1.8.4
- **State Management**: React Hooks (no centralized state like Redux)
- **Package Manager**: Yarn 1.22.22
- **Form Handling**: React Hook Form 7.56.2 + Zod 3.24.4
- **Toasts**: Sonner 2.0.3

### Backend
- **Framework**: FastAPI 0.110.1 (async-first)
- **Server**: Uvicorn 0.25.0
- **Database**: MongoDB via Motor 3.3.1 (async driver)
- **Document Processing**: PyPDF2, python-docx
- **Embeddings**: SentenceTransformers (all-MiniLM-L6-v2 model)
- **LLM Integration**: Anthropic Claude, AWS Bedrock, Google Generative AI
- **Web Search**: Tavily Python 0.7.17
- **Storage**: Local filesystem or AWS S3 (boto3)
- **Testing**: Pytest 9.0.2
- **Code Quality**: Black, Flake8, MyPy, isort

### Infrastructure
- **Environment**: Docker-ready (Emergent Agent base image)
- **Cloud**: AWS S3, Bedrock integration
- **Development**: Emergent Agent integration

---

## Repository Structure

```
/home/user/Web_App_Copyeditor/
├── frontend/                          # React application
│   ├── src/
│   │   ├── components/               # React components
│   │   │   ├── ui/                   # Shadcn UI components (40+ components)
│   │   │   ├── Sidebar.jsx           # Persistent collapsible navigation
│   │   │   └── ThemeProvider.jsx     # Dark/light mode provider
│   │   ├── pages/                    # Route pages (default exports)
│   │   │   ├── ProjectsPage.jsx      # Home/projects list
│   │   │   ├── ProjectDetailPage.jsx # Project detail with tabs
│   │   │   ├── ChatPage.jsx          # Chat interface
│   │   │   ├── ChatsPage.jsx         # All conversations
│   │   │   └── SettingsPage.jsx      # App settings
│   │   ├── lib/                      # Utility functions
│   │   └── App.jsx                   # Main app component
│   ├── plugins/                      # Custom webpack plugins
│   │   ├── health-check/             # Health monitoring plugin
│   │   └── visual-edits/             # Dev-time visual editing
│   ├── public/                       # Static assets
│   ├── package.json                  # Node dependencies
│   ├── craco.config.js              # Custom webpack config
│   ├── tailwind.config.js           # Tailwind customization
│   ├── postcss.config.js            # PostCSS config
│   ├── jsconfig.json                # Path aliases (@/* → src/*)
│   └── components.json              # Shadcn config
├── backend/                          # Python FastAPI server
│   ├── server.py                     # Main FastAPI application
│   ├── rag.py                        # RAG system implementation
│   ├── requirements.txt              # Python dependencies
│   └── tests/                        # Backend tests
├── tests/                            # Root-level tests
├── memory/                           # Memory/cache storage
├── uploads/                          # File upload storage
├── test_reports/                     # Test execution reports
├── design_guidelines.json            # Design system specification
├── .emergent/                        # Emergent Agent config
│   └── emergent.yml                  # Docker deployment config
├── .gitignore                        # Git ignore rules
└── README.md                         # Project readme

```

---

## Frontend Architecture & Conventions

### Component Organization

**UI Components** (`frontend/src/components/ui/`)
- 40+ pre-built Shadcn components (Button, Card, Dialog, etc.)
- Use **named exports**: `export const Button = ...`
- Built on Radix UI primitives with custom charcoal theme
- Located in `@/components/ui/` (path alias)

**Feature Components** (`frontend/src/components/`)
- `Sidebar.jsx` - Persistent, collapsible navigation (280px → 64px)
- `ThemeProvider.jsx` - Dark/light mode management
- Use **named exports** for reusable components

**Pages** (`frontend/src/pages/`)
- Route-level components
- Use **default exports**: `export default function PageName() {...}`
- Pages should compose UI components, not implement complex logic

### Import Conventions

```javascript
// Path alias - Always use @ for src imports
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/Sidebar';

// Lucide icons
import { Search, Settings, FileText } from 'lucide-react';

// Utilities
import { cn } from '@/lib/utils'; // Tailwind class merger
```

### Routing Structure

```javascript
/ → ProjectsPage (home)
/projects → ProjectsPage
/projects/:projectId → ProjectDetailPage (with tabs: Chat, Memory, Files)
/chat/:conversationId → ChatPage
/chats → ChatsPage
/settings → SettingsPage
```

### State Management

- **Local State**: `useState` for component-specific data
- **Context**: ThemeProvider for dark/light mode
- **URL State**: React Router params for navigation state
- **No Redux**: Application uses React Hooks exclusively

### Data Fetching

```javascript
// Use axios for API calls
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Example: Fetch projects
const response = await axios.get(`${API_URL}/api/projects`);
```

### Form Handling

```javascript
// Use React Hook Form + Zod for validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const form = useForm({
  resolver: zodResolver(formSchema),
});
```

### Styling Conventions

1. **Tailwind First**: Use Tailwind utility classes
2. **Custom Theme**: Charcoal theme defined in `tailwind.config.js`
3. **Component Variants**: Use `class-variance-authority` (cva)
4. **Class Merging**: Use `cn()` utility from `@/lib/utils`

```javascript
// Example with cn()
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className // Allow prop override
)} />
```

---

## Design System Guidelines

**Source**: `design_guidelines.json`

### Color Palette

**Dark Theme** (Primary)
- Background: `#191919` (warm charcoal)
- Foreground: `#F5F5F5`
- Card: `#222222`
- Primary/Accent: `#D97757` (terracotta)
- Border: `#333333`

**Light Theme**
- Background: `#FAF9F6` (cream)
- Foreground: `#1F1F1F`
- Card: `#FFFFFF`
- Primary: `#D97757` (terracotta)

### Typography

- **UI Elements**: Inter (sans-serif)
- **Content/AI Responses**: Source Serif 4, Merriweather (serif)
- **Code**: JetBrains Mono (monospace)

### Key Design Principles

1. **Fusion over Imitation** - Don't copy generic AI interfaces
2. **Emotion First** - Create warmth through charcoal palette
3. **Content is King** - Prioritize readability and hierarchy
4. **Negative Space** - Use 2-3x more spacing than typical
5. **Contrast** - Use terracotta accents sparingly for emphasis

### Universal Guidelines for AI Assistants

**MUST DO:**
- Use warm charcoal (`#191919`) instead of pure black
- Apply Source Serif 4 to all user-generated content and AI responses
- Ensure Sidebar is persistent and collapsible
- Add `data-testid` to all interactive elements
- Prioritize existing `@/components/ui` components before creating new ones
- Use **named exports** for components, **default exports** for pages
- Use Sonner for toast notifications

**MUST NOT:**
- Use AI emoji characters (🤖🧠💭💡 etc.) for icons
- Apply universal `transition: all` (breaks transforms)
- Center-align app container (disrupts reading flow)
- Use dark colors as gradients
- Create generic centered layouts with simplistic gradients
- Use emojis in UI unless explicitly requested

**Best Practices:**
- Create depth through layered z-index hierarchy
- Use glassmorphism effects (12-24px backdrop blur)
- Add micro-animations for all interactions (hover, transitions)
- Use pill-shaped or sharp buttons with interaction animations
- Examine existing components before creating new ones to match patterns

---

## Backend Architecture & Conventions

### API Structure

**Base URL**: `http://localhost:8000`

**Endpoints** (`backend/server.py`):
```
GET    /api/projects              # List all projects
POST   /api/projects              # Create project
GET    /api/projects/{id}         # Get project details
PUT    /api/projects/{id}         # Update project
DELETE /api/projects/{id}         # Delete project

GET    /api/conversations         # List conversations
POST   /api/conversations         # Create conversation
GET    /api/conversations/{id}    # Get conversation
DELETE /api/conversations/{id}    # Delete conversation

POST   /api/chat                  # Send message (streaming)
POST   /api/files/upload          # Upload file
GET    /api/files/{id}            # Download file
DELETE /api/files/{id}            # Delete file

GET    /api/storage/config        # Get storage config
GET    /api/config/features       # Feature flags
```

### RAG System (`backend/rag.py`)

**Document Processing**:
- Chunk size: 400 tokens
- Overlap: 50 tokens
- Supported formats: PDF, DOCX, TXT, MD, PNG, JPG, BMP

**Retrieval Strategy**:
1. Semantic search via embeddings (SentenceTransformers)
2. Keyword-based search (TF-IDF)
3. Hybrid retrieval (top 5 results combined)

**Model**: `all-MiniLM-L6-v2` (384-dimensional embeddings)

### LLM Integration

**Supported Providers**:
- Anthropic Claude (via emergent integrations)
- AWS Bedrock
- Google Generative AI
- OpenAI-compatible endpoints

**Features**:
- Streaming responses
- Extended thinking capability
- Web search integration (Tavily)
- File context awareness

### Storage Abstraction

**Providers**:
- Local filesystem: `/app/uploads` (default)
- AWS S3: Configured via environment variables

**Configuration**:
```python
STORAGE_PROVIDER=local|s3
UPLOAD_DIR=/app/uploads (for local)
AWS_S3_BUCKET=bucket-name (for S3)
```

### Database Schema (MongoDB)

**Collections**:
- `projects` - Project metadata
- `conversations` - Chat conversations
- `messages` - Individual messages
- `files` - File metadata and embeddings

### Environment Variables

Required in `.env`:
```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017/copyeditor

# Storage
STORAGE_PROVIDER=local
UPLOAD_DIR=/app/uploads

# LLM Providers (at least one)
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
GOOGLE_API_KEY=...

# Web Search
TAVILY_API_KEY=...

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### Code Quality Tools

```bash
# Format code
black backend/

# Check style
flake8 backend/

# Type checking
mypy backend/

# Sort imports
isort backend/
```

---

## Development Workflows

### Frontend Development

```bash
cd frontend

# Install dependencies
yarn install

# Start dev server (port 3000)
yarn start

# Build for production
yarn build

# Run tests
yarn test
```

### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run server (port 8000)
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Format and lint
black .
flake8 .
mypy .
isort .
```

### Custom Webpack Plugins

**Health Check Plugin** (`ENABLE_HEALTH_CHECK=true`)
- Monitors webpack compilation health
- Endpoints: `/health`, `/webpack-stats`
- Only enable when debugging build issues

**Visual Edits Plugin** (dev mode only)
- Enables visual editing capabilities during development
- Automatically enabled in `NODE_ENV=development`
- Adds Babel metadata for component tracking

### Path Aliases

Frontend uses `@/` to reference `src/`:
```javascript
// Instead of: import { Button } from '../../../components/ui/button'
import { Button } from '@/components/ui/button'; // Clean!
```

---

## Testing

### Frontend Tests
- **Framework**: Jest (via Create React App)
- **Location**: `frontend/src/**/*.test.jsx`
- **Run**: `yarn test`

### Backend Tests
- **Framework**: Pytest
- **Location**: `backend/tests/`, `tests/`
- **Run**: `pytest`
- **Integration Tests**: `backend_test.py` (full API suite)

### Test Reports
- JSON reports in `/test_reports/`
- Iteration tracking: `iteration_1.json`, `iteration_2.json`

### Testing Best Practices
- Add `data-testid` to interactive elements
- Test user flows, not implementation details
- Use async/await for API tests
- Mock external services (LLMs, storage)

---

## Key Files Reference

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `package.json` | `frontend/` | Node dependencies, scripts |
| `craco.config.js` | `frontend/` | Webpack customization, plugins |
| `tailwind.config.js` | `frontend/` | Tailwind theme (charcoal) |
| `components.json` | `frontend/` | Shadcn configuration |
| `jsconfig.json` | `frontend/` | Path aliases (`@/*`) |
| `postcss.config.js` | `frontend/` | PostCSS + Tailwind + Autoprefixer |
| `requirements.txt` | `backend/` | Python dependencies (130+ packages) |
| `.emergent/emergent.yml` | `.emergent/` | Emergent Agent deployment |
| `design_guidelines.json` | `/` | Design system specs |
| `.gitignore` | `/` | Git ignore rules |

### Entry Points

- **Frontend**: `frontend/src/index.js` → `frontend/src/App.jsx`
- **Backend**: `backend/server.py` (FastAPI app)

### Important Backend Files

- `backend/server.py` - Main FastAPI application, all endpoints
- `backend/rag.py` - Document processing and retrieval logic

---

## Common Development Tasks

### Adding a New Page

1. Create page in `frontend/src/pages/NewPage.jsx`
2. Use **default export**: `export default function NewPage() {...}`
3. Add route in `frontend/src/App.jsx`:
```javascript
<Route path="/new-page" element={<NewPage />} />
```
4. Add navigation in `Sidebar.jsx`

### Adding a New UI Component

1. Check if Shadcn has it: `npx shadcn@latest add <component-name>`
2. If custom, examine existing patterns in `frontend/src/components/ui/`
3. Use **named export**: `export const MyComponent = ...`
4. Follow design guidelines from `design_guidelines.json`

### Adding a New API Endpoint

1. Add route in `backend/server.py`:
```python
@app.get("/api/new-endpoint")
async def new_endpoint():
    return {"message": "Hello"}
```
2. Update frontend API calls in appropriate component
3. Add test in `backend_test.py`

### Updating Design System

1. Modify `design_guidelines.json` for specification
2. Update `frontend/tailwind.config.js` for Tailwind values
3. Update `frontend/src/components/ui/` components if needed
4. Ensure consistency across dark and light themes

### Working with Documents

1. Upload via `/api/files/upload`
2. RAG processes and chunks documents
3. Embeddings stored in MongoDB
4. Retrieval via semantic + keyword search in `rag.py`

### Adding a New LLM Provider

1. Add API key to `.env`
2. Add integration in `backend/server.py`
3. Update chat endpoint to support provider selection
4. Test streaming and context handling

---

## Git Workflow

### Branches
- `main` - Production branch (protected)
- `claude/claude-md-*` - AI-generated feature branches
- Feature branches follow pattern: `feature/descriptive-name`

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Include session URL in commit messages
- Example: `feat: add dark mode toggle\n\nhttps://claude.ai/code/session_...`

### Ignored Files
- `node_modules/`, `build/`, `dist/`
- `.env`, `.env.*` (all environment files)
- `__pycache__/`, `.venv/`
- Build artifacts: `*.pack`, `*.zip`, `*.tar.gz`
- See `.gitignore` for complete list

---

## Deployment

### Docker (Emergent Agent)
- Base image: `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-06012026-1`
- Configuration: `.emergent/emergent.yml`
- Includes both frontend and backend

### Environment Setup
1. Copy `.env.example` to `.env` (if exists)
2. Configure MongoDB URL
3. Add API keys for LLM providers
4. Set storage provider and credentials
5. Configure CORS allowed origins

### Production Build

**Frontend**:
```bash
cd frontend
yarn build
# Output: frontend/build/
```

**Backend**:
```bash
cd backend
# Ensure all dependencies installed
pip install -r requirements.txt
# Run with production server
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Troubleshooting

### Common Issues

**Frontend build fails**:
- Check Node version (should support React 19)
- Clear cache: `rm -rf node_modules/.cache`
- Reinstall: `rm -rf node_modules && yarn install`

**Backend imports fail**:
- Activate virtual environment
- Install requirements: `pip install -r backend/requirements.txt`
- Check Python version (3.10+)

**RAG not finding documents**:
- Verify file uploaded successfully
- Check MongoDB connection
- Verify embeddings generated (check `files` collection)

**Dark mode not working**:
- Verify `ThemeProvider` wraps app
- Check Tailwind config has `darkMode: 'class'`
- Verify HTML has `dark` class when enabled

**API CORS errors**:
- Add frontend URL to `ALLOWED_ORIGINS` in `.env`
- Restart backend server

---

## Additional Resources

### Documentation
- React 19: https://react.dev/
- FastAPI: https://fastapi.tiangolo.com/
- Shadcn UI: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/
- Radix UI: https://www.radix-ui.com/

### Codebase Patterns

**Before creating new code**:
1. Search for similar existing implementations
2. Follow established patterns for consistency
3. Reuse UI components from `@/components/ui`
4. Match naming conventions (PascalCase components, camelCase functions)
5. Adhere to export conventions (named for components, default for pages)

**When in doubt**:
- Check `design_guidelines.json` for design decisions
- Examine existing components for patterns
- Maintain consistency with current codebase style
- Prioritize simplicity over complexity

---

## Summary for AI Assistants

When working with this codebase:

1. **Read before writing** - Always examine existing code before making changes
2. **Follow conventions** - Named exports for components, default for pages
3. **Respect the design system** - Use warm charcoal theme, no AI emojis
4. **Reuse components** - Leverage 40+ existing UI components
5. **Test interactivity** - Add `data-testid` to interactive elements
6. **Match patterns** - Study existing implementations for consistency
7. **Use path aliases** - Always use `@/` for imports
8. **Sonner for toasts** - Don't create custom toast implementations
9. **Semantic HTML** - Use appropriate elements for accessibility
10. **Mobile-first** - Responsive design with Tailwind breakpoints

**Critical Rules**:
- NO AI emojis (🤖🧠💭💡🔮 etc.)
- NO `transition: all` (breaks transforms)
- NO center-aligned containers (disrupts reading)
- YES to warm charcoal (#191919, not #000000)
- YES to existing component reuse
- YES to design guidelines compliance

This codebase prioritizes **intellectual warmth**, **content hierarchy**, and **sophisticated simplicity**. Every change should enhance, not detract from, this vision.

---

*Last updated: 2026-01-23*
*Generated for AI assistants working with Web_App_Copyeditor*
