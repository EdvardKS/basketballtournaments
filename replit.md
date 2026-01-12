# Villena Basket League

## Overview

A basketball tournament management application for the Villena league. The app enables player registration with FIFA-style stats cards, tournament creation and management, captain-led team drafts, and role-based access for admins, captains, and players. Built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: Zustand with persist middleware for client-side state and session persistence
- **Data Fetching**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables and the Teko display font
- **Animations**: Framer Motion for card animations and transitions
- **Build Tool**: Vite with custom plugins for meta images and Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Session Management**: express-session with cookie-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful endpoints under `/api/` prefix for auth, players, tournaments, teams, and draft operations
- **Schema Validation**: Zod with drizzle-zod for type-safe schema definitions

### Data Model
- **Players**: User accounts with role (player/captain/admin), contact info, and 6 basketball stats (pace, shooting, passing, dribbling, defense, physical) that calculate an overall rating
- **Tournaments**: Events with status lifecycle (open → draft → active → completed)
- **Tournament Registrations**: Many-to-many relationship between players and tournaments
- **Teams**: Created per tournament with a captain reference
- **Team Players**: Many-to-many relationship for drafted players on teams

### Authentication Flow
- Session-based auth stored in cookies (7-day expiration)
- Admin login via username/password, captain/player login via mobile number
- Role-based route protection on frontend with redirects

### Build System
- Development: Vite dev server with HMR for frontend, tsx for backend
- Production: esbuild bundles server code, Vite builds static frontend assets to `dist/public`
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema defined in `shared/schema.ts`, migrations output to `./migrations`

### UI Dependencies
- **Radix UI**: Headless component primitives (dialog, dropdown, tabs, select, etc.)
- **shadcn/ui**: Pre-built component library in `client/src/components/ui/`
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **Recharts**: Chart components (if needed for stats visualization)

### Session Storage
- Uses in-memory session storage by default
- `connect-pg-simple` available for PostgreSQL session storage in production

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Optional, defaults to hardcoded value (should be set in production)

## Draft System

### Turn-Based Draft Flow
1. Admin creates tournament with status "open"
2. Players register for the tournament
3. Admin changes tournament status to "draft"
4. Admin creates teams and assigns captains
5. Admin starts the draft (POST `/api/draft/start/:tournamentId`)
6. System shuffles team order randomly
7. Each captain drafts one player per turn
8. Turn advances automatically after each pick
9. After maxRounds, draft completes
10. Admin ends draft, tournament becomes "active"

### Draft API Endpoints
- `POST /api/draft/start/:tournamentId` - Start draft (Admin only)
- `GET /api/draft/state/:tournamentId` - Get current draft state
- `POST /api/draft` - Draft a player (Captain in turn or Admin)
- `POST /api/draft/end/:tournamentId` - End draft (Admin only)

### Draft Tables
- **draftState**: Tracks current round, team order, active status
- **draftHistory**: Records each pick with timestamp and round

## Testing

See `GUIA_TESTEO.md` for complete step-by-step testing instructions in Spanish.

### Test Credentials
- **Admin**: edvardks / SX515wifi
- **Captains**: Mobile number + password (see usuarios_ejemplo.md)