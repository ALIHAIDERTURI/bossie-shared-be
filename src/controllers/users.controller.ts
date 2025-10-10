import { sequelize } from "@src/config/database";
import { UserService } from "@src/services/users.service";
import {
  UserSchema,
  addEmployeeSchema,
  addVideoSchema,
  changePasswordSchema,
  createAccountSchema,
  createProfileSchema,
  defaultSchema,
  forgotPasswordSchema,
  getAllCombineUsersSchema,
  getAppStatusSchema,
  getProfileSchema,
  getUserByIdSchema,
  loginUserSchema,
  profileDefaultSchema,
  resendOtpSchema,
  saveTokenSchema,
  sendPushNotificationsSchema,
  updatePasswordSchema,
  userDefaultSchema,
  validateOtpSchema,
} from "@src/shared/common/validators/users.validators";
import { Request, Response } from "express";

export class UserController {
  /**
   * @param __service
   */

  public constructor(public __service: UserService) { }
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public uploadFile = async (req: Request, res: Response) => {
    try {
      console.log("here in uploadFile");

      const { body } = req;
      const lang = req.headers["accept-language"];
      let message = `Image successfully uploded`;
      if (lang == "de") {
        message = `Bild erfolgreich hochgeladen`;
      }
      const response: any = await this.__service.uploadFile(body);
      res.status(200).json({
        statusCode: 200,
        message,
        response,
      });
    } catch (error: any) {
      // console.log(error);
      res.status(403).send({
        statusCode: 403,
        message: error.message,
      });
    }
  };

  public addIndustry = async (req: Request, res: Response) => {
    try {
      let message = "Industry created successfully.";
      const response: any = await this.__service.addIndustry();

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
  public addVideo = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Video added successfully.";
      const data = await addVideoSchema.validateAsync(body);

      const response: any = await this.__service.addVideo(data);

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

  public getIndustryList = async (req: Request, res: Response) => {
    try {
      let message = "Industries fetched successfully.";
      const response: any = await this.__service.getIndustryList();

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

  public getLanguageList = async (req: Request, res: Response) => {
    try {
      let message = "Language fetched successfully.";
      const response: any = await this.__service.getLanguageList();

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

  public getProfile = async (req: Request, res: Response) => {
    try {
      let message = "Profile fetched successfully.";
      const { body } = req;
      const data = await getProfileSchema.validateAsync(body);
      const response: any = await this.__service.getProfile(data);

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

  public editProfile = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Profile update request sent successfully.";

        const response: any = await this.__service.editProfile(
          body,
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

  public createAccount = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Account created successfully.";
      const data = await createAccountSchema.validateAsync(body);
      const response: any = await this.__service.createAccount(data);

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

  public resendOtp = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "OTP resend successfully.";
      const data = await resendOtpSchema.validateAsync(body);
      const response: any = await this.__service.resendOtp(data);

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

  public validateOtp = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "OTP successfully validated.";
      const data = await validateOtpSchema.validateAsync(body);
      const response: any = await this.__service.validateOtp(data);

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

  public forgotPassword = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "OTP has been send to your email, Kindly verify.";
      const data = await forgotPasswordSchema.validateAsync(body);
      const response: any = await this.__service.forgotPassword(data);

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

  public changePassword = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "password changed successfully";
      const data = await changePasswordSchema.validateAsync(body);
      const response: any = await this.__service.changePassword(data);

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

  public loginUser = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      const data = await loginUserSchema.validateAsync(body);
      const response: any = await this.__service.loginUser(data);

      res.status(200).json({
        statusCode: 200,
        response,
      });
    } catch (error: any) {
      res.status(403).send({
        statusCode: 403,
        message: error.message,
        response: error.response,
      });
    }
  };

  public createProfile = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let lang = req.headers["accept-language"];
        let message = "Created Successfully";
        if (lang == "de") {
          message = "erfolgreich hinzugefügt";
        }

        const data = await createProfileSchema.validateAsync(body);

        const response: any = await this.__service.createProfile(
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

  public addEmployee = async (req: Request, res: Response) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        const { body } = req;

        let message = "Employee created successfully.";
        const data = await addEmployeeSchema.validateAsync(body);
        const response: any = await this.__service.addEmployee(
          body,
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

  public getAllEmployeeByCompanyId = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Employee data fetched successfully.";
      const data = await defaultSchema.validateAsync(body);
      const response: any = await this.__service.getAllEmployeeByCompanyId(
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

  public getUserById = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Employee data fetched successfully.";
      const data = await getUserByIdSchema.validateAsync(query);
      const response: any = await this.__service.getUserById(data);

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

  public updatePassword = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Password updated successfully.";
      const data = await updatePasswordSchema.validateAsync(body);
      const response: any = await this.__service.updatePassword(data);

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

  public getUserLikedProfile = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Data fetched successfully.";
      const data = await profileDefaultSchema.validateAsync(query);
      const response: any = await this.__service.getUserLikedProfile(data);

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

  public getAppStatus = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Data fetched successfully.";
      const data = await getAppStatusSchema.validateAsync(query);
      const response: any = await this.__service.getAppStatus(data);

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

  public saveToken = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Data saved successfully.";
      const data = await saveTokenSchema.validateAsync(body);
      const response: any = await this.__service.saveToken(data);

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

  public sendPushNotifications = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Data sent successfully.";
      const data = await sendPushNotificationsSchema.validateAsync(body);
      const response: any = await this.__service.sendPushNotifications(data);

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

  public getAllPushNotifications = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Data fetched successfully.";
      const response: any = await this.__service.getAllPushNotifications(query);

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

  public getAllCombineUsers = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let message = "Data fetched successfully.";
      const data = await getAllCombineUsersSchema.validateAsync(query);
      const response: any = await this.__service.getAllCombineUsers(data);

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

  public readAllNotification = async (req: Request, res: Response) => {
    try {
      const { body } = req;
      let message = "Data read successfully.";
      const response: any = await this.__service.readAllNotification(body);

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

  public submitAppeal = async (req: Request, res: Response) => {
    try {
      const { appealMessage, userId, roleId } = req.body;

      if (!userId) {
        return res.status(401).json({
          statusCode: 401,
          message: "User authentication required",
        });
      }

      const data = { 
        userId: userId,
        appealMessage: appealMessage,
        roleId: roleId
      };
      const response: any = await this.__service.submitAppeal(data);

      res.status(200).json({
        statusCode: 200,
        message: "Appeal submitted successfully.",
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
