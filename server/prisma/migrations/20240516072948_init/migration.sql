-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roomID" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduleCode" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,
    CONSTRAINT "Lesson_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_roomID_name_key" ON "User"("roomID", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_userID_moduleCode_lessonType_classNo_key" ON "Lesson"("userID", "moduleCode", "lessonType", "classNo");
