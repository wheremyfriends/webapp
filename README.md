# Server

## Prerequisite

- Functional PostgreSQL Server
  - If using docker,
    `docker compose up -d` to start a PostgreSQL instance
- Change the configuration located in `.env.dev` (if necessary)

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

## Database Design

```mermaid
erDiagram
    Module {
        number id
        number semester
        string moduleCode
        number colorIndex
        boolean isfocused
        boolean ishidden
    }

    Lesson {
        number id
        string lessonType
        string classNo
    }

    User {
        number id
    }

    AuthUser {
       string username
       string password
    }

    Room {
        number id
        string uri
    }

    UserRoom {
        string name
    }

    Module ||--o{ Lesson : has
    User ||--o| AuthUser : has
    User ||--o{ Module : has
    User ||--o{ UserRoom : joins
    Room ||--o{ UserRoom : joins
```
