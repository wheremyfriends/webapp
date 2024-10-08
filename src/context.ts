import { AuthUser, PrismaClient } from "@prisma/client";
import { YogaInitialContext } from "graphql-yoga";
import { authenticateUser } from "./auth";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});

prisma.$on("query", async (e) => {
  console.log(`${e.query} ${e.params}`);
});

export type GraphQLContext = MyContext & YogaInitialContext;

type MyContext = {
  prisma: PrismaClient;
  currentUser: null | AuthUser;
};

export async function createContext(
  initialContext: YogaInitialContext,
): Promise<MyContext> {
  return {
    prisma,
    currentUser: await authenticateUser(prisma, initialContext.request),
  };
}
