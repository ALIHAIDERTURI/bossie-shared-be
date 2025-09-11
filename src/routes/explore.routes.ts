import { Router, Request, Response } from "express";
import { exploreController } from "../controllers";

export const exploreRouter: Router = Router();

exploreRouter.post("/getExplore", (...args: [Request, Response]) =>
  exploreController.getExplore(...args)
);

exploreRouter.post("/alterLike", (...args: [Request, Response]) =>
  exploreController.alterLike(...args)
);

exploreRouter.get("/getProfileById", (...args: [Request, Response]) =>
  exploreController.getProfileById(...args)
);

exploreRouter.post("/reportUser", (...args: [Request, Response]) =>
  exploreController.reportUser(...args)
);
