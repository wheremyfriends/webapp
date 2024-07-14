import { AuthUser, PrismaClient } from "@prisma/client";
import { JwtPayload, verify } from "jsonwebtoken";
import { isAuthUserID, readUser } from "./db";
import { GraphQLError } from "graphql";

export const APP_SECRET = process.env["APP_SECRET"]!;

export async function authenticateUser(
  prisma: PrismaClient,
  request: Request,
): Promise<AuthUser | null> {
  const token = await request?.cookieStore?.get("authorization");

  if (!token) return null;

  const tokenPayload = verify(token.value, APP_SECRET) as JwtPayload;
  const userId = tokenPayload.userId;

  return prisma.authUser.findUnique({ where: { userID: userId } });
}

export async function authGuard(
  prisma: PrismaClient,
  roomURI: string | undefined,
  userID: number,
  currentUser: AuthUser | null,
) {
  if (await isAuthUserID(prisma, userID)) {
    // If authorised, then the JWT must match the userID
    if (currentUser?.userID === userID) return;
  } else if (roomURI) {
    // If anonymous user, then the roomID and userID must tally
    const user = await readUser(prisma, roomURI, userID);
    if (user) return;
  }

  console.log("Unauthorised");
  throw new GraphQLError("Unauthorised");
}
