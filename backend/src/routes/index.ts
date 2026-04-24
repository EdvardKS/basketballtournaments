// Mount all feature routers under /api.
import { Router } from "express";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { playersRouter } from "./players.js";
import { tournamentsRouter } from "./tournaments.js";
import { teamsRouter } from "./teams.js";
import { draftRouter } from "./draft.js";
import { matchesRouter } from "./matches.js";
import { tradesRouter } from "./trades.js";

export const apiRouter = Router();
apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/players", playersRouter);
apiRouter.use("/tournaments", tournamentsRouter);
apiRouter.use("/teams", teamsRouter);
apiRouter.use("/draft", draftRouter);
apiRouter.use("/matches", matchesRouter);
apiRouter.use("/trades", tradesRouter);
