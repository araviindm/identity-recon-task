import express from "express";
import { connectToDatabase } from "./db";
import { hello } from "./routes";
import swaggerUi from "swagger-ui-express";
import * as swaggerDocument from "./swagger.json";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const router = express.Router();

app.get("/", (_, res) => {
  res.send("Identity recon app is running");
});
app.use("/api", router);

// Connect to the database
connectToDatabase();

// API routes
router.get("/hello", hello);

// Swagger UI documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
