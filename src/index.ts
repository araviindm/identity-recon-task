import express from "express";
import bodyParser from "body-parser";
import { connectToDatabase, disconnectDatabase } from "./db";
import { identify } from "./routes";
import { initDataBase } from "./routes";
import swaggerUi from "swagger-ui-express";
import * as swaggerDocument from "./swagger.json";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.get("/", (_, res) => {
  res.send("Identity recon app is running");
});

// Connect to the database
connectToDatabase().catch((error) => {
  console.error("Failed to connect to the ElephantSQL:", error);
  process.exit(1);
});

// API routes
app.post("/api/init", initDataBase);
app.post("/api/identify", identify);

// Swagger UI documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

process.on("SIGINT", async () => {
  try {
    await disconnectDatabase();
    process.exit();
  } catch (error) {
    console.error("Failed to disconnect from the ElephantSQL:", error);
    process.exit(1);
  }
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
