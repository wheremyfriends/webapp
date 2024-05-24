import { Repeater, createPubSub, createSchema } from "graphql-yoga";
import * as db from "./db";
import { GraphQLError } from "graphql";
import { Lesson } from "@prisma/client";

interface LessonEvent {
  action: Action;
  name: string;
  semester: number;
  moduleCode: string;
  lessonType: string;
  classNo: string;
}

interface UserChangeEvent {
  action: Action;
  oldname?: string;
  name: string;
}

enum Action {
  CREATE_LESSON = "CREATE_LESSON",
  DELETE_LESSON = "DELETE_LESSON",
  DELETE_MODULE = "DELETE_MODULE",
  CREATE_USER = "CREATE_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",
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
    }

    type LessonChangeEvent {
      action: Action!
      name: String!
      semester: Int!
      moduleCode: String!
      lessonType: String!
      classNo: String!
    }

    type UserChangeEvent {
      action: Action!
      oldname: String
      name: String!
    }

    type User {
      id: Int!
      roomID: String!
      name: String!
    }

    type Mutation {
      createLesson(
        roomID: String!
        name: String!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteLesson(
        roomID: String!
        name: String!
        semester: Int!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteModule(
        roomID: String!
        name: String!
        semester: Int!
        moduleCode: String!
      ): Boolean

      createUser(roomID: String!, name: String!): Boolean
      updateUser(roomID: String!, oldname: String!, newname: String!): Boolean
      deleteUser(roomID: String!, name: String!): Boolean
    }

    type Subscription {
      lessonChange(roomID: String!): LessonChangeEvent
      userChange(roomID: String!): UserChangeEvent
    }
  `,
  resolvers: {
    Mutation: {
      createUser: async (
        parent: unknown,
        args: { roomID: string; name: string },
      ) => {
        await db.createUser(args.roomID, args.name).catch(db.throwErr);

        const u = {
          action: Action.CREATE_USER,
          name: args.name,
        };
        pubSub.publish("room:user", args.roomID, u);

        return true;
      },

      updateUser: async (
        parent: unknown,
        args: { roomID: string; oldname: string; newname: string },
      ) => {
        await db
          .updateUser(args.roomID, args.oldname, args.newname)
          .catch(db.throwErr);

        const u = {
          action: Action.UPDATE_USER,
          oldname: args.oldname,
          name: args.newname,
        };

        pubSub.publish("room:user", args.roomID, u);

        return true;
      },

      deleteUser: async (
        parent: unknown,
        args: { roomID: string; name: string },
      ) => {
        await db.deleteUser(args.roomID, args.name).catch(db.throwErr);

        const u = {
          action: Action.DELETE_USER,
          name: args.name,
        };

        pubSub.publish("room:user", args.roomID, u);
        return true;
      },

      createLesson: async (
        parent: unknown,
        args: {
          roomID: string;
          name: string;
          semester: number;
          moduleCode: string;
          lessonType: string;
          classNo: string;
        },
      ) => {
        const user = await db
          .readUser(args.roomID, args.name)
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
          name: user.name,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };
        pubSub.publish("room:lesson", args.roomID, l);

        return true;
      },

      deleteLesson: async (
        parent: unknown,
        args: {
          roomID: string;
          name: string;
          semester: number;
          moduleCode: string;
          lessonType: string;
          classNo: string;
        },
      ) => {
        const user = await db
          .readUser(args.roomID, args.name)
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
          name: user.name,
          semester: args.semester,
          moduleCode: args.moduleCode,
          lessonType: args.lessonType,
          classNo: args.classNo,
        };
        pubSub.publish("room:lesson", args.roomID, l);
        return true;
      },

      deleteModule: async (
        parent: unknown,
        args: {
          roomID: string;
          name: string;
          semester: number;
          moduleCode: string;
        },
      ) => {
        const user = await db
          .readUser(args.roomID, args.name)
          .catch(db.throwErr);

        if (user == undefined)
          return Promise.reject(new GraphQLError("User not found"));

        const deletedLessons = await db
          .deleteModule(user.id, args.semester, args.moduleCode)
          .catch(db.throwErr);

        const l = {
          action: Action.DELETE_MODULE,
          name: user.name,
          semester: args.semester,
          moduleCode: args.moduleCode,
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
                  name: l.user.name,
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
          console.log("New User WS Connection");
          console.log(args.roomID);

          // https://stackoverflow.com/questions/73924084/unable-to-get-initial-data-using-graphql-ws-subscription
          return Repeater.merge([
            new Repeater(async (push, stop) => {
              // Get initial values
              const users = await db
                .readUsersByRoom(args.roomID)
                .catch(db.throwErr);

              users.forEach((u: any) => {
                push({
                  action: Action.CREATE_USER,
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
