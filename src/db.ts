import { Prisma, PrismaClient, User } from "@prisma/client";
import { GraphQLError } from "graphql";

const prisma = new PrismaClient();

export enum DB_ERR {
  UNIQUE_CONSTRAINT_FAILED = "P2002",
  RECORD_NOT_FOUND = "P2025",
}

export function throwErr(e: Prisma.PrismaClientKnownRequestError) {
  if (e.code == DB_ERR.UNIQUE_CONSTRAINT_FAILED)
    return Promise.reject(new GraphQLError(`Record already exists`));

  if (e.code == DB_ERR.RECORD_NOT_FOUND)
    return Promise.reject(new GraphQLError(`Record not found`));

  return Promise.reject(e);
}

export async function roomExists(roomID: string): Promise<boolean> {
  const users = await prisma.user.findMany({
    where: {
      roomID,
    },
  });

  return users.length > 0;
}
export async function createUser(roomID: string, name: string) {
  return prisma.user.create({
    data: {
      roomID,
      name,
    },
  });
}

export async function readUser(roomID: string, userID: number) {
  return prisma.user.findUnique({
    where: {
      id: userID,
      roomID,
    },
  });
}

export async function updateUser(
  roomID: string,
  userID: number,
  newname: string,
) {
  return prisma.user.update({
    where: {
      roomID: roomID,
      id: userID,
    },
    data: {
      name: newname,
    },
  });
}

export async function deleteUser(roomID: string, userID: number) {
  return prisma.user.delete({
    where: {
      id: userID,
    },
  });
}

export async function createLesson(
  userID: number,
  semester: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  return prisma.lesson.create({
    data: {
      semester,
      moduleCode,
      lessonType,
      classNo,
      userID,
    },
  });
}

export async function readUsersByRoom(roomID: string) {
  return prisma.user.findMany({
    where: {
      roomID,
    },
  });
}

export async function readLessonsByRoom(roomID: string) {
  return prisma.lesson.findMany({
    where: {
      user: {
        roomID,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function deleteLesson(
  userID: number,
  semester: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  return prisma.lesson.delete({
    where: {
      userID_semester_moduleCode_lessonType_classNo: {
        semester,
        moduleCode,
        lessonType,
        classNo,
        userID,
      },
    },
  });
}

export async function deleteFromLesson(
  userID: number,
  semester: number,
  moduleCode?: string,
) {
  const condition: { [key: string]: number | string } = {
    userID,
    semester,
  };

  if (moduleCode != undefined) {
    condition["moduleCode"] = moduleCode;
  }

  const lessons = await prisma.lesson.findMany({
    where: condition,
  });

  await prisma.lesson.deleteMany({
    where: condition,
  });

  return lessons;
}
