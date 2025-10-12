import { Router, Request, Response } from "express";
import { userController } from "../controllers";

export const userRouter: Router = Router();

userRouter.post("/createAccount", (...args: [Request, Response]) =>
  userController.createAccount(...args)
);
userRouter.post("/resendOtp", (...args: [Request, Response]) =>
  userController.resendOtp(...args)
);
userRouter.post("/validateOtp", (...args: [Request, Response]) =>
  userController.validateOtp(...args)
);
userRouter.post("/forgotPassword", (...args: [Request, Response]) =>
  userController.forgotPassword(...args)
);
userRouter.post("/changePassword", (...args: [Request, Response]) =>
  userController.changePassword(...args)
);
userRouter.post("/loginUser", (...args: [Request, Response]) =>
  userController.loginUser(...args)
);
userRouter.post("/createProfile", (...args: [Request, Response]) =>
  userController.createProfile(...args)
);
userRouter.post("/addEmployee", (...args: [Request, Response]) =>
  userController.addEmployee(...args)
);
userRouter.post("/getAllEmployeeByCompanyId", (...args: [Request, Response]) =>
  userController.getAllEmployeeByCompanyId(...args)
);
userRouter.get("/getUserById", (...args: [Request, Response]) =>
  userController.getUserById(...args)
);

userRouter.post("/addIndustry", (...args: [Request, Response]) =>
  userController.addIndustry(...args)
);

userRouter.post("/getIndustryList", (...args: [Request, Response]) =>
  userController.getIndustryList(...args)
);

userRouter.get("/getLanguageList", (...args: [Request, Response]) =>
  userController.getLanguageList(...args)
);

userRouter.post("/getProfile", (...args: [Request, Response]) =>
  userController.getProfile(...args)
);

userRouter.post("/editProfile", (...args: [Request, Response]) =>
  userController.editProfile(...args)
);

userRouter.post("/updatePassword", (...args: [Request, Response]) =>
  userController.updatePassword(...args)
);

userRouter.get("/getUserLikedProfile", (...args: [Request, Response]) =>
  userController.getUserLikedProfile(...args)
);

userRouter.get("/getAppStatus", (...args: [Request, Response]) =>
  userController.getAppStatus(...args)
);

userRouter.post("/saveToken", (...args: [Request, Response]) =>
  userController.saveToken(...args)
);

userRouter.post("/sendPushNotifications", (...args: [Request, Response]) =>
  userController.sendPushNotifications(...args)
);

userRouter.get("/getAllPushNotifications", (...args: [Request, Response]) =>
  userController.getAllPushNotifications(...args)
);

userRouter.get("/getAllCombineUsers", (...args: [Request, Response]) =>
  userController.getAllCombineUsers(...args)
);

userRouter.post("/readAllNotification", (...args: [Request, Response]) =>
  userController.readAllNotification(...args)
);

userRouter.post("/uploadFile", (...args: [Request, Response]) =>
  userController.uploadFile(...args)
);
userRouter.post("/addVideo", (...args: [Request, Response]) =>
  userController.addVideo(...args)
);

userRouter.post("/submitAppeal", (...args: [Request, Response]) =>
  userController.submitAppeal(...args)
);

userRouter.delete("/deleteAccount", (...args: [Request, Response]) =>
  userController.deleteAccount(...args)
);