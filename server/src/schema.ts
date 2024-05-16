import { Repeater, createPubSub, createSchema } from "graphql-yoga";
import * as db from "./db";
import { GraphQLError } from "graphql";

interface Lesson {
  name: string;
  moduleCode: string;
  lessonType: string;
  classNo: string;
}

const pubSub = createPubSub<{
  "room:lesson": [roomID: string];
}>();

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      info: Boolean!
    }

    type Lesson {
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
      lessonChange(roomID: String!): Lesson
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

        await db.createLesson(
          user.id,
          args.moduleCode,
          args.lessonType,
          args.classNo,
        );

        const l = {
          name: user.name,
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
          .deleteLesson(user.id, args.moduleCode, args.lessonType, args.classNo)
          .catch(db.throwErr);

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
              const l = {
                name: "Name",
                moduleCode: "CS2040C",
                lessonType: "Lecture",
                classNo: "1A",
              };
              push(l);
              await stop;
            }),
            pubSub.subscribe("room:lesson", args.roomID),
          ]);
        },
        resolve: (payload) => {
          console.log(`Payload: ${payload}`);
          return payload;
        },
      },
    },
  },
});
