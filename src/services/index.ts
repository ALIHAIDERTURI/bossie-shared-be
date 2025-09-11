import { AdminService } from "./admin.service";
import { ExploreService } from "./explore.service";
import { ForumService } from "./forum.service";
import { NotificationService } from "./notifications.service";
import { RequestService } from "./request.service";
import { SocketService } from "./socket.service";
import { UploadService } from "./upload.service";
import { UserService } from "./users.service";

const userService: UserService = new UserService();
const notificationService: NotificationService = new NotificationService();
const forumService: ForumService = new ForumService();
const socketService: SocketService = new SocketService();
const exploreService: ExploreService = new ExploreService();
const adminService: AdminService = new AdminService();
const requestService: RequestService = new RequestService();
const uploadService: UploadService = new UploadService();

export {
  notificationService,
  userService,
  forumService,
  socketService,
  exploreService,
  adminService,
  requestService,
  uploadService
};
