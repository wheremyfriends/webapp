-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "roomID" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" SERIAL NOT NULL,
    "semester" INTEGER NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_roomID_name_key" ON "User"("roomID", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_userID_semester_moduleCode_lessonType_classNo_key" ON "Lesson"("userID", "semester", "moduleCode", "lessonType", "classNo");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
