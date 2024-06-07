import { User } from "@prisma/client";
import * as db from "./db";

export async function getUsername(roomID: string) {
  const users = await db.readUsersByRoom(roomID);

  if (users.length == 0) return "User 1";

  const userIDs = users.map((u: User) => u.id);
  return `User ${Math.max(...userIDs) + 1}`;
}
