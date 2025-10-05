import { Router, Request, Response } from "express";
import { notificationController } from "../controllers";

export const notificationRouter: Router = Router();

notificationRouter.put("/updateNotification", (...args: [Request, Response]) =>
  notificationController.updateNotification(...args)
);

notificationRouter.get("/getAllNotification", (...args: [Request, Response]) =>
  notificationController.getAllNotification(...args)
);

notificationRouter.get("/getUserReportInfoById", (...args: [Request, Response]) =>
  notificationController.getUserReportInfoById(...args)
);

notificationRouter.get("/getDuplicateDataByUserId", (...args: [Request, Response]) =>
  notificationController.getDuplicateDataByUserId(...args)
);

notificationRouter.get("/viewPreviousNotification", (...args: [Request, Response]) =>
  notificationController.viewPreviousNotification(...args)
);

notificationRouter.get("/getNotificationById", (...args: [Request, Response]) =>
  notificationController.getNotificationById(...args)
);

// New endpoints for notification management UI
notificationRouter.get("/getNotificationHistory", (...args: [Request, Response]) =>
  notificationController.getNotificationHistory(...args)
);

notificationRouter.get("/searchNotifications", (...args: [Request, Response]) =>
  notificationController.searchNotifications(...args)
);

notificationRouter.post("/resendNotification", (...args: [Request, Response]) =>
  notificationController.resendNotification(...args)
);

notificationRouter.get("/getNotificationDetails", (...args: [Request, Response]) =>
  notificationController.getNotificationDetails(...args)
);
