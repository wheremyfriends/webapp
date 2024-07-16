/*
  Warnings:

  - You are about to drop the column `moduleCode` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `userID` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `roomID` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[moduleID,lessonType,classNo]` on the table `lesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `moduleID` to the `lesson` table without a default value. This is not possible if the table is not empty.

*/

CREATE TABLE "lesson_bak" AS
SELECT * FROM "lesson";

CREATE TABLE "user_bak" AS
SELECT * FROM "user";

DELETE FROM "lesson";
DELETE FROM "user";

-- DropForeignKey
ALTER TABLE "lesson" DROP CONSTRAINT "lesson_userID_fkey";

-- DropIndex
DROP INDEX "lesson_userID_semester_moduleCode_lessonType_classNo_key";

-- DropIndex
DROP INDEX "user_roomID_name_key";

-- AlterTable
ALTER TABLE "lesson" DROP COLUMN "moduleCode",
DROP COLUMN "semester",
DROP COLUMN "userID",
ADD COLUMN     "moduleID" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "name",
DROP COLUMN "roomID";

-- CreateTable
CREATE TABLE "authuser" (
    "userID" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "authuser_pkey" PRIMARY KEY ("userID")
);

-- CreateTable
CREATE TABLE "module" (
    "id" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "colorIndex" INTEGER NOT NULL,

    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" SERIAL NOT NULL,
    "uri" TEXT NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_room" (
    "userID" INTEGER NOT NULL,
    "roomID" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "user_room_pkey" PRIMARY KEY ("userID","roomID")
);

-- CreateTable
CREATE TABLE "config" (
    "userID" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "config_pkey" PRIMARY KEY ("userID")
);

-- CreateIndex
CREATE UNIQUE INDEX "authuser_username_key" ON "authuser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "module_userID_semester_moduleCode_key" ON "module"("userID", "semester", "moduleCode");

-- CreateIndex
CREATE UNIQUE INDEX "room_uri_key" ON "room"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "user_room_roomID_name_key" ON "user_room"("roomID", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_moduleID_lessonType_classNo_key" ON "lesson"("moduleID", "lessonType", "classNo");

-- AddForeignKey
ALTER TABLE "authuser" ADD CONSTRAINT "authuser_userID_fkey" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_moduleID_fkey" FOREIGN KEY ("moduleID") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module" ADD CONSTRAINT "module_userID_fkey" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_room" ADD CONSTRAINT "user_room_userID_fkey" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_room" ADD CONSTRAINT "user_room_roomID_fkey" FOREIGN KEY ("roomID") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config" ADD CONSTRAINT "config_userID_fkey" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate the data

INSERT INTO "room" ("uri")
SELECT DISTINCT "roomID" FROM "user_bak";

INSERT INTO "user"
SELECT "id" FROM "user_bak";

INSERT INTO "user_room" ("roomID", "userID", "name")
SELECT "room"."id" as "roomID", "user_bak"."id" AS "userID", name
FROM "user_bak", "room"
WHERE "room"."uri" = "user_bak"."roomID";

INSERT INTO "module" ("userID", "semester", "moduleCode", "colorIndex")
SELECT DISTINCT "userID", "semester", "moduleCode", 1
FROM "lesson_bak";

INSERT INTO "lesson" ("moduleID", "lessonType", "classNo")
SELECT "module"."id", "lessonType", "classNo"
FROM "lesson_bak", "module"
WHERE "lesson_bak"."userID" = "module"."userID"
AND "lesson_bak"."semester" = "module"."semester"
AND "lesson_bak"."moduleCode" = "module"."moduleCode";

DROP TABLE "user_bak";
DROP TABLE "lesson_bak";
