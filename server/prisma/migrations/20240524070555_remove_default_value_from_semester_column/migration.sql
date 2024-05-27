-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lesson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "semester" INTEGER NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "classNo" TEXT NOT NULL,
    "userID" INTEGER NOT NULL,
    CONSTRAINT "Lesson_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("classNo", "id", "lessonType", "moduleCode", "semester", "userID") SELECT "classNo", "id", "lessonType", "moduleCode", "semester", "userID" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE UNIQUE INDEX "Lesson_userID_moduleCode_lessonType_classNo_key" ON "Lesson"("userID", "moduleCode", "lessonType", "classNo");
PRAGMA foreign_key_check("Lesson");
PRAGMA foreign_keys=ON;
