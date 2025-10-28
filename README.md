# Pàdelo API

This is the backend API for the Pàdelo application, built with NestJS, Prisma, and PostgreSQL.

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- [Node.js](https://nodejs.org/) (v22.x or later)
- [npm](https://www.npmjs.com/) (v10.x or later)
- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
- [Git](https://git-scm.com/)

## 1. Getting Started: Cloning the Repository

First, clone the project repository to your local machine.

```bash
git clone <your-repository-url>
cd padelo-api
```

## 2. Environment Configuration

The project uses a `.env` file for environment variables. Create one by copying the example file:

```bash
cp .env.example .env
```

Then, update the variables in the newly created `.env` file. A minimal configuration should contain the following for the database connection:

```env
# PostgreSQL Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"

# Default Admin for Seeding
DEFAULT_ADMIN_EMAIL=admin@test.dev
DEFAULT_ADMIN_PASSWORD=123qweasd

# JWT Secrets
JWT_SECRET=your-very-secret-key
JWT_REFRESH_SECRET=your-other-very-secret-key
```

**Note:** The `USER`, `PASSWORD`, and `DATABASE_NAME` must match the values used by the PostgreSQL service in the `docker-compose.yml` file.

## 3. Running the Application with Docker

The easiest way to get the application and its database running is by using Docker Compose.

```bash
docker-compose up -d
```

This command will start three services in detached mode:

- `padelo_api_app`: The NestJS application.
- `padelo_postgres_db`: The PostgreSQL database instance.
- `adminer`: A database management tool accessible at `http://localhost:8080`.

Once the containers are running, you need to apply the database migrations and seed the database with initial data.

```bash
# Apply database migrations
docker-compose exec padelo_api_app npm run prisma:migrate

# Seed the database with initial roles, permissions, and an admin user
docker-compose exec padelo_api_app npm run prisma:seed
```

The API will be available at `http://localhost:8000`.

### For Local Development

For active development, it is recommended to run the NestJS application on your host machine to take advantage of hot-reloading and have a faster feedback loop.

First, ensure the database is running via Docker, then **stop only the application container**.

```bash
# Start all services (if not already running)
docker-compose up -d

# Stop the app container
docker-compose stop padelo_api_app
```

Now, install the project dependencies and run the application in development mode on your local machine.

```bash
# Install dependencies
npm install

# Run database migrations (if you haven't already)
npm run prisma:migrate

# Run database seeder (if you haven't already)
npm run prisma:seed

# Start the app in watch mode
npm run start:dev
```

The application will connect to the PostgreSQL database running in Docker and will be available at `http://localhost:8000`.

## 4. Running Tests

The project includes unit tests and end-to-end (e2e) tests.

### Unit Tests

To run the unit tests, use the following command:

```bash
npm test
```

### End-to-End (E2E) Tests

There are two ways to run the e2e tests:

**1. Against the PostgreSQL Database (Recommended)**
This requires the Docker services to be running.

```bash
npm run test:e2e
```

**2. Against a temporary SQLite Database**
This is useful for quick checks without needing the full Docker environment. It automatically creates a temporary SQLite database for the test run.

```bash
npm run test:e2e:sqlite
```

**Note for Windows users:** The `test:e2e:sqlite` script uses `cross-env`. If you encounter issues, you may need to set the environment variable manually in your shell before running the test command.

## Available NPM Scripts

- `npm run build`: Compiles the TypeScript code.
- `npm run start:dev`: Starts the application in watch mode with hot-reloading.
- `npm run lint`: Lints the codebase and fixes auto-fixable issues.
- `npm run test`: Runs all unit tests.
- `npm run test:e2e`: Runs end-to-end tests against the main database.
- `npm run prisma:migrate`: Creates and applies a new database migration based on schema changes.
- `npm run prisma:seed`: Seeds the database with initial data.
- `npm run format`: Formats the code using Prettier.
