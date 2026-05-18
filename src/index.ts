import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/errorHandler";
import { userRoutes } from "./app/user/routes";
import { settingsRoutes } from "./app/settings/routes";

dotenv.config();
const app: Express = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://seal-client.vercel.app",
      "https://nextcareit.com",
      "https://www.nextcareit.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.get("/", (_req: Request, res: Response) =>
  res.send("ডাক্তার ম্যানেজমেন্ট সার্ভার")
);

app.use("/user", userRoutes);
app.use("/settings", settingsRoutes);

app.use(errorHandler);

app.listen(port, () => console.log(`Server running on port ${port}`));
