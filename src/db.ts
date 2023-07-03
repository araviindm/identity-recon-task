import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Connect to ElephantSQL PostgreSQL database
export const client = new Client({
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
