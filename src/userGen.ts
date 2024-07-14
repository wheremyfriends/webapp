import { PrismaClient, UsersOnRooms } from "@prisma/client";
import * as db from "./db";
import { Roarr as log } from "roarr";

const ADJECTIVES = [
  "Agile",
  "Bold",
  "Cute",
  "Dinky",
  "Eager",
  "Furry",
  "Gentle",
  "Hardy",
  "Inky",
  "Jumpy",
  "Keen",
  "Loyal",
  "Mild",
  "Nice",
  "Odd",
  "Plump",
  "Quick",
  "Rusty",
  "Spiny",
  "Tiny",
  "Ugly",
  "Vivid",
  "Wild",
  "Xenial",
  "Young",
  "Zesty",
];

const NOUNS = [
  "Ant",
  "Bat",
  "Cat",
  "Dog",
  "Eel",
  "Fish",
  "Goat",
  "Hare",
  "Ibex",
  "Jaguar",
  "Koala",
  "Lion",
  "Mole",
  "Newt",
  "Otter",
  "Puma",
  "Quail",
  "Rat",
  "Seal",
  "Toad",
  "Urial",
  "Vole",
  "Wolf",
  "Xerus",
  "Yak",
  "Zebra",
];

function getRandEle<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export async function getUsername(prisma: PrismaClient, roomID: string) {
  let tries = ADJECTIVES.length;

  let randName;
  while (tries-- > 0) {
    const left = getRandEle<string>(ADJECTIVES);
    const right = getRandEle<string>(NOUNS);

    randName = `${left} ${right}`;
    log({ randName }, "Generated name");

    try {
      return db.createUser(prisma, roomID, randName);
    } catch (e) {
      continue;
    }
  }

  return undefined;
}
