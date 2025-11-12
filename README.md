# expense-detective

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **tRPC** - End-to-end type-safe APIs
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see your fullstack application.
Use the Expo Go app to run the mobile application.

## Project Structure

```
expense-detective/
├── apps/
│   └── web/         # Fullstack application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run dev:native`: Start the React Native/Expo development server
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:studio`: Open database studio UI

## Next Steps

1. Navigate to the project directory:

   ```bash
   cd .
   ```

2. Start the development server:
   ```bash
   pnpm run dev
   ```

Your project will be available at:

- **Frontend**: http://localhost:3001

### Expo Connectivity

For Expo connectivity issues, update `apps/native/.env` with your local IP address:

```bash
EXPO_PUBLIC_SERVER_URL=http://<YOUR_LOCAL_IP>:3001
```

### Database Commands

- **Apply schema**: `pnpm run db:push`
- **Database UI**: `pnpm run db:studio`

### Linting and Formatting

- **Format and lint fix**: `pnpm run check`

### Polar Payments Setup

- Get access token & product ID from https://sandbox.polar.sh/
- Set `POLAR_ACCESS_TOKEN` in `apps/web/.env`

---

Like Better-T-Stack? Please consider giving us a star on GitHub:
https://github.com/AmanVarshney01/create-better-t-stack
