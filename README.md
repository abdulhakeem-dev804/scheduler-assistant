# Scheduler Assistant

A modern, full-stack scheduling and productivity application built with React/Next.js and FastAPI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-80%25-yellow.svg)

## Features

- 📅 **Calendar Views** - Month, Week, Day, and Agenda views
- 📝 **Event Management** - Create, edit, delete, and complete events
- 🍅 **Pomodoro Timer** - Built-in focus timer with session tracking
- 📊 **Statistics** - Track productivity and completed tasks
- 🎨 **Dark/Light Mode** - Beautiful UI with theme support
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- ⚡ **Real-time** - Socket.io for live updates
- 🔐 **Type-safe** - Full TypeScript support

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS + shadcn/ui** - Styling and components
- **React Query** - Server state management
- **Socket.io-client** - Real-time updates

### Backend
- **FastAPI** - Python REST API
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Production database
- **Python-SocketIO** - WebSocket support

### Testing
- **Vitest** - Frontend unit tests
- **React Testing Library** - Component testing
- **Playwright** - End-to-end tests
- **Pytest** - Backend tests

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Frontend deployment
- **Railway** - Backend deployment

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker (optional)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:socket_app --reload
```

API available at http://localhost:8000

### Docker Setup

```bash
docker-compose up -d
```

## Running Tests

### Frontend Tests

```bash
cd frontend
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # With coverage
npm run test:e2e       # E2E tests
```

### Backend Tests

```bash
cd backend
pytest                           # Run tests
pytest --cov=app                 # With coverage
pytest --cov=app --cov-report=html  # HTML report
```

## Project Structure

```
sheduler_assistant/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   ├── types/         # TypeScript types
│   │   └── __tests__/     # Unit tests
│   └── e2e/               # Playwright E2E tests
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── routers/       # API routes
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic schemas
│   │   └── main.py        # App entry point
│   └── tests/             # Pytest tests
├── .github/workflows/     # CI/CD
└── docker-compose.yml     # Docker config
```

## API Endpoints

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/{id}` - Get event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `PATCH /api/events/{id}/toggle-complete` - Toggle completion

### Pomodoro
- `GET /api/pomodoro/sessions` - Get sessions
- `POST /api/pomodoro/sessions` - Create session
- `GET /api/pomodoro/stats` - Get statistics

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`

### Backend (Railway)

1. Create a new project on Railway
2. Add PostgreSQL database
3. Deploy from GitHub repo
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway)
   - `CORS_ORIGINS`

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/scheduler
CORS_ORIGINS=http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
