import { sequelize } from "@src/config/database";
import { AdminService } from "@src/services/admin.service";
import {
  adminLoginSchema,
  verifyOtpSchema,
  changeAdminPasswordSchema,
  createModeratorsSchema,
  deleteModeratorsSchema,
  delUserSchema,
  emailDefaultSchema,
  getAllUsersSchema,
  getAppInfoSchema,
  getReportedThreadChatByIdSchema,
  getThreadDetailsByIdSchema,
  getUserLogInfoSchema,
  idDefaultSchema,
  limitDefaultSchema,
  markReportAsResolvedSchema,
  calculateToxicityScoreSchema,
  saveAppInfoSchema,
  solvePrivateReportSchema,
  suspendUserSchema,
  updateAdminPasswordSchema,
  updateModeratorStatusSchema,
  updateThreadStatusSchema,
  validateadminOTPSchema,
  updateModeratorPermissionsSchema,
  moderatorIdParamSchema,
  getModeratorLogsSchema,
  addCustomModeratorLogSchema,
  getReportedUsersSchema,
  addCustomUserLogSchema,
  getAllCompanyInfoSchema,
  getUsersAppealsSchema,
} from "@src/shared/common/validators/admin.validator";
import { userDefaultSchema } from "@src/shared/common/validators/users.validators";

import { Request, Response } from "express";

export class AdminController {
  /**
   * @param __service
   */

