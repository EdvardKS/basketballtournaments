// Express app factory. Separated from index.ts so it can be imported by tests.
import express from "express";
import cors from "cors";
import session from "express-session";
import { config } from "./config.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const createApp = () => {
  const app = express();

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(session({
    name: config.cookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: !config.isDev,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use("/api", apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
