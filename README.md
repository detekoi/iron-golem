# ⛏️ Iron Golem — MC Helper

Your AI-powered Minecraft companion. Get instant answers, crafting recipes, and expert tips for Java and Bedrock editions — powered by Google Gemini.

## Features

- **AI Chat** — Ask anything about Minecraft and get accurate, grounded answers via Gemini 3 Flash with Google Search integration
- **Visual Crafting Recipes** — Automatically detects recipe questions and renders interactive 3×3 crafting grids
- **Java / Bedrock Toggle** — Switch editions and get edition-specific answers, recipes, and mechanics
- **Session Management** — Conversations are saved to local storage with auto-generated titles
- **Session Summaries** — AI-generated summaries of each conversation, updated in real time
- **Streaming Responses** — Answers stream in token-by-token for a responsive experience
- **Dark Theme** — A polished, dark UI designed for long sessions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Lucide Icons](https://lucide.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| AI | [Google Gemini API](https://ai.google.dev/) (`@google/genai`) |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-raw` |
| Validation | [Zod 4](https://zod.dev/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A [Google AI Studio](https://aistudio.google.com/) API key

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/mc-guide.git
cd mc-guide

# Install dependencies
npm install

# Add your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start asking questions!

## Project Structure

```
mc-guide/
├── app/
│   ├── api/
│   │   ├── chat/          # Streaming chat endpoint
│   │   ├── generate-title/ # Auto-generates session titles
│   │   └── summary/       # Session summary generation
│   ├── layout.tsx         # Root layout & metadata
│   ├── page.tsx           # Main app page
│   └── globals.css        # Global styles
├── components/
│   ├── ChatInterface.tsx  # Chat UI with message rendering
│   ├── CraftingRecipe.tsx # Visual 3×3 crafting grid
│   └── SummarySidebar.tsx # Session list & summary panel
├── lib/
│   ├── gemini.ts          # Gemini client, tools, & prompts
│   ├── schemas.ts         # Zod validation schemas
│   ├── storage.ts         # LocalStorage session persistence
│   └── types.ts           # Shared TypeScript types
└── public/                # Static assets (item textures, etc.)
```

## License

[BSD 2-Clause](LICENSE) © Henry Manes
