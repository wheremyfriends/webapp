# Server

## Prerequisite

- Functional PostgresQL Server
    - If using docker,
        `docker compose up -d` to start a PostgresQL instance

## Getting Started

Ensure that dependencies are installed
```
pnpm install
```

Create the database (dev)
```
pnpm migrate
```

Start the GraphQL server
```
pnpm start
```

Visit http://localhost:4000/graphql for Web UI
