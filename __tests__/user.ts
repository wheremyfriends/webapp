import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
  test,
} from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { GenericContainer } from "testcontainers";
import { createClient } from "graphql-ws";
import WebSocket from "ws";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const POSTGRES_CONTAINER = "postgres:16.3-alpine3.20";
const POSTGRES_USER = "test";
const POSTGRES_PASSWORD = "test";
const POSTGRES_DB = "wamf";
const GRAPHQL_PORT = 8000;
const GRAPHQL_URL = `http://localhost:${GRAPHQL_PORT}/graphql`;

const DEFAULT_POSTGRES_PORT = 5432;
const execAsync = promisify(exec);

jest.setTimeout(5 * 60 * 1000); // ms

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

async function sendGraphQL(url: string, query: string, variables: any) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}

describe("User", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    // There are 3 things to start
    // 1. DB Container
    // 2. Connection to the DB

    const conURL = await startPSQL(
      POSTGRES_CONTAINER,
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
    );

    process.env = { ...process.env, DATABASE_URL: conURL };
    await execAsync("pnpm prisma migrate deploy", {
      env: process.env,
    });

    prisma = new PrismaClient({
      datasourceUrl: conURL,
    });

    const { buildApp } = await import("../src/app");
    app = buildApp();
    await app.start(GRAPHQL_PORT);
  });

  afterAll(async () => {
    await app.stop();
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "user" RESTART IDENTITY CASCADE ;`,
    );
  });

  it("add user", async () => {
    const roomID = "room1";

    const query = `
      mutation arst($roomID: String!){
        createUser(roomID: $roomID)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, { roomID });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.user.findMany({
      where: {
        roomID,
      },
    });

    expect(users).toHaveLength(1);
  });

  it("add second user", async () => {
    const roomID = "room1";
    // Setup
    await prisma.user.create({
      data: {
        roomID,
        name: "User 1",
      },
    });

    const query = `
      mutation arst($roomID: String!){
        createUser(roomID: $roomID)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, { roomID });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.user.findMany({
      where: {
        roomID,
      },
    });

    expect(users).toHaveLength(2);
  });

  it("update user", async () => {
    const userID = 1;
    const roomID = "room1";
    const name = "user 1";
    const newname = "user 2";
    // Setup
    await prisma.user.create({
      data: {
        id: userID,
        roomID,
        name,
      },
    });

    const query = `
      mutation arst($roomID: String!, $userID: Int!, $newname: String!){
        updateUser(roomID: $roomID, userID: $userID, newname: $newname)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      roomID,
      userID,
      newname,
    });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.user.findUnique({
      where: {
        id: userID,
        roomID,
      },
    });

    expect(users).toHaveProperty("name", newname);
  });

  it("update non-existent user", async () => {
    const userID = 1;
    const roomID = "room1";
    const newname = "user 2";

    const query = `
      mutation arst($roomID: String!, $userID: Int!, $newname: String!){
        updateUser(roomID: $roomID, userID: $userID, newname: $newname)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      roomID,
      userID,
      newname,
    });

    expect(resp).toHaveProperty("errors");
    expect(resp["errors"][0]["message"]).toBe("Record not found");
  });

  it("update user name conflict", async () => {
    const roomID = "room1";
    const name = "user 1";
    const name2 = "user 2";

    // Setup
    await prisma.user.createMany({
      data: [
        {
          id: 1,
          roomID,
          name,
        },
        {
          id: 2,
          roomID,
          name: name2,
        },
      ],
    });

    const query = `
      mutation arst($roomID: String!, $userID: Int!, $newname: String!){
        updateUser(roomID: $roomID, userID: $userID, newname: $newname)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      roomID,
      userID: 2,
      newname: name,
    });

    expect(resp).toHaveProperty("errors");
    expect(resp["errors"][0]["message"]).toBe("Record already exists");
  });

  it("delete user", async () => {
    const userID = 1;
    const roomID = "room1";
    const name = "user 1";

    // Setup
    await prisma.user.createMany({
      data: [
        {
          id: userID,
          roomID,
          name,
        },
      ],
    });

    const query = `
      mutation arst($roomID: String!, $userID: Int!){
        deleteUser(roomID: $roomID, userID: $userID)
      }
    `;

    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      roomID,
      userID,
    });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.user.findMany({
      where: {
        roomID,
      },
    });

    expect(users).toHaveLength(0);
  });

  it("delete non-existent user", async () => {
    const userID = 1;
    const roomID = "room1";

    const query = `
      mutation arst($roomID: String!, $userID: Int!){
        deleteUser(roomID: $roomID, userID: $userID)
      }
    `;

    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      roomID,
      userID,
    });

    expect(resp).toHaveProperty("errors");
    expect(resp["errors"][0]["message"]).toBe("Record not found");
  });
});
