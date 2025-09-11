import { sequelize } from "@src/config/database";
import { NotificationService } from "@src/services/notifications.service";
import {
  getDuplicateDataByUserIdSchema,
  updateNotificationSchema,
} from "@src/shared/common/validators/notification.validators";
import { Request, Response } from "express";

export class NotificationController {
  /**
   * @param __service
   */

  public constructor(public __service: NotificationService) {}
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public updateNotification = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let lang = req.headers["accept-language"];
        let message = "Notification updated Successfully";

        const data = await updateNotificationSchema.validateAsync(body);

        const response: any = await this.__service.updateNotification(
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

  public getAllNotification = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Notification Fetched  successfully.";
      const response: any = await this.__service.getAllNotification(query);

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

  public getUserReportInfoById = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "User Report Info Fetched  successfully.";
      const response: any = await this.__service.getUserReportInfoById(query);

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
  public getDuplicateDataByUserId = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Info Fetched  successfully.";
      const data = await getDuplicateDataByUserIdSchema.validateAsync(query);
      const response: any = await this.__service.getDuplicateDataByUserId(data);

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

  public viewPreviousNotification = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Info Fetched  successfully.";
      // const data = await viewPreviousNotificationSchema.validateAsync(query);
      const response: any = await this.__service.viewPreviousNotification(
        query
      );

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

  public getNotificationById = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Info Fetched  successfully.";
      const response: any = await this.__service.getNotificationById(query);

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
}
