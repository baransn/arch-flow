# Arch Flow

An AI-powered architecture visualization tool that automatically generates and animates system architecture diagrams from GitHub repositories.

## Features

- 🏗️ **Auto-Generate Diagrams** - AI analyzes codebases to create accurate architecture diagrams
- 🎬 **Animated Flows** - Watch requests flow through your system end-to-end
- ⚡ **Instant Results** - Cached analyses for returning visitors
- 🎨 **Beautiful UI** - Modern, responsive design with dark mode support

## Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS
- **Backend:** Next.js API Routes, Vercel Functions
- **Storage:** Vercel Blob (diagrams), Vercel KV (metadata)
- **AI:** Claude API via Agent SDK
- **Visualization:** Mermaid.js
- **Real-time:** Server-Sent Events (SSE)

## Project Structure

```
arch-flow/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # Landing page (/)
│   │   ├── layout.tsx           # Root layout
│   │   ├── [owner]/[repo]/      # Repo visualization
│   │   │   ├── page.tsx         #   (/vercel/next.js)
│   │   │   └── loading.tsx
│   │   └── api/                 # API Routes
│   │       ├── analyze/
│   │       │   └── route.ts     # POST analysis starter
│   │       └── stream/[analysisId]/
│   │           └── route.ts     # SSE streaming
│   ├── components/               # React components
│   │   ├── DiagramViewer.tsx    # Mermaid diagram + animations
│   │   └── ProgressStream.tsx   # SSE progress updates
│   └── lib/                      # Utilities & business logic
│       ├── types.ts             # TypeScript types
│       ├── github.ts            # GitHub API integration
│       ├── storage.ts           # Vercel Blob operations
│       ├── cache.ts             # Vercel KV operations
│       ├── analysis.ts          # Analysis job management
│       └── analyzer.ts          # Orchestration logic
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your API keys:
   - `ANTHROPIC_API_KEY` - Your Claude API key (required)
   - `GITHUB_TOKEN` - GitHub personal access token (optional, increases rate limits)
   - Vercel Blob/KV variables are auto-configured when deployed to Vercel

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Development Status

### ✅ Phase 1 Complete: Foundation
- [x] Next.js 15 project setup with TypeScript & Tailwind
- [x] Project structure with `src/` directory
- [x] TypeScript types and interfaces
- [x] URL-based routing (`/[owner]/[repo]`)
- [x] Landing page with clickable examples
- [x] Vercel Blob and KV storage utilities

### ✅ Phase 2 Complete: Backend & API
- [x] API route handlers
  - [x] `POST /api/analyze` - Start analysis
  - [x] `GET /api/stream/[analysisId]` - SSE progress stream
- [x] Analysis job management with KV storage
- [x] GitHub repository download via tarball API
- [x] Mermaid.js integration with animations
- [x] SSE real-time progress streaming
- [x] DiagramViewer with flow selection & animations

### 🚧 Phase 3: In Progress
- [x] Mock analyzer (placeholder for Claude SDK)
- [ ] Claude Agent SDK integration
- [ ] Python analyzer script
- [ ] Actual code analysis logic
- [ ] Error handling and edge cases
- [ ] Rate limiting and security
- [ ] Deployment to Vercel

## How It Works

1. **User navigates to `gliss.dev/owner/repo`**
2. **Cache check** - If analysis exists in Vercel Blob, serve instantly
3. **Start analysis** - POST to `/api/analyze` creates analysis job
4. **Download repo** - Fetch as tarball from GitHub API
5. **Analyze** - Claude Agent SDK analyzes codebase structure (mock for now)
6. **Stream progress** - Real-time updates via SSE from `/api/stream/[id]`
7. **Generate** - Create Mermaid diagram and animation steps
8. **Display** - Interactive animated architecture diagram
9. **Cache** - Store in Vercel Blob for future requests

## API Routes

### POST `/api/analyze`
Starts repository analysis
```typescript
// Request body
{
  "owner": "vercel",
  "name": "next.js"
}

// Response
{
  "analysisId": "uuid-here",
  "message": "Analysis started"
}
```

### GET `/api/stream/[analysisId]`
Server-Sent Events stream for progress updates
```
event: status
data: {"status":"downloading","progress":10,"message":"Downloading vercel/next.js..."}

event: status
data: {"status":"analyzing","progress":50,"message":"Analyzing code architecture..."}

event: complete
data: {"diagram":"flowchart TD...","flows":[...],"timestamp":123456789}
```

## License

MIT

## Contributing

Contributions welcome! This is currently in active development.
