import { Prisma, PrismaClient, User } from "@prisma/client";
import { GraphQLError } from "graphql";

const prisma = new PrismaClient();

enum DB_ERR {
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

export async function createUser(roomID: string, name: string) {
  return prisma.user.create({
    data: {
      roomID,
      name,
    },
  });
}

export async function readUser(roomID: string, name: string) {
  return prisma.user.findUnique({
    where: {
      roomID_name: {
        roomID,
        name: name,
      },
    },
  });
}

export async function updateUser(
  roomID: string,
  oldname: string,
  newname: string,
) {
  return prisma.user.update({
    where: {
      roomID_name: {
        roomID,
        name: oldname,
      },
    },
    data: {
      name: newname,
    },
  });
}

export async function deleteUser(roomID: string, name: string) {
  return prisma.user.delete({
    where: {
      roomID_name: {
        roomID,
        name: name,
      },
    },
  });
}

export async function createLesson(
  userID: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  return prisma.lesson.create({
    data: {
      moduleCode,
      lessonType,
      classNo,
      userID,
    },
  });
}

export async function deleteLesson(
  userID: number,
  moduleCode: string,
  lessonType: string,
  classNo: string,
) {
  return prisma.lesson.deleteMany({
    where: {
      moduleCode,
      lessonType,
      classNo,
      userID,
    },
  });
}
