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