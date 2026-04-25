// Express app factory. Separated from index.ts so it can be imported by tests.
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

const PgSession = connectPgSimple(session);

export const createApp = () => {
  const app = express();

  // Trust the first hop (Docker bridge / future reverse proxy) so secure
  // cookies and req.ip work correctly when we eventually front the app
  // with nginx/traefik. Harmless when nothing is in front.
  app.set("trust proxy", 1);

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(session({
    store: new PgSession({
      pool,
      tableName: "session",
      // Table is provisioned by the migration `09_session_table.sql` so we
      // don't race with the first request (auto-create silently swallows
      // session writes if it hasn't finished yet).
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15, // seconds; clean expired rows every 15 min
    }),
    name: config.cookieName,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use("/api", apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
