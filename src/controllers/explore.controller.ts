import { sequelize } from "@src/config/database";
import { ExploreService } from "@src/services/explore.service";
import {
  alterLikeSchema,
  getExploreSchema,
  getProfileByIdSchema,
  reportUserSchema,
} from "@src/shared/common/validators/explore.validator";

import { Request, Response } from "express";

export class ExploreController {
  /**
   * @param __service
   */

  public constructor(public __service: ExploreService) {}
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public getExplore = async (req: Request, res: Response) => {
    try {
      let message = "Explore data fetched successfully.";
      const { body } = req;
      const data = await getExploreSchema.validateAsync(body);
      const response: any = await this.__service.getExplore(data);

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

  public alterLike = async (req: Request, res: Response) => {
    try {
      let message = "Alter Like successfully.";
      const { body } = req;
      const data = await alterLikeSchema.validateAsync(body);
      const response: any = await this.__service.alterLike(data);

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

  public getProfileById = async (req: Request, res: Response) => {
    try {
      let message = "Profile fetched successfully.";
      const { query } = req;
      const data = await getProfileByIdSchema.validateAsync(query);
      const response: any = await this.__service.getProfileById(data);

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

  public reportUser = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;
        let message = "Data reported Successfully";
        const data = await reportUserSchema.validateAsync(body);
        const response: any = await this.__service.reportUser(
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
