import { Router } from "express";
import { userRouter } from "./users.routes";
import { notificationRouter } from "./notification.routes";
import { forumRouter } from "./forum.routes";
import { socketRouter } from "./socket.routes";
import { exploreRouter } from "./explore.routes";
import { adminRouter } from "./admin.routes";
import { requestRouter } from "./request.routes";
import { uploadRouter } from "./uploadFile.routes";

export const routes: Router = Router();

routes.use(
  "/",
  userRouter,
  notificationRouter,
  forumRouter,
  exploreRouter,
  adminRouter,
  requestRouter,
  uploadRouter,
  socketRouter
);
