# Accessible Card Sorting Tool

An open-source, accessible alternative to commercial card sorting tools like Optimal Workshop and Lyssna. Built with a focus on creating a frictionless experience for participants using assistive technology.

## ✨ Features

### Accessibility (WCAG AAA)
- **Full keyboard navigation** - Tab, Space, Enter, Arrow keys
- **Screen reader support** - ARIA live regions announce all changes
- **Click-to-Move menu** - Press `M` to move cards without dragging
- **High contrast mode** - Windows High Contrast Mode support
- **Reduced motion** - Respects `prefers-reduced-motion`
- **No time limits** - Participants work at their own pace

### Sorting Modes
- **Open Sorting** - Participants create their own categories
- **Closed Sorting** - Pre-defined categories to sort into

### Analysis Dashboard
- **Similarity Matrix** - Heatmap + accessible table view
- **Hierarchical Clustering** - Dendrogram with cluster view
- **Card Summaries** - Per-card placement analysis
- **Auto-generated Insights** - Key patterns highlighted
- **JSON Export** - Full data export for custom analysis

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Docker)

### 1. Clone & Install

```bash
cd card-sorting
npm install
```

### 2. Set up Database

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/card_sorting?schema=public"

# NextAuth.js (generate: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Start PostgreSQL with Docker:

```bash
docker run --name card-sorting-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=card_sorting \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Initialize Database

```bash
npm run db:push    # Create tables
npm run db:seed    # Add sample data
```

### 4. Start Development Server

```bash
npm run dev
```

Visit:
- **Admin Dashboard**: http://localhost:3000/admin
- **Sample Study**: http://localhost:3000/s/product-features-demo

### Default Login
```
Email: admin@example.com
Password: admin123
```

## 📁 Project Structure

```
src/
├── app/
│   ├── admin/              # Admin dashboard
│   │   ├── studies/        # Study management
│   │   └── login/          # Authentication
│   ├── api/                # API routes
│   │   ├── studies/        # CRUD for studies
│   │   ├── sessions/       # Participant sessions
│   │   └── participate/    # Public participant API
│   ├── s/[slug]/           # Participant sorting interface
│   └── results/            # Legacy results page
├── components/
│   ├── card-sort/          # Sorting interface components
│   └── results/            # Analysis visualizations
├── lib/
│   ├── analysis.ts         # Similarity & clustering algorithms
│   ├── auth.ts             # NextAuth configuration
│   └── db.ts               # Prisma client
├── store/                  # Zustand state management
└── types/                  # TypeScript definitions
```

## 🔧 Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run db:push    # Push schema to database
npm run db:seed    # Seed sample data
npm run db:studio  # Open Prisma Studio
```

## 🌐 API Routes

### Public (Participant)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/participate/[slug]` | Get study for participant |
| POST | `/api/participate/[slug]/sessions` | Start new session |
| PATCH | `/api/sessions/[id]` | Update/complete session |
| POST | `/api/sessions/[id]/placements` | Save card placements |

### Protected (Admin)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/studies` | List/create studies |
| GET/PATCH/DELETE | `/api/studies/[id]` | Manage study |
| GET | `/api/studies/[id]/results` | Get analysis results |

## 🎯 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between cards |
| `Space` / `Enter` | Pick up / drop card |
| `Arrow Keys` | Move card between containers |
| `Escape` | Cancel drag |
| `M` | Open move menu (accessibility) |

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix Primitives)
- **Drag & Drop**: @dnd-kit (accessibility-first)
- **State**: Zustand
- **Database**: PostgreSQL + Prisma
- **Auth**: NextAuth.js

## 📄 License

MIT - feel free to use in your own projects!
