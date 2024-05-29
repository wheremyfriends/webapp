# Server

## Getting Started

Ensure that dependencies are installed
```
pnpm install
```

Create the database (dev)
```
pnpm prisma migrate dev
```

Create the database (prod)
```
pnpm prisma migrate deploy
```

Start the GraphQL server
```
pnpm start
```

Visit http://localhost:4000/graphql for Web UI
