import { PrismaClient } from "@prisma/client";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { GenericContainer } from "testcontainers";

const POSTGRES_CONTAINER = "postgres:16.3-alpine3.20";
const POSTGRES_USER = "test";
const POSTGRES_PASSWORD = "test";
const POSTGRES_DB = "wamf";
const GRAPHQL_PORT = 8000;
export const GRAPHQL_URL = `http://localhost:${GRAPHQL_PORT}/graphql`;

const DEFAULT_POSTGRES_PORT = 5432;
const execAsync = promisify(exec);

async function startPSQL(
  containerName: string,
  postgresUser: string,
  postgresPassword: string,
  postgresDB: string,
  postgresPort: number = DEFAULT_POSTGRES_PORT,
): Promise<string> {
  // Start Postgres Container
  const container = await new GenericContainer(containerName)
    .withEnvironment({
      POSTGRES_USER: postgresUser,
      POSTGRES_PASSWORD: postgresPassword,
      POSTGRES_DB: postgresDB,
    })
    .withExposedPorts(postgresPort)
    .start();

  const dbPort = container.getMappedPort(postgresPort);

  const conURL = `postgresql://${postgresUser}:${postgresPassword}@localhost:${dbPort}/${postgresDB}`;
  console.log(`Connection URL: ${conURL}`);

  return conURL;
}

export async function sendGraphQL(url: string, query: string, variables: any) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}
export async function globalSetup() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  const { buildApp } = await import("../src/app");
  const app = buildApp();
  await app.start(GRAPHQL_PORT);

  return { prisma, app };
}
