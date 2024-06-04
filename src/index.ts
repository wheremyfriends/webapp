import { buildApp } from "./app";

async function main(portNo: number = 4000) {
  const app = buildApp();
  await app.start(portNo);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
