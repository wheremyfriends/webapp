import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { PrismaClient } from "@prisma/client";
import { globalSetup, GRAPHQL_URL, sendGraphQL } from "../src/test_utils";
import { createLesson, createUser } from "../src/db";
jest.setTimeout(5 * 60 * 1000); // ms

describe("CRUD of lessons", () => {
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

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "user" RESTART IDENTITY CASCADE ;`,
    );
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "room" RESTART IDENTITY CASCADE ;`,
    );
  });

  it("test create lesson", async () => {
    const query = `mutation fn($roomID: String!, $userID: Int!, $semester: Int!, $moduleCode: String!, $lessonType: String!, $classNo: String!) {
      createLesson(
        roomID: $roomID
        userID: $userID
        semester: $semester
        moduleCode: $moduleCode
        lessonType: $lessonType
        classNo: $classNo
      )
    }`;

    const userID = (await createUser(prisma, "room1", "user1")).userID;

    await sendGraphQL(GRAPHQL_URL, query, {
      roomID: "room1",
      userID,
      semester: 1,
      moduleCode: "CS2040S",
      lessonType: "Lecture",
      classNo: "L01",
    });

    const val = await prisma.module.findMany({
      where: {
        user: {
          rooms: {
            some: {
              room: {
                uri: "room1",
              },
            },
          },
        },
        userID,
        semester: 1,
        moduleCode: "CS2040S",
        lessons: {
          some: {
            lessonType: "Lecture",
            classNo: "L01",
          },
        },
      },
    });

    expect(val).toHaveLength(1);
  });

  it("test delete lesson", async () => {
    const query = `mutation fn($roomID: String!, $userID: Int!, $semester: Int!, $moduleCode: String!, $lessonType: String!, $classNo: String!) {
      deleteLesson(
        roomID: $roomID
        userID: $userID
        semester: $semester
        moduleCode: $moduleCode
        lessonType: $lessonType
        classNo: $classNo
      )
    }`;

    const userID = (await createUser(prisma, "room1", "user1")).userID;
    await createLesson(prisma, userID, 1, "CS2040S", "Lecture", "L01");

    await sendGraphQL(GRAPHQL_URL, query, {
      roomID: "room1",
      userID,
      semester: 1,
      moduleCode: "CS2040S",
      lessonType: "Lecture",
      classNo: "L01",
    });

    const modules = await prisma.module.findMany({
      where: {
        user: {
          rooms: {
            some: {
              room: {
                uri: "room1",
              },
            },
          },
        },
        userID,
        semester: 1,
        moduleCode: "CS2040S",
      },
    });
    const lessons = await prisma.module.findMany({
      where: {
        user: {
          rooms: {
            some: {
              room: {
                uri: "room1",
              },
            },
          },
        },
        userID,
        semester: 1,
        moduleCode: "CS2040S",
        lessons: {
          some: {
            lessonType: "Lecture",
            classNo: "L01",
          },
        },
      },
    });

    expect(modules).toHaveLength(1);
    expect(lessons).toHaveLength(0);
  });

  it("test delete module", async () => {
    const query = `mutation fn($roomID: String!, $userID: Int!, $semester: Int!, $moduleCode: String!) {
      deleteModule(
        roomID: $roomID
        userID: $userID
        semester: $semester
        moduleCode: $moduleCode
      )
    }`;

    const userID = (await createUser(prisma, "room1", "user1")).userID;
    await createLesson(prisma, userID, 1, "CS2040S", "Lecture", "L01");

    await sendGraphQL(GRAPHQL_URL, query, {
      roomID: "room1",
      userID,
      semester: 1,
      moduleCode: "CS2040S",
    });

    const modules = await prisma.module.findMany({
      where: {
        user: {
          rooms: {
            some: {
              room: {
                uri: "room1",
              },
            },
          },
        },
        userID,
        semester: 1,
        moduleCode: "CS2040S",
      },
    });
    const lessons = await prisma.module.findMany({
      where: {
        user: {
          rooms: {
            some: {
              room: {
                uri: "room1",
              },
            },
          },
        },
        userID,
        semester: 1,
        moduleCode: "CS2040S",
        lessons: {
          some: {
            lessonType: "Lecture",
            classNo: "L01",
          },
        },
      },
    });

    expect(modules).toHaveLength(0);
    expect(lessons).toHaveLength(0);
  });
});
