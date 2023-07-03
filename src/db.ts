import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Connect to ElephantSQL PostgreSQL database
const client = new Client({
  connectionString: process.env.DB_CONNECTION_STRING,
});

export const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to ElephantSQL");
  } catch (err) {
    console.error("Error connecting to ElephantSQL:", err);
  }
};

export async function disconnectDatabase() {
  try {
    await client.end();
    console.log("Disconnected from the ElephantSQL");
  } catch (error) {
    console.error("Error disconnecting from the ElephantSQL:", error);
    throw error;
  }
}

export function getClient() {
  return client;
}
