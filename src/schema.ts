import { Repeater, createPubSub, createSchema } from "graphql-yoga";
import * as db from "./db";
import * as userGen from "./userGen";
import { GraphQLError } from "graphql";
import { User } from "@prisma/client";

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
}>();

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      info: Boolean!
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
    }

    type User {
      roomID: String!
      userID: Int!
      name: String!
    }

    type Mutation {
      createLesson(
        roomID: String!
        userID: Int!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteLesson(
        roomID: String!
        userID: Int!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteModule(
        roomID: String!
        userID: Int!
        semester: Int!
        moduleCode: String!
      ): Boolean

      resetTimetable(roomID: String!, userID: Int!, semester: Int!): Boolean

      createUser(roomID: String!): Boolean
      updateUser(roomID: String!, userID: Int!, newname: String!): Boolean
      deleteUser(roomID: String!, userID: Int!): Boolean
    }

    type Subscription {
      lessonChange(roomID: String!): LessonChangeEvent
      userChange(roomID: String!): UserChangeEvent
    }
  `,
  resolvers: {
    Mutation: {
      createUser: async (_: unknown, args: { roomID: string }) => {
        const user = await userGen.getUsername(args.roomID);

        if (user == undefined) return new GraphQLError("Failed to create user");

        const u = {
          action: Action.CREATE_USER,
          userID: user.id,
          name: user.name,
        };
        pubSub.publish("room:user", args.roomID, u);

        return true;
      },

      updateUser: async (
        _: unknown,
        args: { roomID: string; userID: number; newname: string },
      ) => {
        await db
          .updateUser(args.roomID, args.userID, args.newname)
          .catch(db.throwErr);

        const u = {
          action: Action.UPDATE_USER,
          userID: args.userID,
          name: args.newname,
        };

        pubSub.publish("room:user", args.roomID, u);

        return true;
      },

      deleteUser: async (
        _: unknown,
        args: { roomID: string; userID: number },
      ) => {
        const deletedUser = await db
          .deleteUser(args.roomID, args.userID)
          .catch(db.throwErr);

        const u = {
          action: Action.DELETE_USER,
          userID: args.userID,
          name: deletedUser.name,
        };

        pubSub.publish("room:user", args.roomID, u);
        return true;
      },

      createLesson: async (
        _: unknown,
        args: {
          roomID: string;
          userID: number;
          semester: number;
          moduleCode: string;
          lessonType: string;
          classNo: string;
        },
      ) => {
        const user = await db
          .readUser(args.roomID, args.userID)
          .catch(db.throwErr);

        if (user == undefined)
          return Promise.reject(new GraphQLError("User not found"));

        await db
          .createLesson(
            user.id,
            args.semester,
            args.moduleCode,
            args.lessonType,
            args.classNo,
          )
          .catch(db.throwErr);

        const l = {
          action: Action.CREATE_LESSON,
          userID: user.id,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };
        pubSub.publish("room:lesson", args.roomID, l);

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
      ) => {
        const user = await db
          .readUser(args.roomID, args.userID)
          .catch(db.throwErr);

        if (user == undefined)
          return Promise.reject(new GraphQLError("User not found"));

        await db
          .deleteLesson(
            user.id,
            args.semester,
            args.moduleCode,
            args.lessonType,
            args.classNo,
          )
          .catch(db.throwErr);

        const l = {
          action: Action.DELETE_LESSON,
          userID: user.id,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };
        pubSub.publish("room:lesson", args.roomID, l);
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
      ) => {
        const user = await db
          .readUser(args.roomID, args.userID)
          .catch(db.throwErr);

        if (user == undefined)
          return Promise.reject(new GraphQLError("User not found"));

        await db
          .deleteFromLesson(user.id, args.semester, args.moduleCode)
          .catch(db.throwErr);

        const l = {
          action: Action.DELETE_MODULE,
          userID: user.id,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: "",
          classNo: "",
        };
        pubSub.publish("room:lesson", args.roomID, l);

        return true;
      },

      resetTimetable: async (
        _: unknown,
        args: {
          roomID: string;
          userID: number;
          semester: number;
        },
      ) => {
        const user = await db
          .readUser(args.roomID, args.userID)
          .catch(db.throwErr);

        if (user == undefined)
          return Promise.reject(new GraphQLError("User not found"));

        await db.deleteFromLesson(user.id, args.semester).catch(db.throwErr);

        const l = {
          action: Action.RESET_TIMETABLE,
          userID: user.id,
          semester: args.semester,
          moduleCode: "",
          lessonType: "",
          classNo: "",
        };
        pubSub.publish("room:lesson", args.roomID, l);

        return true;
      },
    },

    Subscription: {
      lessonChange: {
        subscribe: async (_, args: { roomID: string }) => {
          console.log("New WS Connection");
          console.log(args.roomID);

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const lessons = await db
                .readLessonsByRoom(args.roomID)
                .catch(db.throwErr);

              lessons.forEach((l: any) => {
                push({
                  action: Action.CREATE_LESSON,
                  userID: l.user.id,
                  semester: l.semester,
                  moduleCode: l.moduleCode,
                  lessonType: l.lessonType,
                  classNo: l.classNo,
                });
              });
              await stop;
            }),
            pubSub.subscribe("room:lesson", args.roomID),
          ]);
        },
        resolve: (payload) => {
          return payload;
        },
      },

      userChange: {
        subscribe: async (_, args: { roomID: string }) => {
          console.log(`New userChange Subscription: ${args.roomID}`);

          // Create user if doesn't exist yet
          if (!(await db.roomExists(args.roomID))) {
            await userGen.getUsername(args.roomID);
          }

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const users = await db
                .readUsersByRoom(args.roomID)
                .catch(db.throwErr);

              users.forEach((u: User) => {
                push({
                  action: Action.CREATE_USER,
                  userID: u.id,
                  name: u.name,
                });
              });
              await stop;
            }),
            pubSub.subscribe("room:user", args.roomID),
          ]);
        },
        resolve: (payload) => {
          return payload;
        },
      },
    },
  },
});
