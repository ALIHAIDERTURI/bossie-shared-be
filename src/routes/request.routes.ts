import { Router, Request, Response } from "express";
import { requestController } from "../controllers";

export const requestRouter: Router = Router();

requestRouter.post("/getAllPendingRequest", (...args: [Request, Response]) =>
  requestController.getAllPendingRequest(...args)
);

requestRouter.get("/getUserInfo", (...args: [Request, Response]) =>
  requestController.getUserInfo(...args)
);

requestRouter.put("/updateRequestStatus", (...args: [Request, Response]) =>
  requestController.updateRequestStatus(...args)
);

requestRouter.get(
  "/viewProfileUpdatingRequest",
  (...args: [Request, Response]) =>
    requestController.viewProfileUpdatingRequest(...args)
);

requestRouter.get("/getUpdateReqInfo", (...args: [Request, Response]) =>
  requestController.getUpdateReqInfo(...args)
);

requestRouter.post("/updateProfileUpdateReq", (...args: [Request, Response]) =>
  requestController.updateProfileUpdateReq(...args)
);
