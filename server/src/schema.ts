import { createSchema } from "graphql-yoga";
import * as db from "./db";
import { GraphQLError } from "graphql";

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      info: Boolean!
    }

    type Lesson {
      roomID: String!
      name: String!
      moduleCode: String!
      lessonType: String!
      classNo: String!
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
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      deleteLesson(
        roomID: String!
        name: String!
        moduleCode: String!
        lessonType: String!
        classNo: String!
      ): Boolean

      createUser(roomID: String!, name: String!): Boolean
      updateUser(roomID: String!, oldname: String!, newname: String!): Boolean
      deleteUser(roomID: String!, name: String!): Boolean
    }

    type Subscription {
      lessonChange(roomNo: Int!): Boolean
      userChange(roomNo: Int!): Boolean
    }
  `,
  resolvers: {
    Mutation: {
      createUser: async (
        parent: unknown,
        args: { roomID: string; name: string },
      ) => {
        await db.createUser(args.roomID, args.name).catch(db.throwErr);
        return true;
      },

      updateUser: async (
        parent: unknown,
        args: { roomID: string; oldname: string; newname: string },
      ) => {
        await db
          .updateUser(args.roomID, args.oldname, args.newname)
          .catch(db.throwErr);
        return true;
      },

      deleteUser: async (
        parent: unknown,
        args: { roomID: string; name: string },
      ) => {
        await db.deleteUser(args.roomID, args.name).catch(db.throwErr);
        return true;
      },

      createLesson: async (
        parent: unknown,
        args: {
          roomID: string;
          name: string;
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

        db.createLesson(
          user.id,
          args.moduleCode,
          args.lessonType,
          args.classNo,
        ).catch(db.throwErr);

        return true;
      },

      deleteLesson: async (
        parent: unknown,
        args: {
          roomID: string;
          name: string;
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

        db.deleteLesson(
          user.id,
          args.moduleCode,
          args.lessonType,
          args.classNo,
        ).catch(db.throwErr);

        return true;
      },
    },

    Subscription: {},
  },
});
