import { Router, Request, Response } from "express";
import { forumController } from "../controllers";
import { createReportValidator } from "@src/shared/common/validators/forum.validator";
import { addAdminCommentValidator } from "@src/shared/common/validators/forum.validator";

export const forumRouter: Router = Router();

forumRouter.post("/createCategory", (...args: [Request, Response]) =>
  forumController.createCategory(...args)
);

forumRouter.post("/createSubCategory", (...args: [Request, Response]) =>
  forumController.createSubCategory(...args)
);

forumRouter.get("/getForumCategoryList", (...args: [Request, Response]) =>
  forumController.getForumCategoryList(...args)
);

forumRouter.post("/getUserDiscussion", (...args: [Request, Response]) =>
  forumController.getUserDiscussion(...args)
);

forumRouter.post("/createDiscussion", (...args: [Request, Response]) =>
  forumController.createDiscussion(...args)
);

forumRouter.post("/getThreadById", (...args: [Request, Response]) =>
  forumController.getThreadById(...args)
);

forumRouter.post("/getAllPrivateThreads", (...args: [Request, Response]) =>
  forumController.getAllPrivateThreads(...args)
);

forumRouter.delete("/deleteThread", (...args: [Request, Response]) =>
  forumController.deleteThread(...args)
);

forumRouter.post("/readMessage", (...args: [Request, Response]) =>
  forumController.readMessage(...args)
);

forumRouter.get("/getForumSubCategory", (...args: [Request, Response]) =>
  forumController.getForumSubCategory(...args)
);

forumRouter.get("/getForumMainCategory", (...args: [Request, Response]) =>
  forumController.getForumMainCategory(...args)
);

forumRouter.post("/updateCategory", (...args: [Request, Response]) =>
  forumController.updateCategory(...args)
);

forumRouter.post("/report", (...args: [Request, Response]) =>
  forumController.report(...args)
);


/**
 * Banned Keywords / Auto Spam Filter
 */
forumRouter.post("/bannedKeywords/add", forumController.addBannedKeyword);
forumRouter.post("/bannedKeywords/remove", forumController.removeBannedKeyword);
forumRouter.get("/bannedKeywords/list", forumController.listBannedKeywords);

// Get filtered messages for a thread/room
forumRouter.get("/messages/filtered/:roomId", forumController.getFilteredMessages);


forumRouter.get("/reportedDiscussions", forumController.getReportedDiscussions);

// create a post
// Create a report
forumRouter.post("/forum/report", async (req: Request, res: Response) => {
  try {
    await createReportValidator.validateAsync(req.body);
    return forumController.createReport(req, res);
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});


forumRouter.get("/getAllDiscussions", (...args: [any, any]) =>
  forumController.getAllDiscussions(...args)
);

// Edit Thread Post

forumRouter.put("/editThreadPost", (req, res) => forumController.editThreadPost(req, res));


// Add Admin Comment

forumRouter.post("/addAdminComment", (req, res) => {
  const { error } = addAdminCommentValidator.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.message });
  forumController.addAdminComment(req, res);
});