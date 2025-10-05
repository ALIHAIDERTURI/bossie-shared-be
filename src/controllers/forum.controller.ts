import { sequelize } from "@src/config/database";
import { ForumService } from "@src/services/forum.service";
import {
  createCategorySchema,
  createDicsussionSchema,
  createSubCategorySchema,
  deleteThreadSchema,
  getAllPrivateThreadsSchema,
  getForumSubCategory,
  getThreadByIdSchema,
  getUserDiscussionSchema,
  readMessageSchema,
  reportSchema,
  updateCategorySchema,
  addBannedKeywordSchema,
  removeBannedKeywordSchema,
  editThreadValidator,
  savePriorityValidator 
} from "@src/shared/common/validators/forum.validator";
import {
  defaultSchema,
  profileDefaultSchema,
  userDefaultSchema,
} from "@src/shared/common/validators/users.validators";
import { Request, Response } from "express";

export class ForumController {
  /**
   * @param __service
   */

  public constructor(public __service: ForumService) { }
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public createCategory = async (req: Request, res: Response) => {
    try {
      let message = "Category created successfully.";
      const { body } = req;
      const data = await createCategorySchema.validateAsync(body);
      const response: any = await this.__service.createCategory(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public createSubCategory = async (req: Request, res: Response) => {
    try {
      let message = "SubCategory created successfully.";
      const { body } = req;
      const data = await createSubCategorySchema.validateAsync(body);
      const response: any = await this.__service.createSubCategory(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getForumCategoryList = async (req: Request, res: Response) => {
    try {
      let message = "SubCategory created successfully.";
      const response: any = await this.__service.getForumCategoryList();

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public createDiscussion = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Thread created successfully.";

        const data = await createDicsussionSchema.validateAsync(body);

        const response: any = await this.__service.createDiscussion(
          data,
          transaction
        );

        await transaction.commit();

        res.status(200).json({
          statusCode: 200,
          message,
          response,
        });
      } catch (error: any) {
        if (transaction) {
          transaction.rollback();
        }
        if (error.message == "You are not allowed to create threads.") {
          res.status(401).send({
            statusCode: 401,
            message: error.message,
          });
        } else {
          res.status(403).send({
            statusCode: 403,
            message: error.message,
          });
        }

      }
    } catch (error: any) {
      console.log(error);
      res.status(403).send({
        statusCode: 403,
        message: error?.message,
      });
    }
  };

  public getThreadById = async (req: Request, res: Response) => {
    try {
      let message = "Thread fetched successfully.";
      const { body } = req;
      const data = await getThreadByIdSchema.validateAsync(body);
      const response: any = await this.__service.getThreadById(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getAllPrivateThreads = async (req: Request, res: Response) => {
    try {
      let message = "Private threads fetched successfully.";
      const { body } = req;
      const data = await getAllPrivateThreadsSchema.validateAsync(body);
      const response: any = await this.__service.getAllPrivateThreads(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public deleteThread = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Thread deleted successfully.";

        const data = await deleteThreadSchema.validateAsync(body);

        const response: any = await this.__service.deleteThread(
          data,
          transaction
        );

        await transaction.commit();

        res.status(200).json({
          statusCode: 200,
          message,
          response,
        });
      } catch (error: any) {
        if (transaction) {
          transaction.rollback();
        }
        res.status(403).send({
          statusCode: 403,
          message: error.message,
        });
      }
    } catch (error: any) {
      console.log(error);
      res.status(403).send({
        statusCode: 403,
        message: error?.message,
      });
    }
  };

  public readMessage = async (req: Request, res: Response) => {
    try {
      let message = "data read successfully.";
      const { body } = req;
      const data = await readMessageSchema.validateAsync(body);
      const response: any = await this.__service.readMessage(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getUserDiscussion = async (req: Request, res: Response) => {
    try {
      let message = "data fetched successfully.";
      const { body } = req;
      const data = await getUserDiscussionSchema.validateAsync(body);
      const response: any = await this.__service.getUserDiscussion(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getForumMainCategory = async (req: Request, res: Response) => {
    try {
      let message = "Data fetched successfully.";
      const { query } = req;
      const response: any = await this.__service.getForumMainCategory();

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getForumSubCategory = async (req: Request, res: Response) => {
    try {
      let message = "data fetched successfully.";
      const { query } = req;
      const data = await getForumSubCategory.validateAsync(query);
      const response: any = await this.__service.getForumSubCategory(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public updateCategory = async (req: Request, res: Response) => {
    try {
      let message = "data updated successfully.";
      const { body } = req;
      const data = await updateCategorySchema.validateAsync(body);
      const response: any = await this.__service.updateCategory(data);

 // Dynamic message based on flags
    if (data.isDelete) {
      message = "data archived/soft deleted successfully.";
    } else if (data.isResume) {
      message = "data unarchived successfully.";
    }

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public report = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Successfully Reported.";

        const data = await reportSchema.validateAsync(body);

        const response: any = await this.__service.report(data, transaction);

        await transaction.commit();

        res.status(200).json({
          statusCode: 200,
          message,
          response,
        });
      } catch (error: any) {
        if (transaction) {
          transaction.rollback();
        }
        res.status(403).send({
          statusCode: 403,
          message: error.message,
        });
      }
    } catch (error: any) {
      console.log(error);
      res.status(403).send({
        statusCode: 403,
        message: error?.message,
      });
    }
  };



  public addBannedKeyword = async (req: Request, res: Response) => {
    try {
      let message = "Keyword banned successfully.";
      const { body } = req;

      const data = await addBannedKeywordSchema.validateAsync(body);
      const response: any = await this.__service.addBannedKeyword(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public removeBannedKeyword = async (req: Request, res: Response) => {
    try {
      let message = "Keyword removed successfully.";
      const { body } = req;

      const data = await removeBannedKeywordSchema.validateAsync(body);
      const response: any = await this.__service.removeBannedKeyword(data);

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public listBannedKeywords = async (req: Request, res: Response) => {
    try {
      let message = "Banned keywords fetched successfully.";
      const response: any = await this.__service.listBannedKeywords();

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getFilteredMessages = async (req: Request, res: Response) => {
    try {
      let message = "Filtered messages fetched successfully.";
      const { roomId } = req.params;

      const response: any = await this.__service.filterMessages(Number(roomId));

      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };


public getReportedDiscussions = async (req: Request, res: Response) => {
  try {
    const data = await this.__service.getReportedDiscussions();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


 public createReport = async (req: Request, res: Response) => {
    try {
      const result = await this.__service.createReport(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };


public getAllDiscussions = async (req: Request, res: Response) => {
    try {
      const data = await this.__service.getAllDiscussions();
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };




  public editThreadPost = async (req: Request, res: Response) => {
    try {
      const { error } = editThreadValidator.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.message });

      const result = await this.__service.editThreadPost(req.body);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };




  public addAdminComment = async (req: Request, res: Response) => {
    try {
      const result = await this.__service.addAdminComment(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

// Search and Filter



  public fetchThreads = async (req: Request, res: Response) => {
  try {
    const result = await this.__service.fetchThreads(req.query);

    return res.status(200).json(result); // ✅ direct bhej de
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};





public deleteOrHidePost = async (req: Request, res: Response) => {
  try {
    const { id, reason, action, adminId } = req.body;

    if (!id || !reason || !action) {
      return res
        .status(400)
        .json({ success: false, message: "id, reason, and action are required" });
    }

    const data = await this.__service.deleteOrHidePost(id, reason, adminId, action);

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};








public hideMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { adminId } = req.body; // pass adminId in request body

    const result = await this.__service.hideMessage(
      Number(messageId),
      Number(adminId)
    );

    return res.json(result);
  } catch (error: any) {
    console.error("Error hiding message:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

public unhideMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const result = await this.__service.unhideMessage(Number(messageId));

    return res.json(result);
  } catch (error: any) {
    console.error("Error unhiding message:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};





public updateThreadStatus = async (req: Request, res: Response) => {
  try {
    let { threadId, action, adminId } = req.body;

    // Handle text/plain JSON
    if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        threadId = parsed.threadId;
        action = parsed.action;
        adminId = parsed.adminId;
      } catch {
        return res.status(400).json({ message: "Invalid JSON in text/plain body" });
      }
    }

    if (!threadId || !action) {
      return res.status(400).json({ message: "threadId and action are required" });
    }

    const result = await this.__service.updateThreadStatus(threadId, action, adminId);

    // Return 409 only if the action was already done
    if (!result.success) {
      return res.status(409).json({
        statusCode: 409,
        message: result.message,
      });
    }

    // Otherwise, return 200
    return res.status(200).json({
      statusCode: 200,
      message: result.message,
      response: result.thread,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
};





  public saveCategoryPriority = async (req: Request, res: Response) => {
    try {
      const { error } = savePriorityValidator.validate(req.body);
      if (error)
        return res.status(400).json({ success: false, message: error.message });

      const result = await this.__service.saveCategoryPriority(req.body);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  public saveSubCategoryPriority = async (req: Request, res: Response) => {
    try {
      const { error } = savePriorityValidator.validate(req.body);
      if (error)
        return res.status(400).json({ success: false, message: error.message });

      const result = await this.__service.saveSubCategoryPriority(req.body);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };





}
