import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { useServer } from "graphql-ws/lib/use/ws";
import { schema } from "./schema";
import { WebSocketServer } from "ws";
import { Socket } from "node:net";

// // Start the server and you're done!
// server.listen(4000, () => {
//   console.info("Server is running on http://localhost:4000/graphql");
// });
//
export function buildApp() {
  const yoga = createYoga({
    landingPage: false,
    graphiql: {
      subscriptionsProtocol: "WS",
    },
    schema,
  });

  const server = createServer(yoga);
  const wss = new WebSocketServer({
    server,
    path: yoga.graphqlEndpoint,
  });

  useServer(
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: (args: any) => args.execute(args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscribe: (args: any) => args.subscribe(args),
      onSubscribe: async (ctx, msg) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } =
          yoga.getEnveloped({
            ...ctx,
            req: ctx.extra.request,
            socket: ctx.extra.socket,
            params: msg.payload,
          });

        const args = {
          schema,
          operationName: msg.payload.operationName,
          document: parse(msg.payload.query),
          variableValues: msg.payload.variables,
          contextValue: await contextFactory(),
          execute,
          subscribe,
        };

        const errors = validate(args.schema, args.document);
        if (errors.length) return errors;
        return args;
      },
    },
    wss,
  );

  // for termination
  const sockets = new Set<Socket>();
  server.on("connection", (socket) => {
    sockets.add(socket);
    server.once("close", () => sockets.delete(socket));
  });

  return {
    start: (port: number) =>
      new Promise<void>((resolve, reject) => {
        server.on("error", (err) => reject(err));
        server.on("listening", () => resolve());
        server.listen(port);
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) {
          socket.destroy();
          sockets.delete(socket);
        }
        server.close(() => resolve());
      }),
  };
}
