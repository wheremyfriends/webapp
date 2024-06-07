-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "roomID" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" SERIAL NOT NULL,
    "semester" INTEGER NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roomID_name_key" ON "user"("roomID", "name");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_userID_semester_moduleCode_lessonType_classNo_key" ON "lesson"("userID", "semester", "moduleCode", "lessonType", "classNo");

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_userID_fkey" FOREIGN KEY ("userID") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
