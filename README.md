# Time Tracker API

A TypeScript Express + Postgres backend for the Time Tracker application.

## Features

- **Authentication**: JWT-based auth with access and refresh tokens
- **Subjects**: Create and manage time tracking subjects
- **Time Entries**: Track time with duration-based entries
- **Reports**: Daily, weekly, monthly, and leaderboard reports
- **Validation**: Zod schema validation
- **Error Handling**: Centralized error normalization
- **Testing**: Vitest + Supertest with comprehensive test coverage

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL with node-postgres
- **Language**: TypeScript
- **Validation**: Zod
- **Testing**: Vitest + Supertest
- **Linting**: ESLint + Prettier
- **Authentication**: JWT (jsonwebtoken + bcrypt)

## Prerequisites

- Node.js 20+
- PostgreSQL 12+
- npm or yarn

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd time_tracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**
 
   ```bash
   # Create environment files with database configuration
   npm run env:setup
   
   # Edit .env with secure JWT secrets (update the placeholder values)
   # Generate secure random strings for JWT secrets
   ```

4. **Database setup**
 
   ```bash
   # Create databases and seed with sample data
   npm run db:setup
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migrate:up` - Run database migrations (placeholder)
- `npm run migrate:down` - Rollback database migrations (placeholder)
- `npm run db:setup` - Create databases and seed with sample data
- `npm run env:setup` - Create environment files

### Health Check

Once the server is running, you can check if it's healthy:

```bash
curl http://localhost:3000/healthz
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 123.456
}
```

### Project Structure

```
src/
├── config/
│   └── env.ts              # Environment configuration
├── db/
│   ├── migrations/         # SQL migration files
│   └── index.ts           # Database connection and helpers
├── middleware/
│   └── error.ts           # Error handling middleware
├── modules/
│   ├── auth/              # Authentication module
│   ├── subjects/          # Subjects module
│   ├── time-entries/      # Time entries module
│   └── reports/           # Reports module
├── app.ts                 # Express app configuration
└── server.ts              # Server entry point

tests/
├── setup.ts               # Test configuration
└── health.test.ts         # Health check tests
```

### Environment Variables

Required environment variables (see `env.example`):

- `POSTGRES_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (min 32 chars)
- `NODE_ENV` - Environment (development/production/test)

### API Documentation

The API contract is defined in `openai.yaml` (OpenAPI 3.0.3 specification).

## Testing

The project uses Vitest for testing with Supertest for HTTP assertions.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/health.test.ts
```

## Error Handling

All errors are normalized to a consistent format:

```json
{
  "error": {
    "code": "BAD_REQUEST|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|INTERNAL",
    "message": "Human-readable error message",
    "details": {
      // Optional additional error details
    }
  }
}
```

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Keep diffs small and focused
4. Update the OpenAPI specification when adding endpoints

## License

MIT
