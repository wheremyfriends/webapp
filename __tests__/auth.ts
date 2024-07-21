import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { PrismaClient } from "@prisma/client";
import { globalSetup, GRAPHQL_URL, sendGraphQL } from "../src/test_utils";
import { authUserCreate } from "../src/db";
jest.setTimeout(5 * 60 * 1000); // ms

describe("CRUD of Anonymous User", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    const out = await globalSetup();
    app = out.app;
    prisma = out.prisma;
  });

  afterAll(async () => {
    await app.stop();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "user" RESTART IDENTITY CASCADE ;`,
    );
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "room" RESTART IDENTITY CASCADE ;`,
    );
  });

  it("test register user", async () => {
    const username = "username";
    const password = "username";

    const query = `
      mutation fn($username: String!, $password: String!){
        registerUser(username: $username, password: $password)
      }
    `;

    await sendGraphQL(GRAPHQL_URL, query, {
      username,
      password,
    });

    expect(await prisma.authUser.count()).toStrictEqual(1);
  });

  it("test successful login", async () => {
    const username = "username";
    const password = "username";

    const query = `
      mutation fn($username: String!, $password: String!){
        loginUser(username: $username, password: $password){userID}
      }
    `;

    await authUserCreate(prisma, username, password);

    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      username,
      password,
    });

    expect(resp).not.toHaveProperty("errors");
    expect(resp.data.loginUser).not.toBeNull();
  });

  it("test failed login", async () => {
    const username = "username";
    const password = "username";

    const query = `
      mutation fn($username: String!, $password: String!){
        loginUser(username: $username, password: $password){userID}
      }
    `;

    await authUserCreate(prisma, username, password);

    const resp = await sendGraphQL(GRAPHQL_URL, query, {
      username,
      password: "wrong password",
    });

    expect(resp).toHaveProperty("errors");
    expect(resp.errors[0].message).toStrictEqual("Login failed");
  });
});
