import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Load env before reading process.env
dotenv.config();

const dbName = process.env.MONGODB_DB_NAME || "CineTrack";

let client;
let db;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[db] MONGODB_URI missing; using in-memory fallback");
    return null;
  }

  if (!client) {
    client = new MongoClient(uri);
  }

  if (!db) {
    await client.connect();
    db = client.db(dbName);
  }

  return db;
}

export async function getCollection(name) {
  const database = await getDb();
  if (!database) return null;
  return database.collection(name);
}
