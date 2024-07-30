import {
  Repeater,
  YogaInitialContext,
  createPubSub,
  createSchema,
} from "graphql-yoga";
import * as db from "./db";
import * as userGen from "./userGen";
import { GraphQLError } from "graphql";

import { Roarr as log } from "roarr";
import { GraphQLContext } from "./context";
import { checkAuthOrAnon } from "./auth";

interface LessonEvent {
  action: Action;
  userID: number;
  semester: number;
  moduleCode: string;
  lessonType: string;
  classNo: string;
}

interface UserChangeEvent {
  action: Action;
  userID: number;
  name: string;
  isAuth: boolean;
}

enum Action {
  CREATE_LESSON = "CREATE_LESSON",
  DELETE_LESSON = "DELETE_LESSON",
  DELETE_MODULE = "DELETE_MODULE",
  CREATE_USER = "CREATE_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
  RESET_TIMETABLE = "RESET_TIMETABLE",
}

const pubSub = createPubSub<{
  "room:lesson": [roomID: string, payload: LessonEvent];
  "room:user": [roomID: string, payload: UserChangeEvent];
  "user:config": [userID: number, payload: string];
}>();

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type AuthUser {
      userID: Int!
      username: String!
    }

    type Query {
      getUser: AuthUser
      getRooms(userID: Int): [String]
      getConfig: [String]
    }

    enum Action {
      CREATE_LESSON
      DELETE_LESSON
      DELETE_MODULE
      CREATE_USER
      UPDATE_USER
      DELETE_USER
      RESET_TIMETABLE
    }

    type LessonChangeEvent {
      action: Action!
      userID: Int!
      semester: Int!
      moduleCode: String!
      lessonType: String!
      classNo: String!
    }

    type UserChangeEvent {
      action: Action!
      userID: Int!
      name: String!
      isAuth: Boolean!
    }

    type User {
      roomID: String!
      userID: Int!
      name: String!
    }

    type Mutation {
      createLesson(
        roomID: String
        userID: Int!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteLesson(
        roomID: String
        userID: Int!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteModule(
        roomID: String
        userID: Int!
        semester: Int!
        moduleCode: String!
      ): Boolean

      resetTimetable(roomID: String, userID: Int!, semester: Int!): Boolean

      joinRoom(roomID: String!): Boolean
      createUser(roomID: String!): Boolean
      updateUser(roomID: String!, userID: Int!, newname: String!): Boolean
      deleteUser(roomID: String!, userID: Int!): Boolean

      updateConfig(roomID: String, userID: Int!, data: String!): Boolean

      registerUser(username: String!, password: String!): Boolean
      loginUser(username: String!, password: String!): AuthUser
      logoutUser: Boolean
    }

    type Subscription {
      lessonChange(roomID: String!): LessonChangeEvent
      userChange(roomID: String!): UserChangeEvent
      configChange(userID: Int!): String
    }
  `,
  resolvers: {
    Query: {
      getUser: async (_: unknown, args: {}, context: GraphQLContext) => {
        return context.currentUser;
      },
      getRooms: async (
        _: unknown,
        args: { userID?: number },
        context: GraphQLContext,
      ) => {
        const userID = args.userID ? args.userID : context.currentUser?.userID;
        if (!userID) return [];

        return (await db.getRooms(context.prisma, userID)).map(
          (room) => room.uri,
        );
      },
      getConfig: async (_: unknown, args: {}, context: GraphQLContext) => {
        if (!context.currentUser) return [];

        return (
          await db.getRooms(context.prisma, context.currentUser.userID)
        ).map((room) => room.uri);
      },
    },
    Mutation: {
      createUser: async (
        _: unknown,
        args: { roomID: string },
        context: GraphQLContext,
      ) => {
        const user = await userGen.getUsername(context.prisma, args.roomID);

        if (user == undefined) return new GraphQLError("Failed to create user");

        const u = {
          action: Action.CREATE_USER,
          userID: user.userID,
          name: user.name,
          isAuth: false,
        };
        pubSub.publish("room:user", args.roomID, u);
        log(u, "createUser");

        return true;
      },

      joinRoom: async (
        _: unknown,
        args: { roomID: string },
        context: GraphQLContext,
      ) => {
        if (!context.currentUser) return false;

        await db.joinRoom(
          context.prisma,
          args.roomID,
          context.currentUser.userID,
        );

        // Send subscription to add user
        const u = {
          action: Action.CREATE_USER,
          userID: context.currentUser.userID,
          name: context.currentUser.username,
          isAuth: true,
        };

        pubSub.publish("room:user", args.roomID, u);
        log(u, "joinRoom");

        // Send subscription of all mods of user
        const lessons = await db.getLessons(context.prisma, {
          userID: context.currentUser.userID,
        });

        lessons.forEach((l) =>
          pubSub.publish("room:lesson", args.roomID, {
            action: Action.CREATE_LESSON,
            userID: l.module.userID,
            semester: l.module.semester,
            moduleCode: l.module.moduleCode,
            lessonType: l.lessonType,
            classNo: l.classNo,
          }),
        );

        return true;
      },

      updateUser: async (
        _: unknown,
        args: { roomID: string; userID: number; newname: string },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db
          .updateUser(context.prisma, args.roomID, args.userID, args.newname)
          .catch(db.throwErr);

        const isAuth = await db.isAuthUserID(context.prisma, args.userID);
        const u = {
          action: Action.UPDATE_USER,
          userID: args.userID,
          name: args.newname,
          isAuth,
        };

        pubSub.publish("room:user", args.roomID, u);
        log(u, "updateUser");

        return true;
      },

      deleteUser: async (
        _: unknown,
        args: { roomID: string; userID: number },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        const isAuth = await db.isAuthUserID(context.prisma, args.userID);

        let u;
        if (isAuth) {
          await db.leaveRoom(context.prisma, args.roomID, args.userID);
          const user = context.currentUser;

          u = {
            action: Action.DELETE_USER,
            userID: args.userID,
            name: "",
            isAuth: true,
          };
        } else {
          const user = await db
            .deleteUser(context.prisma, args.roomID, args.userID)
            .catch(db.throwErr);

          u = {
            action: Action.DELETE_USER,
            userID: args.userID,
            name: "",
            isAuth: user.authUser !== null,
          };
        }

        pubSub.publish("room:user", args.roomID, u);
        log(u, "deleteUser");

        return true;
      },

      createLesson: async (
        _: unknown,
        args: {
          roomID: string | undefined;
          userID: number;
          semester: number;
          moduleCode: string;
          lessonType: string;
          classNo: string;
        },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db
          .createLesson(
            context.prisma,
            args.userID,
            args.semester,
            args.moduleCode,
            args.lessonType,
            args.classNo,
          )
          .catch(db.throwErr);

        const l = {
          action: Action.CREATE_LESSON,
          userID: args.userID,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };

        const rooms = await db.getRooms(context.prisma, args.userID);
        rooms.forEach((room) => {
          pubSub.publish("room:lesson", room.uri, l);
          log(l, "createLesson");
        });

        return true;
      },

      deleteLesson: async (
        _: unknown,
        args: {
          roomID: string;
          userID: number;
          semester: number;
          moduleCode: string;
          lessonType: string;
          classNo: string;
        },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db
          .deleteLesson(
            context.prisma,
            args.userID,
            args.semester,
            args.moduleCode,
            args.lessonType,
            args.classNo,
          )
          .catch(db.throwErr);

        const l = {
          action: Action.DELETE_LESSON,
          userID: args.userID,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };

        const rooms = await db.getRooms(context.prisma, args.userID);
        rooms.forEach((room) => {
          pubSub.publish("room:lesson", room.uri, l);
          log(l, "deleteLesson");
        });

        return true;
      },

      deleteModule: async (
        _: unknown,
        args: {
          roomID: string;
          userID: number;
          semester: number;
          moduleCode: string;
        },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db.moduleDelete(
          context.prisma,
          args.userID,
          args.semester,
          args.moduleCode,
        );

        const l = {
          action: Action.DELETE_MODULE,
          userID: args.userID,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: "",
          classNo: "",
        };
        const rooms = await db.getRooms(context.prisma, args.userID);
        rooms.forEach((room) => {
          pubSub.publish("room:lesson", room.uri, l);
          log(l, "deleteModule");
        });

        return true;
      },

      resetTimetable: async (
        _: unknown,
        args: {
          roomID: string;
          userID: number;
          semester: number;
        },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db
          .deleteFromLesson(context.prisma, args.userID, args.semester)
          .catch(db.throwErr);

        const l = {
          action: Action.RESET_TIMETABLE,
          userID: args.userID,
          semester: args.semester,
          moduleCode: "",
          lessonType: "",
          classNo: "",
        };
        const rooms = await db.getRooms(context.prisma, args.userID);
        rooms.forEach((room) => {
          pubSub.publish("room:lesson", room.uri, l);
          log(l, "resetTimetable");
        });

        return true;
      },

      updateConfig: async (
        _: unknown,
        args: { roomID: string; userID: number; data: string },
        context: GraphQLContext,
      ) => {
        await checkAuthOrAnon(
          context.prisma,
          args.roomID,
          args.userID,
          context.currentUser,
        );

        await db.setConfig(context.prisma, args.userID, JSON.parse(args.data));

        pubSub.publish("user:config", args.userID, args.data);
        log(JSON.parse(args.data), "updateConfig");
      },

      // updateSol: async (
      //   _: unknown,
      //   args: { roomID: string; userID: number; data: string },
      //   context: GraphQLContext,
      // ) => {
      //   await authGuard(
      //     context.prisma,
      //     args.roomID,
      //     args.userID,
      //     context.currentUser,
      //   );
      //
      //   await db.setSolution(
      //     context.prisma,
      //     args.userID,
      //     JSON.parse(args.data),
      //   );
      // },

      registerUser: async (
        _: unknown,
        args: { username: string; password: string },
        context: GraphQLContext,
      ) => {
        await db.authUserCreate(context.prisma, args.username, args.password);
        return true;
      },

      loginUser: async (
        _: unknown,
        args: { username: string; password: string },
        context: GraphQLContext & YogaInitialContext,
      ) => {
        const res = await db.authUserVerify(
          context.prisma,
          args.username,
          args.password,
        );

        if (!res) {
          throw new GraphQLError("Login failed");
        }

        const { token, user } = res;

        // Set the cookie on the response
        context.request.cookieStore?.set({
          name: "authorization",
          sameSite: "strict",
          secure: true,
          domain: null,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
          value: token,
          httpOnly: true,
        });

        return user;
      },

      logoutUser: async (
        _: unknown,
        args: {},
        context: GraphQLContext & YogaInitialContext,
      ) => {
        // Set the cookie on the response
        context.request.cookieStore?.delete("authorization");
        return true;
      },
    },

    Subscription: {
      lessonChange: {
        subscribe: async (
          _,
          args: { roomID: string },
          context: GraphQLContext,
        ) => {
          log({ roomID: args.roomID }, "lessonChange subscription");

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const lessons = await db
                .getLessons(context.prisma, { roomID: args.roomID })
                .catch(db.throwErr);

              lessons.forEach((l) => {
                push({
                  action: Action.CREATE_LESSON,
                  userID: l.module.userID,
                  semester: l.module.semester,
                  moduleCode: l.module.moduleCode,
                  lessonType: l.lessonType,
                  classNo: l.classNo,
                });
              });
              await stop;
            }),
            pubSub.subscribe("room:lesson", args.roomID),
          ]);
        },
        resolve: (payload) => payload,
      },

      userChange: {
        subscribe: async (
          _,
          args: { roomID: string },
          context: GraphQLContext,
        ) => {
          log({ roomID: args.roomID }, "userChange subscription");

          // Create user if doesn't exist yet
          if (!(await db.roomExists(context.prisma, args.roomID)))
            await userGen.getUsername(context.prisma, args.roomID);

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const users = await db
                .getUsers(context.prisma, args.roomID)
                .catch(db.throwErr);

              users.forEach((u) => {
                push({
                  action: Action.CREATE_USER,
                  userID: u.user.id,
                  name: u.name,
                  isAuth: u.user.authUser !== null,
                });
              });
              await stop;
            }),
            pubSub.subscribe("room:user", args.roomID),
          ]);
        },
        resolve: (payload) => payload,
      },

      configChange: {
        subscribe: async (
          _,
          args: { userID: number },
          context: GraphQLContext,
        ) => {
          log({ userID: args.userID }, "configChange subscription");

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const config = await db
                .getConfig(context.prisma, args.userID)
                .catch(db.throwErr);

              if (config) push(JSON.stringify(config.data));
              await stop;
            }),
            pubSub.subscribe("user:config", args.userID),
          ]);
        },
        resolve: (payload) => payload,
      },
    },
  },
});
