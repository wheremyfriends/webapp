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

  it("add user", async () => {
    const roomID = "room1";

    const query = `
      mutation createUser($roomID: String!){
        createUser(roomID: $roomID)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, { roomID });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.usersOnRooms.findMany({
      where: {
        room: {
          uri: roomID,
        },
      },
    });

    expect(users).toHaveLength(1);
  });

  it("add second user", async () => {
    const roomID = "room1";
    // Setup
    await prisma.room.create({
      data: {
        uri: roomID,
        users: {
          create: {
            name: "User 1",
            user: { create: {} },
          },
        },
      },
    });

    const query = `
      mutation createUser($roomID: String!){
        createUser(roomID: $roomID)
      }
    `;
    const resp = await sendGraphQL(GRAPHQL_URL, query, { roomID });

    expect(resp).not.toHaveProperty("errors");

    const users = await prisma.usersOnRooms.findMany({
      where: {
        room: {
          uri: roomID,
        },
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
    await prisma.room.create({
      data: {
        uri: roomID,
        users: {
          create: [{ name: name, user: { create: { id: userID } } }],
        },
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

    const users = await prisma.usersOnRooms.findFirst({
      where: {
        user: {
          id: userID,
        },
        room: {
          uri: roomID,
        },
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
    await prisma.room.create({
      data: {
        uri: roomID,
        users: {
          create: [
            { name: name, user: { create: { id: 1 } } },
            { name: name2, user: { create: { id: 2 } } },
          ],
        },
      },
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
    await prisma.room.create({
      data: {
        uri: roomID,
        users: {
          create: {
            name: name,
            user: {
              create: {},
            },
          },
        },
      },
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

    const users = await prisma.usersOnRooms.findMany({
      where: {
        room: {
          uri: roomID,
        },
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