  public constructor(public __service: AdminService) { }
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public adminLogin = async (req: Request, res: Response) => {
    try {
      let message = "Login successfully.";
      const { body } = req;
      const data = await adminLoginSchema.validateAsync(body);
      const response: any = await this.__service.adminLogin(data);

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

  public verifyAdminLoginOtp = async (req: Request, res: Response) => {
    try {
      let message = "OTP verified successfully.";
      const { body } = req;

      const data = await verifyOtpSchema.validateAsync(body);
      const response: any = await this.__service.verifyAdminLoginOtp(data);

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

  public forgetPassword = async (req: Request, res: Response) => {
    try {
      let message = "Forget password successfully.";
      const { body } = req;
      const data = await emailDefaultSchema.validateAsync(body);
      const response: any = await this.__service.forgetPassword(data);

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

  public changeAdminPassword = async (req: Request, res: Response) => {
    try {
      let message = "Password updated successfully.";
      const { body } = req;
      const data = await changeAdminPasswordSchema.validateAsync(body);
      const response: any = await this.__service.changeAdminPassword(data);

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

  public resendAdminOtp = async (req: Request, res: Response) => {
    try {
      let message = "OTP resend successfully.";
      const { body } = req;
      const data = await emailDefaultSchema.validateAsync(body);
      const response: any = await this.__service.resendAdminOtp(data);

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

  public validateAdminOtp = async (req: Request, res: Response) => {
    try {
      let message = "OTP validated successfully.";
      const { body } = req;
      const data = await validateadminOTPSchema.validateAsync(body);
      const response: any = await this.__service.validateAdminOtp(data);

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

  public createModerators = async (req: Request, res: Response) => {
    try {
      let message = "Moderator added successfully.";
      const { body } = req;
      const data = await createModeratorsSchema.validateAsync(body);
      const response: any = await this.__service.createModerators(data);

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
  public deleteModerators = async (req: Request, res: Response) => {
    try {
      let message = "Moderator deleted successfully.";
      const { query } = req;
      const data = await deleteModeratorsSchema.validateAsync(query);
      const response: any = await this.__service.deleteModerators(data);

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

  public getAllModerator = async (req: Request, res: Response) => {
    try {
      let message = "Moderator fetched successfully.";
      const { query } = req;
      const data = await limitDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getAllModerator(data);

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

  public getModeratorPermissions = async (req: Request, res: Response) => {
    try {
      let message = "Moderator permissions fetched successfully.";
      const { params } = req;
      const paramData = await moderatorIdParamSchema.validateAsync(params);
      const data = { moderatorId: paramData.moderatorId };
      const response: any = await this.__service.getModeratorPermissions(data);

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

  public updateModeratorPermissions = async (req: Request, res: Response) => {
    try {
      let message = "Moderator permissions updated successfully.";
      const { body, params } = req;
      const paramData = await moderatorIdParamSchema.validateAsync(params);
      const bodyData = await updateModeratorPermissionsSchema.validateAsync(body);
      const data = {
        moderatorId: paramData.moderatorId,
        ...bodyData
      };
      const response: any = await this.__service.updateModeratorPermissions(data);

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

  public getModeratorById = async (req: Request, res: Response) => {
    try {
      let message = "Moderator fetched successfully.";
      const { params } = req;
      const data = await idDefaultSchema.validateAsync(params);
      const response: any = await this.__service.getModeratorById(data);

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

  public getAllUsers = async (req: Request, res: Response) => {
    try {
      let message = "Users fetched successfully.";
      const { query } = req;
      const data = await getAllUsersSchema.validateAsync(query);
      const response: any = await this.__service.getAllUsers(data);

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

  public getAllCompanyInfo = async (req: Request, res: Response) => {
    try {
      let message = "Companies fetched successfully.";
      const { query } = req;
      const data = await getAllCompanyInfoSchema.validateAsync(query);
      const response: any = await this.__service.getAllCompanyInfo(data);

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

  public getUserLogInfo = async (req: Request, res: Response) => {
    try {
      let message = "Users Log Fetched successfully.";
      const { query } = req;
      const data = await getUserLogInfoSchema.validateAsync(query);
      const response: any = await this.__service.getUserLogInfo(data);

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

  public getUserInfoById = async (req: Request, res: Response) => {
    try {
      let message = "User info fetched successfully.";
      const { query } = req;
      const data = await idDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getUserInfoById(data);

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

  public getCompanyInfoById = async (req: Request, res: Response) => {
    try {
      let message = "User info fetched successfully.";
      const { query } = req;
      const data = await idDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getCompanyInfoById(data);

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

  public getReportedThread = async (req: Request, res: Response) => {
    try {
      let message = "User info fetched successfully.";
      const { query } = req;
      const response: any = await this.__service.getReportedThread(query);

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

  public getReportedThreadChatById = async (req: Request, res: Response) => {
    try {
      let message = "User info fetched successfully.";
      const { query } = req;
      const data = await getReportedThreadChatByIdSchema.validateAsync(query);
      const response: any = await this.__service.getReportedThreadChatById(
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
  public getCompanyEmpInfoById = async (req: Request, res: Response) => {
    try {
      let message = "User info fetched successfully.";
      const { query } = req;
      const data = await userDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getCompanyEmpInfoById(data);

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

  public updateUserStatus = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "User updated successfully.";
        const data = await suspendUserSchema.validateAsync(body);

        const response: any = await this.__service.updateUserStatus(
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

  public delUser = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "User account has been successfully deleted.";
        const data = await delUserSchema.validateAsync(body);

        const response: any = await this.__service.delUser(data, transaction);

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

  public solvePrivateReport = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Report has been successfully solved.";
        const data = await solvePrivateReportSchema.validateAsync(body);

        const response: any = await this.__service.solvePrivateReport(
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

  public updateModeratorStatus = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Updated successfully.";
        const data = await updateModeratorStatusSchema.validateAsync(body);

        const response: any = await this.__service.updateModeratorStatus(
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

  public updateThreadStatus = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Thread updated successfully.";
        const data = await updateThreadStatusSchema.validateAsync(body);

        const response: any = await this.__service.updateThreadStatus(
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

  public getThreadLogInfo = async (req: Request, res: Response) => {
    try {
      let message = "Thread log info fetched successfully.";
      const { query } = req;
      const data = await idDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getThreadLogInfo(data);

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

  public updateAdminPassword = async (req: Request, res: Response) => {
    try {
      let message = "Password updated successfully.";
      const { body } = req;
      const data = await updateAdminPasswordSchema.validateAsync(body);
      const response: any = await this.__service.updateAdminPassword(data);

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

  public saveAppInfo = async (req: Request, res: Response) => {
    try {
      let message = "Info updated successfully.";
      const { body } = req;
      const data = await saveAppInfoSchema.validateAsync(body);
      const response: any = await this.__service.saveAppInfo(data);

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

  public getAppInfo = async (req: Request, res: Response) => {
    try {
      let message = "Info fetched successfully.";
      const { query } = req;
      const data = await getAppInfoSchema.validateAsync(query);
      const response: any = await this.__service.getAppInfo(data);

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

  public getThreadDetailsById = async (req: Request, res: Response) => {
    try {
      let message = "Info fetched successfully.";
      const { query } = req;
      const data = await getThreadDetailsByIdSchema.validateAsync(query);
      const response: any = await this.__service.getThreadDetailsById(data);

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

  public getDashboardOverview = async (req: Request, res: Response) => {
    try {
      let message = "Info fetched successfully.";
      const response: any = await this.__service.getDashboardOverview();

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

  public getDashboardStats = async (req: Request, res: Response) => {
    try {
      let message = "Dashboard stats fetched successfully.";
      const response: any = await this.__service.getDashboardStats();

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

  public getReportStats = async (req: Request, res: Response) => {
    try {
      let message = "Report stats fetched successfully.";
      const response: any = await this.__service.getReportStats();

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

  public getRegistrationRequestStats = async (req: Request, res: Response) => {
    try {
      let message = "Registration request stats fetched successfully.";
      const response: any = await this.__service.getRegistrationRequestStats();

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

  public getProfileUpdateRequestStats = async (req: Request, res: Response) => {
    try {
      let message = "Profile update request stats fetched successfully.";
      const response: any = await this.__service.getProfileUpdateRequestStats();

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

  public getAppealsStats = async (req: Request, res: Response) => {
    try {
      let message = "Appeals stats fetched successfully.";
      const response: any = await this.__service.getAppealsStats();

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

  public getRegisteredUsersChartData = async (req: Request, res: Response) => {
    try {
      let message = "Registered users chart data fetched successfully.";
      const { period, startDate, endDate } = req.query;
      const response: any = await this.__service.getRegisteredUsersChartData(
        period as string || 'day',
        startDate as string,
        endDate as string
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

  public getLoggedInUsersChartData = async (req: Request, res: Response) => {
    try {
      let message = "Logged-in users chart data fetched successfully.";
      const { period, startDate, endDate } = req.query;
      const response: any = await this.__service.getLoggedInUsersChartData(
        period as string || 'month',
        startDate as string,
        endDate as string
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

  public getAllDashboardStats = async (req: Request, res: Response) => {
    try {
      let message = "All dashboard stats fetched successfully.";
      const response: any = await this.__service.getAllDashboardStats();
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

  public getReportedUsers = async (req: Request, res: Response) => {
    try {
      let message = "Reported users fetched successfully.";
      const { query } = req;
      const data = await getReportedUsersSchema.validateAsync(query);
      const response: any = await this.__service.getReportedUsers(data);

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

  public getReportedUsersList = async (req: Request, res: Response) => {
    try {
      let message = "Reported users list fetched successfully.";
      const { query } = req;
      const data = await getReportedUsersSchema.validateAsync(query);
      const response: any = await this.__service.getReportedUsersList(data);

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

  public getReportedUserDetails = async (req: Request, res: Response) => {
    try {
      let message = "Reported user details fetched successfully.";
      const { params } = req;
      const data = { reportId: parseInt(params.reportId) };
      const response: any = await this.__service.getReportedUserDetails(data);

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

  public getUserDetails = async (req: Request, res: Response) => {
    try {
      let message = "User details fetched successfully.";
      const { params } = req;
      const data = { id: parseInt(params.id) };
      const response: any = await this.__service.getUserDetailsById(data);

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

  public getUserThreads = async (req: Request, res: Response) => {
    try {
      let message = "User threads fetched successfully.";
      const { userId } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      const data = { 
        userId: parseInt(userId), 
        limit: parseInt(limit as string), 
        offset: parseInt(offset as string) 
      };
      const response: any = await this.__service.getUserThreads(data);

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

  public approveRejectUser = async (req: Request, res: Response) => {
    try {
      let message = "User request processed successfully.";
      const { userId } = req.params;
      const { status, rejectionReason, customLog, adminId } = req.body;

      if (!adminId) {
        return res.status(401).json({
          statusCode: 401,
          message: "Admin ID is required",
        });
      }

      const data = { 
        userId: parseInt(userId), 
        status: parseInt(status),
        adminId: adminId,
        rejectionReason: rejectionReason || null,
        customLog: customLog || null
      };
      const response: any = await this.__service.approveRejectUser(data);

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

  public reviewAppeal = async (req: Request, res: Response) => {
    try {
      let message = "Appeal reviewed successfully.";
      const { userId } = req.params;
      const { status, rejectionReason, adminId } = req.body;

      if (!adminId) {
        return res.status(401).json({
          statusCode: 401,
          message: "Admin ID is required",
        });
      }

      const data = { 
        userId: parseInt(userId),
        status: status,
        adminId: adminId,
        rejectionReason: rejectionReason || null
      };
      const response: any = await this.__service.reviewAppeal(data);

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

  public markReportAsResolved = async (req: Request, res: Response) => {
    try {
      let message = "Report marked as resolved successfully.";
      const { params } = req;
      const data = await markReportAsResolvedSchema.validateAsync(params);
      const response: any = await this.__service.markReportAsResolved(data);

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

  public calculateUserToxicityScore = async (req: Request, res: Response) => {
    try {
      let message = "Toxicity score calculated successfully.";
      const { body } = req;
      const data = await calculateToxicityScoreSchema.validateAsync(body);
      const response: any = await this.__service.calculateUserToxicityScore(data);

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

  // public getModeratorLogs = async (req: Request, res: Response) => {
  //   try {
  //     let message = "Moderator logs retrieved successfully.";
  //     const { params } = req;

  //     const data = {
  //       moderatorId: params.moderatorId,
  //     };

  //     const validatedData = await getModeratorLogsSchema.validateAsync(data);
  //     const response: any = await this.__service.getModeratorLogs(validatedData);

  //     res.status(200).json({
  //       statusCode: 200,
  //       message,
  //       response,
  //     });
  //   } catch (error: any) {
  //     res.status(403).send({
  //       statusCode: 403,
  //       message: error.message,
  //     });
  //   }
  // };

  public addCustomModeratorLog = async (req: Request, res: Response) => {
    try {
      let message = "Custom moderator log added successfully.";
      const { body, params } = req;
      const { moderatorId } = params;
      const validatedBody = await addCustomModeratorLogSchema.validateAsync(body);
      const data = {
        ...validatedBody,
        moderatorId: parseInt(moderatorId)
      };
      const response: any = await this.__service.addCustomModeratorLog(data);

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

  public getModeratorActivityLogs = async (req: Request, res: Response) => {
    try {
      const { moderatorId } = req.params;
      const { startDate, endDate } = req.query;

      const data = {
        moderatorId: parseInt(moderatorId),
        startDate: startDate as string,
        endDate: endDate as string
      };

      const response = await this.__service.getModeratorActivityLogs(data);

      return res.status(200).json({
        statusCode: 200,
        message: "Moderator activity logs retrieved successfully.",
        response
      });
    } catch (error: any) {
      return res.status(403).json({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getModeratorPerformanceStats = async (req: Request, res: Response) => {
    try {
      const { moderatorId } = req.params;
      const { page, limit } = req.query;

      const data = {
        moderatorId: parseInt(moderatorId),
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      };

      const response = await this.__service.getModeratorPerformanceStats(data);

      return res.status(200).json({
        statusCode: 200,
        message: "Moderator performance statistics retrieved successfully.",
        response
      });
    } catch (error: any) {
      return res.status(403).json({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public addCustomUserLog = async (req: Request, res: Response) => {
    try {
      const { userId, roleId } = req.query;
      const { activity, adminId } = req.body;

      const data = await addCustomUserLogSchema.validateAsync({
        userId: parseInt(userId as string),
        roleId: parseInt(roleId as string),
        activity: activity,
        adminId: adminId
      });

      const response = await this.__service.addCustomUserLog(data);

      return res.status(200).json({
        statusCode: 200,
        message: "Custom user log added successfully.",
        response
      });
    } catch (error: any) {
      return res.status(403).json({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public getUsersAppeals = async (req: Request, res: Response) => {
    try {
      const { error, value } = getUsersAppealsSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          statusCode: 400,
          message: error.details[0].message,
        });
      }

      const response = await this.__service.getUsersAppeals(value);

      return res.status(200).json({
        statusCode: 200,
        message: "Users appeals fetched successfully.",
        response,
      });
    } catch (error: any) {
      return res.status(403).json({
        statusCode: 403,
        message: error.message,
      });
    }
  };
}