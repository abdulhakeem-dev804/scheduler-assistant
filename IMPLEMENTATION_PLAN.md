# Scheduler Assistant - Production-Ready Implementation Plan

A complete, deployable React application with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **React Query**, **Socket.io**, **FastAPI** backend, **PostgreSQL** database, industry-grade testing, Docker, and CI/CD pipelines.

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Full-stack React framework |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | Responsive UI |
| **State** | React Query (TanStack Query) | Server state, caching |
| **Real-time** | Socket.io-client | Live updates |
| **Backend** | FastAPI + Uvicorn | Python REST API |
| **Database** | PostgreSQL + SQLAlchemy | Data persistence |
| **Testing (FE)** | Vitest + React Testing Library + Playwright | Unit + E2E |
| **Testing (BE)** | pytest + pytest-cov + httpx | Unit + Integration |
| **Containers** | Docker + Docker Compose | Consistent environments |
| **CI/CD** | GitHub Actions | Automated testing & deploy |
| **Deployment** | Vercel (FE) + Railway (BE) | Production hosting |

---

## Project Structure

```
c:\projects\sheduler_assistant\
├── frontend/                        # Next.js App
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── (routes)/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui
│   │   ├── layout/
│   │   ├── calendar/
│   │   ├── events/
│   │   ├── pomodoro/
│   │   └── stats/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── __tests__/                  # Unit tests
│   │   ├── components/
│   │   └── hooks/
│   ├── e2e/                        # Playwright E2E tests
│   │   ├── calendar.spec.ts
│   │   ├── events.spec.ts
│   │   └── pomodoro.spec.ts
│   ├── Dockerfile
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   └── package.json
├── backend/                        # FastAPI App
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   ├── tests/                      # pytest tests
│   │   ├── conftest.py
│   │   ├── test_events.py
│   │   └── test_pomodoro.py
│   ├── alembic/                    # DB migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Test on PR
│       └── deploy.yml              # Deploy on merge
└── README.md
```

---

## Testing Strategy

### Frontend Testing

| Type | Tool | Scope | Command |
|------|------|-------|---------|
| **Unit** | Vitest + RTL | Components, hooks | `npm run test` |
| **Integration** | Vitest + MSW | API mocking | `npm run test:integration` |
| **E2E** | Playwright | Full user flows | `npm run test:e2e` |
| **Coverage** | Vitest | ≥80% target | `npm run test:coverage` |

#### Example Unit Test
```typescript
// __tests__/components/EventCard.test.tsx
import { render, screen } from '@testing-library/react'
import { EventCard } from '@/components/events/EventCard'

describe('EventCard', () => {
  it('renders event title and category', () => {
    render(<EventCard title="Team Meeting" category="work" />)
    expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
  })
})
```

#### Example E2E Test
```typescript
// e2e/events.spec.ts
import { test, expect } from '@playwright/test'

test('user can create a new event', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="add-event-btn"]')
  await page.fill('[data-testid="event-title"]', 'New Meeting')
  await page.click('[data-testid="save-event-btn"]')
  await expect(page.getByText('New Meeting')).toBeVisible()
})
```

---

### Backend Testing

| Type | Tool | Scope | Command |
|------|------|-------|---------|
| **Unit** | pytest | Services, utils | `pytest tests/` |
| **Integration** | pytest + httpx | API endpoints | `pytest tests/ -m integration` |
| **Coverage** | pytest-cov | ≥85% target | `pytest --cov=app` |

#### Example Backend Test
```python
# tests/test_events.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_event():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/events", json={
            "title": "Test Event",
            "start_date": "2026-01-08T09:00:00Z",
            "category": "work"
        })
    assert response.status_code == 201
    assert response.json()["title"] == "Test Event"
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: cd backend && pip install -r requirements.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v4

  deploy:
    needs: [frontend-tests, backend-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Frontend to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Backend to Railway
        run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/scheduler
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: scheduler
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Deployment Architecture

```mermaid
graph LR
    subgraph "Production"
        A[User] --> B[Vercel CDN]
        B --> C[Next.js Frontend]
        C --> D[Railway Backend]
        D --> E[PostgreSQL]
        C <-.-> F[Socket.io]
        D <-.-> F
    end
    
    subgraph "CI/CD"
        G[GitHub] --> H[GitHub Actions]
        H --> |Tests Pass| B
        H --> |Tests Pass| D
    end
```

---

## Deployment Platforms

| Component | Platform | Why |
|-----------|----------|-----|
| **Frontend** | Vercel | Optimized for Next.js, instant deploys |
| **Backend** | Railway | Easy Python deploy, managed Postgres |
| **Database** | Railway PostgreSQL | Included with Railway |
| **Alternative** | Docker + DigitalOcean | Full control, VPS-based |

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/scheduler
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

---

## Verification Plan

### Automated (CI)
1. ✅ TypeScript type checking
2. ✅ ESLint code quality
3. ✅ Frontend unit tests (≥80% coverage)
4. ✅ Backend unit tests (≥85% coverage)
5. ✅ Playwright E2E tests
6. ✅ Docker build verification

### Manual (Pre-Deploy)
1. Test responsive design: 320px, 768px, 1280px
2. Test in Chrome, Firefox, Safari
3. Test real-time sync between 2 browser tabs
4. Load test with 100+ events
5. Verify deployment to staging

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Project Setup (Next.js + FastAPI) | 1 hour |
| Core Components | 2 hours |
| Backend API + Database | 1.5 hours |
| Frontend Testing Setup | 1 hour |
| Backend Testing Setup | 45 mins |
| Docker + CI/CD Pipeline | 1 hour |
| Deployment Configuration | 45 mins |
| Final Testing & Polish | 1 hour |
| **Total** | ~9-10 hours |
