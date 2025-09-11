import { sequelize } from "@src/config/database";
import { RequestService } from "@src/services/request.service";
import {
  getAllPendingRequestSchema,
  getUpdateReqInfoSchema,
  getUserInfoSchema,
  updateProfileUpdateReqSchema,
  updateRequestStatusSchema,
  viewProfileUpdatingRequestSchema,
} from "@src/shared/common/validators/request.validator";

import { Request, Response } from "express";

export class RequestController {
  /**
   * @param __service
   */

  public constructor(public __service: RequestService) {}
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public getAllPendingRequest = async (req: Request, res: Response) => {
    try {
      let message = "Info fetched successfully.";
      const { body } = req;
      const data = await getAllPendingRequestSchema.validateAsync(body);
      const response: any = await this.__service.getAllPendingRequest(data);

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

  public getUserInfo = async (req: Request, res: Response) => {
    try {
      let message = "Info fetched successfully.";
      const { query } = req;
      const data = await getUserInfoSchema.validateAsync(query);
      const response: any = await this.__service.getUserInfo(data);

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

  public updateRequestStatus = async (req: Request, res: Response) => {
    try {
      let message = "Info Updated successfully.";
      const { body } = req;
      const data = await updateRequestStatusSchema.validateAsync(body);
      const response: any = await this.__service.updateRequestStatus(data);

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

  public viewProfileUpdatingRequest = async (req: Request, res: Response) => {
    try {
      let message = "Info successfully fetched.";
      const { query } = req;
      const data = await viewProfileUpdatingRequestSchema.validateAsync(query);
      const response: any = await this.__service.viewProfileUpdatingRequest(
        data
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

  public getUpdateReqInfo = async (req: Request, res: Response) => {
    try {
      let message = "Info successfully fetched.";
      const { query } = req;
      const data = await getUpdateReqInfoSchema.validateAsync(query);
      const response: any = await this.__service.getUpdateReqInfo(data);

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

  public updateProfileUpdateReq = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "User updated successfully.";
        const data = await updateProfileUpdateReqSchema.validateAsync(body);

        const response: any = await this.__service.updateProfileUpdateReq(
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
}
