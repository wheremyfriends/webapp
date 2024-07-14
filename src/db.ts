import { Prisma, PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { GraphQLError } from "graphql";
import { sign } from "jsonwebtoken";
import { APP_SECRET } from "./auth";

export enum DB_ERR {
  UNIQUE_CONSTRAINT_FAILED = "P2002",
  RECORD_NOT_FOUND = "P2025",
}

export function throwErr(e: Prisma.PrismaClientKnownRequestError) {
  console.log({ e });
  if (e.code == DB_ERR.UNIQUE_CONSTRAINT_FAILED)
    return Promise.reject(new GraphQLError(`Record already exists`));

  if (e.code == DB_ERR.RECORD_NOT_FOUND)
    return Promise.reject(new GraphQLError(`Record not found`));

  return Promise.reject(e);
}

export async function roomExists(
  prisma: PrismaClient,
  roomID: string,
): Promise<boolean> {
  const users = await prisma.room.findMany({
    where: {
      uri: roomID,
    },
  });

  return users.length > 0;
}
export async function createUser(
  prisma: PrismaClient,
  roomID: string,
  name: string,
) {
  return prisma.usersOnRooms.create({
    data: {
      room: {
        connectOrCreate: {
          where: {
            uri: roomID,
          },
          create: {
            uri: roomID,
          },
        },
      },
      user: {
        create: {},
      },
      name,
    },
  });
}

export async function readUser(
  prisma: PrismaClient,
  roomID: string,
  userID: number,
) {
  return prisma.user.findUniqueOrThrow({
    where: {
      id: userID,
      rooms: {
        some: {
          room: {
            uri: roomID,
          },
        },
      },
    },
  });
}

export async function updateUser(
  prisma: PrismaClient,
  roomID: string,
  userID: number,
  newname: string,
) {
  const { count } = await prisma.usersOnRooms.updateMany({
    where: {
      user: {
        id: userID,
      },
      room: {
        uri: roomID,
      },
    },
    data: {
      name: newname,
    },
  });

  if (count <= 0) throw new GraphQLError("Record not found");
}

export async function deleteUser(
  prisma: PrismaClient,
  roomID: string,
  userID: number,
) {
  return await prisma.user.delete({
    where: {
      id: userID,
      rooms: {
        some: {
          room: {
            uri: roomID,
          },
        },
      },
    },
  });
}

export async function createLesson(
  prisma: PrismaClient,
  userID: number,
  semester: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  // TODO: Fix this
  while (true) {
    try {
      await prisma.module.upsert({
        where: {
          userID_semester_moduleCode: {
            userID,
            semester,
            moduleCode,
          },
        },
        update: {
          lessons: {
            create: {
              lessonType,
              classNo,
            },
          },
        },
        create: {
          userID,
          semester,
          moduleCode,
          colorIndex: 1,
          lessons: {
            create: {
              lessonType,
              classNo,
            },
          },
        },
      });
    } catch {
      continue;
    }
    break;
  }
}

export async function getRooms(prisma: PrismaClient, userID: number) {
  return prisma.room.findMany({
    where: {
      users: {
        some: {
          userID,
        },
      },
    },
  });
}

export async function readUsersByRoom(prisma: PrismaClient, roomID: string) {
  return prisma.usersOnRooms.findMany({
    where: {
      room: {
        uri: roomID,
      },
    },
    include: {
      user: {
        include: {
          authUser: true,
        },
      },
    },
  });
}

export async function readLessonsByRoom(prisma: PrismaClient, roomID: string) {
  return prisma.lesson.findMany({
    where: {
      module: {
        user: {
          rooms: {
            some: {
              room: {
                uri: roomID,
              },
            },
          },
        },
      },
    },
    include: {
      module: true,
    },
  });
}

export async function deleteLesson(
  prisma: PrismaClient,
  userID: number,
  semester: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  return await prisma.lesson.deleteMany({
    where: {
      module: {
        userID,
        semester,
        moduleCode,
      },
      lessonType,
      classNo,
    },
  });
}

export async function moduleDelete(
  prisma: PrismaClient,
  userID: number,
  semester: number,
  moduleCode: string,
) {
  return await prisma.module.deleteMany({
    where: {
      userID,
      semester,
      moduleCode,
    },
  });
}
export async function deleteFromLesson(
  prisma: PrismaClient,
  userID: number,
  semester: number,
  moduleCode?: string,
) {
  return await prisma.module.deleteMany({
    where: {
      userID,
      semester,
      moduleCode,
    },
  });
}

export async function authUserCreate(
  prisma: PrismaClient,
  username: string,
  password: string,
) {
  const SALT_LENGTH = 10;
  const pwHash = await hash(password, SALT_LENGTH);

  return prisma.user.create({
    data: {
      authUser: {
        create: {
          username,
          password: pwHash,
        },
      },
    },
  });
}

export async function authUserVerify(
  prisma: PrismaClient,
  username: string,
  password: string,
) {
  const user = await prisma.authUser.findUnique({
    where: { username },
  });

  if (!user) {
    return undefined;
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    return undefined;
  }

  const token = sign({ userId: user.userID }, APP_SECRET);
  return {
    user,
    token,
  };
}

export async function isAuthUserID(prisma: PrismaClient, userID: number) {
  return (
    (await prisma.authUser.count({
      where: {
        userID,
      },
    })) > 0
  );
}
