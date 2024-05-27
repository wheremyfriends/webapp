/*
  Warnings:

  - A unique constraint covering the columns `[userID,semester,moduleCode,lessonType,classNo]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Lesson_userID_moduleCode_lessonType_classNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_userID_semester_moduleCode_lessonType_classNo_key" ON "Lesson"("userID", "semester", "moduleCode", "lessonType", "classNo");
