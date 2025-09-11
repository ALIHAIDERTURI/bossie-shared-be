import {
  adminService,
  exploreService,
  forumService,
  notificationService,
  requestService,
  socketService,
  uploadService,
  userService,
} from "@src/services";
import { UserController } from "./users.controller";
import { NotificationController } from "./notification.controller";
import { ForumController } from "./forum.controller";
import { SocketController } from "./socket.controller";
import { ExploreController } from "./explore.controller";
import { AdminController } from "./admin.controller";
import { RequestController } from "./request.controller";
import { UploadController } from "./upload.controller";

export const userController: UserController = new UserController(userService);
export const notificationController: NotificationController =
  new NotificationController(notificationService);
export const forumController: ForumController = new ForumController(
  forumService
);
export const socketController: SocketController = new SocketController(
  socketService
);
export const exploreController: ExploreController = new ExploreController(
  exploreService
);
export const adminControler: AdminController = new AdminController(
  adminService
);
export const requestController: RequestController = new RequestController(
  requestService
);
export const uploadController: UploadController = new UploadController(
  uploadService
);
