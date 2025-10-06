import {
  admin,
  adminLog,
  appInfo,
  duplicateData,
  employee,
  forumCategory,
  forumSubCategory,
  like,
  messages,
  notifications,
  privateMessages,
  privateThreads,
  report,
  roleData,
  threadLog,
  threads,
  userLog,
  userNotification,
  users,
  moderatorPermissions,
  toxicityScores
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { getProcessedTemplate } from "@src/utils/renderEmailTemplate";
import { sendEmail } from "@src/utils/sendEmail";
import { ToxicityService } from "./toxicity.service";
import { NotificationService } from "./notifications.service";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op, Sequelize, Transaction } from "sequelize";


export class AdminService {
  private toxicityService: ToxicityService;
  private notificationService: NotificationService;

  constructor() {
    this.toxicityService = new ToxicityService();
    this.notificationService = new NotificationService();
  }

  public adminLogin = async (data: any): Promise<any> => {
    const { email, password } = data;

    const isAdmin: any = await admin.findOne({
      where: { email, accountStatus: 1 },
    });
    if (!isAdmin) throw new Error("E-mailadres bestaat niet.");

    const suspension = await adminLog.findOne({
      where: {
        adminId: isAdmin.id,
        isSuspend: true,
      },
      order: [["id", "desc"]],
    });

    if (suspension) {
      if (!suspension.suspendUntil || suspension.suspendUntil > new Date()) {
        throw new Error("Uw account is geschorst. Neem contact op met de beheerder.");
      }
    }
    const checkPassword = bcrypt.compareSync(password, isAdmin.password);
    if (!checkPassword) {
      throw new Error("Er is iets misgegaan. Controleer uw e-mailadres en wachtwoord.");
    }

    const OTP = generateOTP();

    await admin.update(
      {
        loginOTP: Number(OTP),
        loginOtpUsed: false,
        loginOtpCreatedAt: new Date(),
      },
      { where: { id: isAdmin.id } }
    );

    const emailHtml = getProcessedTemplate("login_otp", {
      username: isAdmin.name,
      otp: OTP,
    });

    await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Bossie: Uw login OTP",
      html: emailHtml,
    });

    return {
      id: isAdmin.id,
      email: isAdmin.email,
      message: "OTP verzonden naar uw e-mail.",
    };
  };

  public verifyAdminLoginOtp = async (data: any): Promise<any> => {
  const { email, OTP } = data;
  const secret = process.env.SECRET_KEY as string;

  const isAdmin: any = await admin.findOne({ where: { email } });
  if (!isAdmin) throw new Error("E-mailadres bestaat niet.");

  const suspension = await adminLog.findOne({
    where: {
      adminId: isAdmin.id,
      isSuspend: true,
    },
    order: [["id", "desc"]],
  });

  if (suspension) {
    if (!suspension.suspendUntil || suspension.suspendUntil > new Date()) {
      throw new Error("Uw account is geschorst. Neem contact op met de beheerder.");
    }
  }

  const now = new Date().getTime();
  const otpTime = new Date(isAdmin.loginOtpCreatedAt).getTime();

  if (
    isAdmin.loginOTP !== Number(OTP) ||
    isAdmin.loginOtpUsed ||
    (now - otpTime) / 60000 > 5
  ) {
    throw new Error("OTP ongeldig of verlopen.");
  }

  await admin.update({ loginOtpUsed: true }, { where: { id: isAdmin.id } });

  const token = jwt.sign(
    { id: isAdmin.id, roleId: isAdmin.adminRoleId, isAdmin: true },
    secret,
    { expiresIn: "1d" }
  );

  return {
    id: isAdmin.id,
    name: isAdmin.name,       // ✅ Added admin's name here
    email: isAdmin.email,
    adminRoleId: isAdmin.adminRoleId,
    token,
  };
};


  public forgetPassword = async (data: any): Promise<any> => {
    const { email } = data;

    const isAdmin: any = await admin.findOne({ where: { email } });
    if (!isAdmin) {
      throw new Error("E-mailadres bestaat niet.");
    }

    const OTP = generateOTP();
    const emailHtml = getProcessedTemplate("reset_password", {
      username: isAdmin.name,
      otp: OTP,
    });
    console.log("emailHtml", emailHtml);

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Bossie: Stel uw wachtwoord opnieuw in.",
      html: emailHtml,
    });

    // const isEmailSend: any = await sendEmail({
    //   from: String(process.env.EMAIL),
    //   to: email,
    //   subject: "Bossie: Reset your Password.",
    //   text: `Hi ${isAdmin.name},

    //         To reset the password, please use this OTP:
    //         ${OTP}

    //         The Bossie Team`,
    // });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    const usersObj: any = {
      forgotPassOTP: OTP,
      isForgotPassOtpUsed: false,
      forgotPassOtpCreatedAt: new Date(),
      updatedAt: new Date(),
    };

    const res: any = await admin.update(
      { ...usersObj },
      {
        where: {
          id: isAdmin.id,
        },
      }
    );
    return {
      id: isAdmin.id,
      email: isAdmin.email,
      roleId: isAdmin.adminRoleId,
    };
  };

  public changeAdminPassword = async (data: any): Promise<void> => {
    const { id, password, confirmPassword } = data;

    if (password !== confirmPassword) {
      throw new Error(
        "De velden 'Wachtwoord' en 'Bevestig wachtwoord' moeten overeenkomen."
      );
    }

    const user = await admin.findByPk(id);
    if (!user) {
      throw new Error("Beheerders-ID is ongeldig.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const isUpdate = await admin.update(
      { password: hashedPassword },
      { where: { id } }
    );

    if (!isUpdate) {
      throw new Error("Fout bij het bijwerken van het wachtwoord.");
    }
  };

  public resendAdminOtp = async (data: any): Promise<any> => {
    const { email } = data;
    const isAdmin: any = await admin.findOne({ where: { email } });
    if (!isAdmin) {
      throw new Error("E-mailadres bestaat niet.");
    }

    if (isWithinTimeLimit(isAdmin.forgotPassOtpCreatedAt, 2)) {
      const remainingTime = await calculateRemainingTime(
        isAdmin.forgotPassOtpCreatedAt,
        2
      );
      throw new Error(`Probeer het daarna opnieuw ${remainingTime}`);
    }

    const OTP = generateOTP();

    // const isEmailSend: any = await sendEmail({
    //   from: String(process.env.EMAIL),
    //   to: email,
    //   subject: "Bossie: Reset your Password.",
    //   text: `Hi ${isAdmin.name},

    //         To reset the password, please use this OTP:
    //         ${OTP}

    //         The Bossie Team`,
    // });

    const emailHtml = getProcessedTemplate("reset_password", {
      username: isAdmin.name,
      otp: OTP,
    });
    console.log("emailHtml", emailHtml);

    const isEmailSend: any = await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Bossie: Stel uw wachtwoord opnieuw in.",
      html: emailHtml, // Use processed HTML
    });

    if (!isEmailSend) {
      throw new Error("Fout bij het verzenden van e-mail.");
    }

    const usersObj: any = {
      forgotPassOTP: OTP,
      isForgotPassOtpUsed: false,
      forgotPassOtpCreatedAt: new Date(),
      updatedAt: new Date(),
    };

    const res: any = await admin.update(
      { ...usersObj },
      {
        where: {
          id: isAdmin.id,
        },
      }
    );
    return {
      id: isAdmin.id,
      email: isAdmin.email,
      roleId: isAdmin.adminRoleId,
    };
  };

  public validateAdminOtp = async (data: any): Promise<any> => {
    const { email, OTP } = data;

    const isAdmin: any = await admin.findOne({ where: { email } });
    if (!isAdmin) {
      throw new Error("E-mailadres bestaat niet.");
    }

    const isOTPValid =
      OTP === isAdmin.forgotPassOTP &&
      isWithinTimeLimit(isAdmin.forgotPassOtpCreatedAt, 2) &&
      !isAdmin.isForgotPassOtpUsed;

    if (!isOTPValid) {
      throw new Error("OTP is ongeldig of verlopen.");
    }

    var usersObj: any = {
      isForgotPassOtpUsed: true,
    };

    await admin.update(usersObj, {
      where: {
        email: email,
      },
    });

    return {
      id: isAdmin.id,
      name: isAdmin.name,
      email: isAdmin.email,
      roleId: isAdmin.adminRoleId,
    };
  };

  public createModerators = async (data: any): Promise<any> => {
    const { email, password, permissions, ...otherData } = data;

    const isUser: any = await admin.findOne({ where: { email: email } });
    if (isUser) {
      throw new Error("E-mail bestaat al.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newModerator = await admin.create({
      email,
      password: hashedPassword,
      adminRoleId: 2,
      ...otherData
    });

    await moderatorPermissions.create({
      moderatorId: newModerator.id,
      userManagement: true,
      companyManagement: true,
      newRegistrationRequests: true,
      profileUpdateRequests: true,
      forums: true,
      reportedChats: true,
      moderatorManagement: false,
      pushNotifications: false,
      restoreOldData: false,
    });

    const emailHtml = getProcessedTemplate("moderator_credentials", {
      email: email,
      password: password,
    });

    await sendEmail({
      from: String(process.env.EMAIL),
      to: email,
      subject: "Your Moderator Credentials",
      html: emailHtml,
    });

    return;
  };

  public deleteModerators = async (data: any): Promise<any> => {
    const { adminId } = data;
    const isUser: any = await admin.findOne({ where: { id: adminId } });
    if (!isUser) {
      throw new Error("Ongeldige AdminID.");
    }
    await admin.update({ accountStatus: 5 }, { where: { id: adminId } });
    return;
  };

  public getAllModerator = async (data: any): Promise<any> => {
    const { limit, offset, search } = data;

    let whereClause: any = {
      adminRoleId: 2,
      deletedAt: null,
      accountStatus: {
        [Op.in]: [1, 3, 4]
      }
    };

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { name: { [Op.like]: searchTerm } },
          { email: { [Op.like]: searchTerm } },
          { phone: { [Op.like]: searchTerm } }
        ]
      };
    }

    const response: any = await admin.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "adminRoleId",
        "accountStatus",
        [
          Sequelize.literal(`(
            SELECT COALESCE(AVG(TIMESTAMPDIFF(MINUTE, al.createdAt, al.updatedAt)), 0)
            FROM adminLog al 
            WHERE al.adminId = admin.id AND al.isSuspend = false
          )`),
          'averageResolutionTime'
        ]
      ],
      include: [
        {
          model: moderatorPermissions,
          as: 'permissions',
          attributes: [
            'userManagement',
            'companyManagement',
            'newRegistrationRequests',
            'profileUpdateRequests',
            'forums',
            'reportedChats',
            'moderatorManagement',
            'pushNotifications',
            'restoreOldData'
          ],
          required: false,
        }
      ],
      limit: limit,
      offset: offset * limit,
      order: [["id", "desc"]],
    });

    return response;
  };

  public getModeratorPermissions = async (data: any): Promise<any> => {
    const { moderatorId } = data;

    const permissions = await moderatorPermissions.findOne({
      where: { moderatorId, deletedAt: null },
    });

    if (!permissions) {
      return {
        moderatorId,
        userManagement: false,
        companyManagement: false,
        newRegistrationRequests: false,
        profileUpdateRequests: false,
        forums: false,
        reportedChats: false,
        moderatorManagement: false,
        pushNotifications: false,
        restoreOldData: false,
      };
    }

    return permissions;
  };

  public updateModeratorPermissions = async (data: any): Promise<any> => {
    const { moderatorId, ...permissionData } = data;

    const moderator = await admin.findOne({
      where: { id: moderatorId, adminRoleId: 2, deletedAt: null },
    });

    if (!moderator) {
      throw new Error("Moderator not found");
    }

    let permissions = await moderatorPermissions.findOne({
      where: { moderatorId, deletedAt: null },
    });

    if (permissions) {
      await permissions.update(permissionData);
    } else {
      permissions = await moderatorPermissions.create({
        moderatorId,
        ...permissionData,
      });
    }

    return permissions;
  };

  public createModeratorWithPermissions = async (data: any): Promise<any> => {
    const { permissions, ...moderatorData } = data;

    const moderator = await admin.create(moderatorData);
    const defaultPermissions = permissions || {
      userManagement: true,
      companyManagement: true,
      newRegistrationRequests: true,
      profileUpdateRequests: true,
      forums: true,
      reportedChats: true,
      moderatorManagement: false,
      pushNotifications: false,
      restoreOldData: false,
    };

    await moderatorPermissions.create({
      moderatorId: moderator.id,
      ...defaultPermissions,
    });

    return moderator;
  };

  public getModeratorById = async (data: any): Promise<any> => {
    const { id } = data;
    await admin.findOne({
      where: { id: id },
      attributes: ["id", "name", "email", "phone", "adminRoleId", "deletedAt"],
    });

    const res: any = await admin.findOne({
      where: { id: id, adminRoleId: 2, deletedAt: null },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "adminRoleId",
        "accountStatus",
        "createdAt"
      ],
    });

    if (!res) {
      return null;
    }
    const activityLogsData = await this.getModeratorActivityLogs({ moderatorId: id });

    const activityLogsForStats = await adminLog.findAll({
      where: {
        adminId: id,
        isSuspend: false
      },
      attributes: ["createdAt", "updatedAt"],
      order: [["createdAt", "DESC"]],
      limit: 10
    });

    let averageResolutionTime = null;
    if (activityLogsForStats.length > 0) {
      const totalMinutes = activityLogsForStats.reduce((sum: number, log: any) => {
        const createdAt = new Date(log.createdAt);
        const updatedAt = new Date(log.updatedAt);
        const diffInMs = updatedAt.getTime() - createdAt.getTime();
        const diffInMinutes = diffInMs / (1000 * 60);
        return sum + diffInMinutes;
      }, 0);

      averageResolutionTime = totalMinutes / activityLogsForStats.length;
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const reportsThisWeek = await adminLog.count({
      where: {
        adminId: id,
        isSuspend: false,
        createdAt: {
          [Op.gte]: startOfWeek
        }
      }
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const reportsThisMonth = await adminLog.count({
      where: {
        adminId: id,
        isSuspend: false,
        createdAt: {
          [Op.gte]: startOfMonth
        }
      }
    });

    let formattedResolutionTime = null;
    if (averageResolutionTime) {
      const hours = Math.floor(averageResolutionTime / 60);
      const minutes = Math.round(averageResolutionTime % 60);
      formattedResolutionTime = `${hours}h ${minutes}m`;
    }
    const permissions = await moderatorPermissions.findOne({
      where: { moderatorId: id },
      attributes: [
        "userManagement",
        "companyManagement",
        "newRegistrationRequests",
        "profileUpdateRequests",
        "forums",
        "reportedChats",
        "moderatorManagement",
        "pushNotifications",
        "restoreOldData"
      ]
    });

    return {
      id: res.id,
      name: res.name,
      email: res.email,
      phone: res.phone,
      adminRoleId: res.adminRoleId,
      accountStatus: res.accountStatus,
      createdAt: res.createdAt,
      averageResolutionTime: formattedResolutionTime,
      reportsHandledThisWeek: reportsThisWeek,
      reportsHandledThisMonth: reportsThisMonth,
      permissions: permissions || {
        userManagement: false,
        companyManagement: false,
        newRegistrationRequests: false,
        profileUpdateRequests: false,
        forums: false,
        reportedChats: false,
        moderatorManagement: false,
        pushNotifications: false,
        restoreOldData: false
      },
      activityLogs: activityLogsData
    };
  };

  public getAllUsers = async (data: any): Promise<any> => {
    const { limit, offset, filters } = data;

    if (filters?.industryId && typeof filters.industryId === 'string') {
      try {
        filters.industryId = JSON.parse(filters.industryId);
      } catch (e) {
        filters.industryId = [];
      }
    }

    let whereClause: any = [];
    if (filters?.type) {
      const typeFilters = typeof filters.type === 'string' ? filters.type.split(',') : [filters.type];
      const typeConditions: any[] = [];
      const validTypes = ['verified', 'unVerified', 'mute', 'suspend', 'approved', 'muted', 'rejected', 'isInEditing'];

      const invalidTypes = typeFilters.filter((type: string) => {
        const trimmedType = type.trim();
        return !validTypes.includes(trimmedType);
      });

      if (invalidTypes.length > 0) {
        throw new Error(`Invalid filter type(s): ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
      }

      typeFilters.forEach((type: string) => {
        const trimmedType = type.trim();

        switch (trimmedType) {
          case "verified":
            typeConditions.push({ "$roleData.isApproved$": true });
            break;
          case "unVerified":
            typeConditions.push({
              "profileStatus": 2,
            });
            break;
          case "mute":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "suspend":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isSuspend = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isSuspend = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "approved":
            typeConditions.push({
              "$roleData.isApproved$": true,
            });
            break;
          case "muted":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "rejected":
            typeConditions.push({
              "profileStatus": 4,
            });
            break;
          case "isInEditing":
            typeConditions.push({
              "profileStatus": 7,
            });
            break;
        }
      });
      if (typeConditions.length > 0) {
        if (typeConditions.length === 1) {
          Object.assign(whereClause, typeConditions[0]);
        } else {
          whereClause[Op.and] = typeConditions;
        }
      }
    }

    if (filters?.search) {
      const searchTerm = filters.search.trim();
      const searchConditions = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } },
        { phone: { [Op.like]: `%${searchTerm}%` } },
        Sequelize.literal(`EXISTS (SELECT 1 FROM roleData WHERE roleData.userId = users.id AND (roleData.firstName LIKE '%${searchTerm}%' OR roleData.lastName LIKE '%${searchTerm}%' OR roleData.companyName LIKE '%${searchTerm}%'))`)
      ];

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          { [Op.or]: searchConditions }
        ];
        delete whereClause[Op.or];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    }

    if (filters?.chatAvailability) {
      const chatFilters = typeof filters.chatAvailability === 'string' ? filters.chatAvailability.split(',') : [filters.chatAvailability];
      const chatConditions: any[] = [];
      const validChatAvailability = ['available', 'unavailable'];

      const invalidChatAvailability = chatFilters.filter((availability: string) => {
        const trimmedAvailability = availability.trim();
        return !validChatAvailability.includes(trimmedAvailability);
      });

      if (invalidChatAvailability.length > 0) {
        throw new Error(`Invalid chat availability filter(s): ${invalidChatAvailability.join(', ')}. Valid options are: ${validChatAvailability.join(', ')}`);
      }

      chatFilters.forEach((availability: string) => {
        const trimmedAvailability = availability.trim();

        switch (trimmedAvailability) {
          case "available":
            chatConditions.push({ "$roleData.accountStatus$": 1 });
            break;
          case "unavailable":
            chatConditions.push({
              "$roleData.accountStatus$": {
                [Op.or]: [0, null],
              },
            });
            break;
        }
      });

      if (chatConditions.length > 0) {
        const chatFilter = chatConditions.length === 1 ? chatConditions[0] : { [Op.or]: chatConditions };

        if (whereClause[Op.and] || whereClause[Op.or]) {
          const existingConditions = whereClause[Op.and] || whereClause[Op.or];
          whereClause[Op.and] = [
            ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
            chatFilter
          ];
          delete whereClause[Op.or];
        } else {
          Object.assign(whereClause, chatFilter);
        }
      }
    }

    if (filters?.industryId && filters.industryId.length > 0) {
      const industryConditions = filters.industryId.map((id: number) =>
          Sequelize.literal(
            `JSON_CONTAINS(\`roleData\`.\`industryId\`, '${id}', '$')`
          )
      );

      const industryFilter = industryConditions.length === 1
        ? { "$roleData.industryId$": industryConditions[0] }
        : { "$roleData.industryId$": { [Op.and]: industryConditions } };

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          industryFilter
        ];
        delete whereClause[Op.or];
      } else {
        Object.assign(whereClause, industryFilter);
      }
    }

    if (filters?.currentMonth === true) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthFilter = {
        "$roleData.createdAt$": {
        [Op.and]: [
          Sequelize.literal(`MONTH(\`roleData\`.\`createdAt\`) = ${currentMonth}`),
          Sequelize.literal(`YEAR(\`roleData\`.\`createdAt\`) = ${currentYear}`)
        ]
        }
      };

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          monthFilter
        ];
        delete whereClause[Op.or];
      } else {
        Object.assign(whereClause, monthFilter);
      }
    }
    
    const res: any = await users.findAndCountAll({
      where: { roleId: 1, deletedAt: null, ...whereClause },
      attributes: ["id", "roleId", "name", "email", "phone", "profileStatus", "createdAt", "updatedAt"],
      include: [
        {
          model: roleData,
          attributes: [
            "currentSituationId",
            "accountStatus",
            "firstName",
            "lastName",
            "profile",
            "industryId",
            "isApproved",
            "mutedOn",
            "suspendedOn",
          ],
          required:
            filters?.type?.includes("verified") ||
            filters?.type?.includes("unVerified") ||
            filters?.type?.includes("approved") ||
            filters?.industryId?.length > 0 ||
            filters?.chatAvailability ||
            filters?.currentMonth === true,
        },
        {
          model: userLog,
          attributes: [],
          required: false,
          as: "userLog",
        },
      ],
      // order: [["createdAt", "DESC"]],
      limit: limit,
      offset: limit * offset,
      distinct: true,
    });
    const enhancedRows = await Promise.all(
      res.rows.map(async (user: any) => {
        const warningCounts = await userLog.findAll({
          where: { userId: user.id },
          attributes: [
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
          ],
          raw: true
        });

        const warnings: any = warningCounts[0] || {
          muteCount: 0,
          suspendCount: 0
        };

        const muteCount = parseInt(warnings.muteCount) || 0;
        const suspendCount = parseInt(warnings.suspendCount) || 0;

        return {
          ...user.toJSON(),
          profilePicture: user.roleData?.profile || null,
          warnings: {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount
          }
        };
      })
    );

    res.rows = enhancedRows.reverse();

    return res;
  };

  public getAllEmployeesDetailed = async (data: any): Promise<any> => {
    const { limit, offset, filters } = data;

    if (filters?.industryId && typeof filters.industryId === 'string') {
      try {
        filters.industryId = JSON.parse(filters.industryId);
      } catch (e) {
        filters.industryId = [];
      }
    }

    let whereClause: any = {};
    if (filters?.type) {
      const typeFilters = typeof filters.type === 'string' ? filters.type.split(',') : [filters.type];
      const typeConditions: any[] = [];
      const validTypes = ['verified', 'unVerified', 'mute', 'suspend', 'approved', 'muted', 'rejected', 'isInEditingState'];

      const invalidTypes = typeFilters.filter((type: string) => {
        const trimmedType = type.trim();
        return !validTypes.includes(trimmedType);
      });

      if (invalidTypes.length > 0) {
        throw new Error(`Invalid filter type(s): ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
      }

      typeFilters.forEach((type: string) => {
        const trimmedType = type.trim();

        switch (trimmedType) {
          case "verified":
            typeConditions.push({ "isApproved": true });
            break;
          case "unVerified":
            typeConditions.push({
              "profileStatus": 2,
            });
            break;
          case "mute":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.employeeId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.employeeId = ul1.employeeId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "suspend":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.employeeId 
                   FROM userLog ul1 
                   WHERE ul1.isSuspend = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.employeeId = ul1.employeeId 
                     AND ul2.isSuspend = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "approved":
            typeConditions.push({
              "isApproved": true,
            });
            break;
          case "muted":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.employeeId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.employeeId = ul1.employeeId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "rejected":
            typeConditions.push({
              "profileStatus": 4,
            });
            break;
          case "isInEditingState":
            typeConditions.push({
              "profileStatus": 7,
            });
            break;
        }
      });
      if (typeConditions.length > 0) {
        if (typeConditions.length === 1) {
          Object.assign(whereClause, typeConditions[0]);
        } else {
          whereClause[Op.and] = typeConditions;
        }
      }
    }

    if (filters?.search) {
      const searchTerm = filters.search.trim();
      const searchConditions = [
        { firstName: { [Op.like]: `%${searchTerm}%` } },
        { lastName: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } },
        { phone: { [Op.like]: `%${searchTerm}%` } }
      ];

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          { [Op.or]: searchConditions }
        ];
        delete whereClause[Op.or];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    }

    if (filters?.chatAvailability) {
      const chatFilters = typeof filters.chatAvailability === 'string' ? filters.chatAvailability.split(',') : [filters.chatAvailability];
      const chatConditions: any[] = [];
      const validChatAvailability = ['available', 'unavailable'];

      const invalidChatAvailability = chatFilters.filter((availability: string) => {
        const trimmedAvailability = availability.trim();
        return !validChatAvailability.includes(trimmedAvailability);
      });

      if (invalidChatAvailability.length > 0) {
        throw new Error(`Invalid chat availability filter(s): ${invalidChatAvailability.join(', ')}. Valid options are: ${validChatAvailability.join(', ')}`);
      }

      chatFilters.forEach((availability: string) => {
        const trimmedAvailability = availability.trim();

        switch (trimmedAvailability) {
          case "available":
            chatConditions.push({ "accountStatus": 1 });
            break;
          case "unavailable":
            chatConditions.push({
              "accountStatus": {
                [Op.or]: [0, null],
              },
            });
            break;
        }
      });

      if (chatConditions.length > 0) {
        const chatFilter = chatConditions.length === 1 ? chatConditions[0] : { [Op.or]: chatConditions };

        if (whereClause[Op.and] || whereClause[Op.or]) {
          const existingConditions = whereClause[Op.and] || whereClause[Op.or];
          whereClause[Op.and] = [
            ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
            chatFilter
          ];
          delete whereClause[Op.or];
        } else {
          Object.assign(whereClause, chatFilter);
        }
      }
    }

    if (filters?.currentMonth === true) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthFilter = {
        "createdAt": {
        [Op.and]: [
          Sequelize.literal(`MONTH(\`createdAt\`) = ${currentMonth}`),
          Sequelize.literal(`YEAR(\`createdAt\`) = ${currentYear}`)
        ]
        }
      };

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          monthFilter
        ];
        delete whereClause[Op.or];
      } else {
        Object.assign(whereClause, monthFilter);
      }
    }
    
    const res: any = await employee.findAndCountAll({
      where: { deletedAt: null, ...whereClause },
      attributes: [
        "id", 
        "userId", 
        "profile", 
        "firstName", 
        "lastName", 
        "currentSituationId", 
        "currentSituationName", 
        "email", 
        "phone", 
        "profileStatus", 
        "accountStatus", 
        "isApproved", 
        "rejectionReason", 
        "createdAt", 
        "updatedAt", 
        "suspendedOn", 
        "mutedOn", 
        "suspendReason", 
        "muteReason"
      ],
      include: [
        {
          model: users,
          as: "users",
          attributes: ["id", "roleId", "name"],
          required: false,
          include: [
            {
              model: roleData,
              as: "roleData",
              attributes: ["id", "companyName", "city", "province", "website"],
              required: false
            }
          ]
        },
        {
          model: userLog,
          attributes: [],
          required: false,
          as: "userLog",
        },
      ],
      limit: limit,
      offset: limit * offset,
      distinct: true,
    });
    
    const enhancedRows = await Promise.all(
      res.rows.map(async (emp: any) => {
        const warningCounts = await userLog.findAll({
          where: { employeeId: emp.id },
          attributes: [
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
          ],
          raw: true
        });

        const warnings: any = warningCounts[0] || {
          muteCount: 0,
          suspendCount: 0
        };

        const muteCount = parseInt(warnings.muteCount) || 0;
        const suspendCount = parseInt(warnings.suspendCount) || 0;

        return {
          ...emp.toJSON(),
          profilePicture: emp.profile || null,
          companyName: emp.users?.roleData?.companyName || "Unknown Company",
          warnings: {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount
          }
        };
      })
    );

    res.rows = enhancedRows.reverse();

    return res;
  };

public getRegistrationRequests = async (data: any): Promise<any> => {
  const { limit, offset, filters } = data;

  // 🔹 Parse industryId safely
  if (filters?.industryId && typeof filters.industryId === "string") {
    try {
      filters.industryId = JSON.parse(filters.industryId);
    } catch {
      filters.industryId = [];
    }
  }

  let whereClause: any = {};

  // 🔹 ROLE FILTER
  const roleFilterMap: Record<string, number> = {
    freelancer: 1,
    company: 2,
    employee: 3,
  };
  if (filters?.role && roleFilterMap[filters.role]) {
    whereClause.roleId = roleFilterMap[filters.role];
  }

  // 🔹 STATUS FILTER
  const statusFilterMap: Record<string, number> = {
    'not-submitted': 1,
    pending: 2,
    active: 3,
    declined: 4,
    'partial-deleted': 5,
    'video-not-submitted': 6,
    edit: 7,
  };
  if (filters?.status && statusFilterMap[filters.status.toLowerCase()]) {
    whereClause.profileStatus = statusFilterMap[filters.status.toLowerCase()];
  }

  // 🔹 SEARCH FILTER
  if (filters?.search) {
    const searchTerm = filters.search.trim();
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${searchTerm}%` } },
      { email: { [Op.like]: `%${searchTerm}%` } },
      { phone: { [Op.like]: `%${searchTerm}%` } },
      Sequelize.literal(`
        EXISTS (
          SELECT 1 FROM roleData 
          WHERE roleData.userId = users.id
          AND roleData.deletedAt IS NULL
          AND (
            roleData.firstName LIKE '%${searchTerm}%'
            OR roleData.lastName LIKE '%${searchTerm}%'
            OR roleData.companyName LIKE '%${searchTerm}%'
          )
        )
      `),
    ];
  }

  // 🔹 INDUSTRY FILTER
  if (filters?.industryId && filters.industryId.length > 0) {
    whereClause[Op.and] = filters.industryId.map((id: number) =>
      Sequelize.literal(`JSON_CONTAINS(roleData.industryId, '${id}', '$')`)
    );
  }

  // 🔹 Query with Sorting (Latest First)
  const res: any = await users.findAndCountAll({
    where: { deletedAt: null, ...whereClause },
    attributes: ["id", "roleId", "name", "email", "phone", "profileStatus", "createdAt"],
    include: [
      {
        model: roleData,
        as: "roleData",
        attributes: [
          "accountStatus",
          "firstName",
          "lastName",
          "profile",
          "industryId",
          "isApproved",
          "mutedOn",
          "suspendedOn",
          "chamberCommerceNumber",
          "companyName",
          "createdAt",
        ],
        where: { deletedAt: null }, // Ensure roleData is not soft-deleted
        required: false,
      },
      {
        model: userLog,
        attributes: [],
        required: false,
        as: "userLog",
      },
    ],
    limit,
    offset: limit * offset,
    distinct: true,
    order: [["createdAt", "DESC"]], // Sort newest first
    subQuery: false,
  });

  // Updated statusMap to match all profileStatus values
  const roleMap: Record<number, string> = {
    1: "freelancer",
    2: "company",
    3: "employee",
  };
  const statusMap: Record<number, string> = {
    1: "not-submitted",
    2: "pending",
    3: "active",
    4: "declined",
    5: "partial-deleted",
    6: "video-not-submitted",
    7: "edit",
  };

  const enhancedRows = await Promise.all(
    res.rows.map(async (user: any) => {
      const warningCounts: any[] = await userLog.findAll({
        where: { userId: user.id },
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.literal("CASE WHEN isMuted = true THEN 1 END")), "muteCount"],
          [Sequelize.fn("COUNT", Sequelize.literal("CASE WHEN isSuspend = true THEN 1 END")), "suspendCount"],
        ],
        raw: true,
      });

      const muteCount = parseInt((warningCounts[0]?.muteCount as string) || "0");
      const suspendCount = parseInt((warningCounts[0]?.suspendCount as string) || "0");
      const roleDataObj = user.roleData || {};

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: roleMap[user.roleId] || "unknown",
        status: statusMap[user.profileStatus] || "unknown",
        profilePicture: roleDataObj.profile || null,
        chamberCommerceNumber: roleDataObj.chamberCommerceNumber || null,
        companyName: roleDataObj.companyName || null,
        joinedAt: roleDataObj.createdAt || null,
        dataSubmittedAt: user.createdAt || null,
        warnings: {
          total: muteCount + suspendCount,
          mute: muteCount,
          suspend: suspendCount,
        },
      };
    })
  );

  res.rows = enhancedRows;
  return res;
};

public getProfileUpdateRequests = async (data: any): Promise<any> => {
  const { limit, offset, filters } = data;

  // 🔹 Parse industryId safely
  if (filters?.industryId && typeof filters.industryId === "string") {
    try {
      filters.industryId = JSON.parse(filters.industryId);
    } catch {
      filters.industryId = [];
    }
  }

  let whereClause: any = {};

  // 🔹 ROLE FILTER
  const roleFilterMap: Record<string, number> = {
    freelancer: 1,
    company: 2,
    employee: 3,
  };
  if (filters?.role && roleFilterMap[filters.role]) {
    whereClause.roleId = roleFilterMap[filters.role];
  }

  // 🔹 SEARCH FILTER
  if (filters?.search) {
    const searchTerm = filters.search.trim();
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${searchTerm}%` } },
      { email: { [Op.like]: `%${searchTerm}%` } },
      { phone: { [Op.like]: `%${searchTerm}%` } },
      Sequelize.literal(`
        EXISTS (
          SELECT 1 FROM roleData 
          WHERE roleData.userId = users.id
          AND (
            roleData.firstName LIKE '%${searchTerm}%'
            OR roleData.lastName LIKE '%${searchTerm}%'
            OR roleData.companyName LIKE '%${searchTerm}%'
          )
        )
      `),
    ];
  }

  // 🔹 INDUSTRY FILTER
  if (filters?.industryId && filters.industryId.length > 0) {
    whereClause[Op.and] = filters.industryId.map((id: number) =>
      Sequelize.literal(`JSON_CONTAINS(roleData.industryId, '${id}', '$')`)
    );
  }

  // 🔹 Query with Sorting
  const res: any = await users.findAndCountAll({
    where: { deletedAt: null, ...whereClause },
    attributes: ["id", "roleId", "name", "email", "phone", "createdAt"],
    include: [
      {
        model: roleData,
        attributes: [
          "currentSituationId",
          "accountStatus",
          "firstName",
          "lastName",
          "profile",
          "industryId",
          "isApproved",
          "mutedOn",
          "suspendedOn",
          "chamberCommerceNumber",
          "companyName",
          "createdAt",
        ],
        required: false,
      },
      {
        model: userLog,
        attributes: [],
        required: false,
      },
    ],
    limit,
    offset: limit * offset,
    distinct: true,
    order: [["createdAt", "DESC"]],
    subQuery: false,
  });

  const roleMap: Record<number, string> = {
    1: "freelancer",
    2: "company",
    3: "employee",
  };

  const enhancedRows = await Promise.all(
    res.rows.map(async (user: any) => {
      // Fetch warning counts
      const warningCounts: any[] = await userLog.findAll({
        where: { userId: user.id },
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.literal("CASE WHEN isMuted = true THEN 1 END")), "muteCount"],
          [Sequelize.fn("COUNT", Sequelize.literal("CASE WHEN isSuspend = true THEN 1 END")), "suspendCount"],
        ],
        raw: true,
      });

      const muteCount = parseInt((warningCounts[0]?.muteCount as string) || "0");
      const suspendCount = parseInt((warningCounts[0]?.suspendCount as string) || "0");
      const roleDataObj = user.roleData || {};

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: roleMap[user.roleId as keyof typeof roleMap] || "unknown",
        profilePicture: roleDataObj.profile || null,
        chamberCommerceNumber: roleDataObj.chamberCommerceNumber || null,
        companyName: roleDataObj.companyName || null,
        currentSituation: roleDataObj.currentSituationId || null,
        joinedAt: roleDataObj.createdAt || null,
        dataSubmittedAt: user.createdAt || null,
        warnings: {
          total: muteCount + suspendCount,
          mute: muteCount,
          suspend: suspendCount,
        },
      };
    })
  );

  res.rows = enhancedRows;
  return res;
};





  // public getAllEmployeesDetailed = async (data: any): Promise<any> => {
  //   const { limit, offset, filters } = data;

  //   if (filters?.industryId && typeof filters.industryId === 'string') {
  //     try {
  //       filters.industryId = JSON.parse(filters.industryId);
  //     } catch (e) {
  //       filters.industryId = [];
  //     }
  //   }

  //   let whereClause: any = [];
  //   if (filters?.type) {
  //     const typeFilters = typeof filters.type === 'string' ? filters.type.split(',') : [filters.type];
  //     const typeConditions: any[] = [];
  //     const validTypes = ['verified', 'unVerified', 'mute', 'suspend', 'approved', 'muted'];

  //     const invalidTypes = typeFilters.filter((type: string) => {
  //       const trimmedType = type.trim();
  //       return !validTypes.includes(trimmedType);
  //     });

  //     if (invalidTypes.length > 0) {
  //       throw new Error(`Invalid filter type(s): ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
  //     }

  //     typeFilters.forEach((type: string) => {
  //       const trimmedType = type.trim();

  //       switch (trimmedType) {
  //         case "verified":
  //           typeConditions.push({ "isApproved": true });
  //           break;
  //         case "unVerified":
  //           typeConditions.push({
  //             "profileStatus": 2,
  //           });
  //           break;
  //         case "mute":
  //           typeConditions.push({
  //             id: {
  //               [Op.in]: Sequelize.literal(
  //                 `(SELECT DISTINCT ul1.employeeId 
  //                  FROM userLog ul1 
  //                  WHERE ul1.isMuted = true 
  //                  AND ul1.deletedAt IS NULL
  //                  AND NOT EXISTS (
  //                    SELECT 1 FROM userLog ul2 
  //                    WHERE ul2.employeeId = ul1.employeeId 
  //                    AND ul2.isMuted = false 
  //                    AND ul2.createdAt > ul1.createdAt 
  //                    AND ul2.deletedAt IS NULL
  //                  ))`
  //               )
  //             }
  //           });
  //           break;
  //         case "suspend":
  //           typeConditions.push({
  //             id: {
  //               [Op.in]: Sequelize.literal(
  //                 `(SELECT DISTINCT ul1.employeeId 
  //                  FROM userLog ul1 
  //                  WHERE ul1.isSuspend = true 
  //                  AND ul1.deletedAt IS NULL
  //                  AND NOT EXISTS (
  //                    SELECT 1 FROM userLog ul2 
  //                    WHERE ul2.employeeId = ul1.employeeId 
  //                    AND ul2.isSuspend = false 
  //                    AND ul2.createdAt > ul1.createdAt 
  //                    AND ul2.deletedAt IS NULL
  //                  ))`
  //               )
  //             }
  //           });
  //           break;
  //         case "approved":
  //           typeConditions.push({
  //             "isApproved": true,
  //           });
  //           break;
  //         case "muted":
  //           typeConditions.push({
  //             id: {
  //               [Op.in]: Sequelize.literal(
  //                 `(SELECT DISTINCT ul1.employeeId 
  //                  FROM userLog ul1 
  //                  WHERE ul1.isMuted = true 
  //                  AND ul1.deletedAt IS NULL
  //                  AND NOT EXISTS (
  //                    SELECT 1 FROM userLog ul2 
  //                    WHERE ul2.employeeId = ul1.employeeId 
  //                    AND ul2.isMuted = false 
  //                    AND ul2.createdAt > ul1.createdAt 
  //                    AND ul2.deletedAt IS NULL
  //                  ))`
  //               )
  //             }
  //           });
  //           break;
  //       }
  //     });
  //     if (typeConditions.length > 0) {
  //       if (typeConditions.length === 1) {
  //         Object.assign(whereClause, typeConditions[0]);
  //       } else {
  //         whereClause[Op.and] = typeConditions;
  //       }
  //     }
  //   }

  //   if (filters?.search) {
  //     const searchTerm = filters.search.trim();
  //     const searchConditions = [
  //       { firstName: { [Op.like]: `%${searchTerm}%` } },
  //       { lastName: { [Op.like]: `%${searchTerm}%` } },
  //       { email: { [Op.like]: `%${searchTerm}%` } },
  //       { phone: { [Op.like]: `%${searchTerm}%` } }
  //     ];

  //     if (whereClause[Op.and] || whereClause[Op.or]) {
  //       const existingConditions = whereClause[Op.and] || whereClause[Op.or];
  //       whereClause[Op.and] = [
  //         ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
  //         { [Op.or]: searchConditions }
  //       ];
  //       delete whereClause[Op.or];
  //     } else {
  //       whereClause[Op.or] = searchConditions;
  //     }
  //   }

  //   if (filters?.chatAvailability) {
  //     const chatFilters = typeof filters.chatAvailability === 'string' ? filters.chatAvailability.split(',') : [filters.chatAvailability];
  //     const chatConditions: any[] = [];
  //     const validChatAvailability = ['available', 'unavailable'];

  //     const invalidChatAvailability = chatFilters.filter((availability: string) => {
  //       const trimmedAvailability = availability.trim();
  //       return !validChatAvailability.includes(trimmedAvailability);
  //     });

  //     if (invalidChatAvailability.length > 0) {
  //       throw new Error(`Invalid chat availability filter(s): ${invalidChatAvailability.join(', ')}. Valid options are: ${validChatAvailability.join(', ')}`);
  //     }

  //     chatFilters.forEach((availability: string) => {
  //       const trimmedAvailability = availability.trim();

  //       switch (trimmedAvailability) {
  //         case "available":
  //           chatConditions.push({ "accountStatus": 1 });
  //           break;
  //         case "unavailable":
  //           chatConditions.push({
  //             "accountStatus": {
  //               [Op.or]: [0, null],
  //             },
  //           });
  //           break;
  //       }
  //     });

  //     if (chatConditions.length > 0) {
  //       const chatFilter = chatConditions.length === 1 ? chatConditions[0] : { [Op.or]: chatConditions };

  //       if (whereClause[Op.and] || whereClause[Op.or]) {
  //         const existingConditions = whereClause[Op.and] || whereClause[Op.or];
  //         whereClause[Op.and] = [
  //           ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
  //           chatFilter
  //         ];
  //         delete whereClause[Op.or];
  //       } else {
  //         Object.assign(whereClause, chatFilter);
  //       }
  //     }
  //   }

  //   if (filters?.currentMonth === true) {
  //     const currentDate = new Date();
  //     const currentMonth = currentDate.getMonth() + 1;
  //     const currentYear = currentDate.getFullYear();

  //     const monthFilter = {
  //       "createdAt": {
  //       [Op.and]: [
  //         Sequelize.literal(`MONTH(\`createdAt\`) = ${currentMonth}`),
  //         Sequelize.literal(`YEAR(\`createdAt\`) = ${currentYear}`)
  //       ]
  //       }
  //     };

  //     if (whereClause[Op.and] || whereClause[Op.or]) {
  //       const existingConditions = whereClause[Op.and] || whereClause[Op.or];
  //       whereClause[Op.and] = [
  //         ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
  //         monthFilter
  //       ];
  //       delete whereClause[Op.or];
  //     } else {
  //       Object.assign(whereClause, monthFilter);
  //     }
  //   }
    
  //   const res: any = await employee.findAndCountAll({
  //     where: { deletedAt: null, ...whereClause },
  //     attributes: [
  //       "id", 
  //       "userId", 
  //       "profile", 
  //       "firstName", 
  //       "lastName", 
  //       "currentSituationId", 
  //       "currentSituationName", 
  //       "email", 
  //       "phone", 
  //       "profileStatus", 
  //       "accountStatus", 
  //       "isApproved", 
  //       "rejectionReason", 
  //       "createdAt", 
  //       "updatedAt", 
  //       "suspendedOn", 
  //       "mutedOn", 
  //       "suspendReason", 
  //       "muteReason"
  //     ],
  //     include: [
  //       {
  //         model: users,
  //         as: "users",
  //         attributes: ["id", "roleId", "name"],
  //         required: false,
  //         include: [
  //           {
  //             model: roleData,
  //             as: "roleData",
  //             attributes: ["id", "companyName", "city", "province", "website"],
  //             required: false
  //           }
  //         ]
  //       },
  //       {
  //         model: userLog,
  //         attributes: [],
  //         required: false,
  //         as: "userLog",
  //       },
  //     ],
  //     limit: limit,
  //     offset: limit * offset,
  //     distinct: true,
  //   });
    
  //   const enhancedRows = await Promise.all(
  //     res.rows.map(async (emp: any) => {
  //       const warningCounts = await userLog.findAll({
  //         where: { employeeId: emp.id },
  //         attributes: [
  //           [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
  //           [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
  //         ],
  //         raw: true
  //       });

  //       const warnings: any = warningCounts[0] || {
  //         muteCount: 0,
  //         suspendCount: 0
  //       };

  //       const muteCount = parseInt(warnings.muteCount) || 0;
  //       const suspendCount = parseInt(warnings.suspendCount) || 0;

  //       return {
  //         ...emp.toJSON(),
  //         profilePicture: emp.profile || null,
  //         companyName: emp.users?.roleData?.companyName || "Unknown Company",
  //         warnings: {
  //           total: muteCount + suspendCount,
  //           mute: muteCount,
  //           suspend: suspendCount
  //         }
  //       };
  //     })
  //   );

  //   res.rows = enhancedRows.reverse();

  //   return res;
  // };

  public getAllCompanies = async (data: any): Promise<any> => {
    const { limit, offset, filters } = data;

    if (filters?.industryId && typeof filters.industryId === 'string') {
      try {
        filters.industryId = JSON.parse(filters.industryId);
      } catch (e) {
        filters.industryId = [];
      }
    }

    let whereClause: any = [];
    if (filters?.type) {
      const typeFilters = typeof filters.type === 'string' ? filters.type.split(',') : [filters.type];
      const typeConditions: any[] = [];
      const validTypes = ['verified', 'unVerified', 'mute', 'suspend', 'approved', 'muted', 'rejected', 'isInEditingState'];

      const invalidTypes = typeFilters.filter((type: string) => {
        const trimmedType = type.trim();
        return !validTypes.includes(trimmedType);
      });

      if (invalidTypes.length > 0) {
        throw new Error(`Invalid filter type(s): ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
      }

      typeFilters.forEach((type: string) => {
        const trimmedType = type.trim();

        switch (trimmedType) {
          case "verified":
            typeConditions.push({ "$roleData.isApproved$": true });
            break;
          case "unVerified":
            typeConditions.push({
              "profileStatus": 2,
            });
            break;
          case "mute":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "suspend":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isSuspend = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isSuspend = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "approved":
            typeConditions.push({
              "$roleData.isApproved$": true,
            });
            break;
          case "muted":
            typeConditions.push({
              id: {
                [Op.in]: Sequelize.literal(
                  `(SELECT DISTINCT ul1.userId 
                   FROM userLog ul1 
                   WHERE ul1.isMuted = true 
                   AND ul1.deletedAt IS NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM userLog ul2 
                     WHERE ul2.userId = ul1.userId 
                     AND ul2.isMuted = false 
                     AND ul2.createdAt > ul1.createdAt 
                     AND ul2.deletedAt IS NULL
                   ))`
                )
              }
            });
            break;
          case "rejected":
            typeConditions.push({
              "profileStatus": 4,
            });
            break;
          case "isInEditingState":
            typeConditions.push({
              "profileStatus": 7,
            });
            break;
        }
      });
      if (typeConditions.length > 0) {
        if (typeConditions.length === 1) {
          Object.assign(whereClause, typeConditions[0]);
        } else {
          whereClause[Op.and] = typeConditions;
        }
      }
    }

    if (filters?.search) {
      const searchTerm = filters.search.trim();
      const searchConditions = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } },
        { phone: { [Op.like]: `%${searchTerm}%` } },
        Sequelize.literal(`EXISTS (SELECT 1 FROM roleData WHERE roleData.userId = users.id AND (roleData.firstName LIKE '%${searchTerm}%' OR roleData.lastName LIKE '%${searchTerm}%' OR roleData.companyName LIKE '%${searchTerm}%' OR roleData.chamberCommerceNumber LIKE '%${searchTerm}%'))`)
      ];

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          { [Op.or]: searchConditions }
        ];
        delete whereClause[Op.or];
      } else {
        whereClause[Op.or] = searchConditions;
      }
    }

    if (filters?.chatAvailability) {
      const chatFilters = typeof filters.chatAvailability === 'string' ? filters.chatAvailability.split(',') : [filters.chatAvailability];
      const chatConditions: any[] = [];
      const validChatAvailability = ['available', 'unavailable'];

      const invalidChatAvailability = chatFilters.filter((availability: string) => {
        const trimmedAvailability = availability.trim();
        return !validChatAvailability.includes(trimmedAvailability);
      });

      if (invalidChatAvailability.length > 0) {
        throw new Error(`Invalid chat availability filter(s): ${invalidChatAvailability.join(', ')}. Valid options are: ${validChatAvailability.join(', ')}`);
      }

      chatFilters.forEach((availability: string) => {
        const trimmedAvailability = availability.trim();

        switch (trimmedAvailability) {
          case "available":
            chatConditions.push({ "$roleData.accountStatus$": 1 });
            break;
          case "unavailable":
            chatConditions.push({
              "$roleData.accountStatus$": {
                [Op.or]: [0, null],
              },
            });
            break;
        }
      });

      if (chatConditions.length > 0) {
        const chatFilter = chatConditions.length === 1 ? chatConditions[0] : { [Op.or]: chatConditions };

        if (whereClause[Op.and] || whereClause[Op.or]) {
          const existingConditions = whereClause[Op.and] || whereClause[Op.or];
          whereClause[Op.and] = [
            ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
            chatFilter
          ];
          delete whereClause[Op.or];
        } else {
          Object.assign(whereClause, chatFilter);
        }
      }
    }

    if (filters?.industryId && filters.industryId.length > 0) {
      const industryConditions = filters.industryId.map((id: number) =>
          Sequelize.literal(
            `JSON_CONTAINS(\`roleData\`.\`industryId\`, '${id}', '$')`
          )
      );

      const industryFilter = industryConditions.length === 1
        ? { "$roleData.industryId$": industryConditions[0] }
        : { "$roleData.industryId$": { [Op.and]: industryConditions } };

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          industryFilter
        ];
        delete whereClause[Op.or];
      } else {
        Object.assign(whereClause, industryFilter);
      }
    }

    if (filters?.currentMonth === true) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const monthFilter = {
        "$roleData.createdAt$": {
        [Op.and]: [
          Sequelize.literal(`MONTH(\`roleData\`.\`createdAt\`) = ${currentMonth}`),
          Sequelize.literal(`YEAR(\`roleData\`.\`createdAt\`) = ${currentYear}`)
        ]
        }
      };

      if (whereClause[Op.and] || whereClause[Op.or]) {
        const existingConditions = whereClause[Op.and] || whereClause[Op.or];
        whereClause[Op.and] = [
          ...(Array.isArray(existingConditions) ? existingConditions : [existingConditions]),
          monthFilter
        ];
        delete whereClause[Op.or];
      } else {
        Object.assign(whereClause, monthFilter);
      }
    }
    
    const res: any = await users.findAndCountAll({
      where: { roleId: 2, deletedAt: null, ...whereClause }, // Changed to roleId: 2 for companies
      attributes: ["id", "roleId", "name", "email", "phone", "profileStatus", "createdAt", "updatedAt"],
      include: [
        {
          model: roleData,
          attributes: [
            "currentSituationId",
            "accountStatus",
            "firstName",
            "lastName",
            "profile",
            "industryId",
            "isApproved",
            "mutedOn",
            "suspendedOn",
            "companyName", // Added company name
            "chamberCommerceNumber", // Added chamber of commerce
          ],
          required:
            filters?.type?.includes("verified") ||
            filters?.type?.includes("unVerified") ||
            filters?.type?.includes("approved") ||
            filters?.industryId?.length > 0 ||
            filters?.chatAvailability ||
            filters?.currentMonth === true,
        },
        {
          model: userLog,
          attributes: [],
          required: false,
          as: "userLog",
        },
      ],
      // order: [["createdAt", "DESC"]],
      limit: limit,
      offset: limit * offset,
      distinct: true,
    });
    const enhancedRows = await Promise.all(
      res.rows.map(async (user: any) => {
        const warningCounts = await userLog.findAll({
          where: { userId: user.id },
          attributes: [
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
            [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
          ],
          raw: true
        });

        const warnings: any = warningCounts[0] || {
          muteCount: 0,
          suspendCount: 0
        };

        const muteCount = parseInt(warnings.muteCount) || 0;
        const suspendCount = parseInt(warnings.suspendCount) || 0;

        return {
          ...user.toJSON(),
          profilePicture: user.roleData?.profile || null,
          companyName: user.roleData?.companyName || null, // Added company name
          chamberCommerceNumber: user.roleData?.chamberCommerceNumber || null, // Added chamber of commerce
          warnings: {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount
          }
        };
      })
    );

    res.rows = enhancedRows.reverse();

    return res;
  };

  public getUserDetailsById = async (data: any): Promise<any> => {
    const { id } = data;  
    const userInfo = await users.findOne({
      where: { id: id, deletedAt: null },
      attributes: [
        "id",
        "roleId",
        "name",
        "email",
        "phone",
        "profileStatus",
        "rejectionReason",
        "emailVerified",
        "appealMessage",
        "lastLogin",
        "createdAt",
        "updatedAt"
      ],
      include: [
        {
          model: roleData,
          as: "roleData",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "genderId",
            "dob",
            "age",
            "address",
            "educationalAttainmentId",
            "chamberCommerceNumber",
            "currentSituationId",
            "languageId",
            "industryId",
            "about",
            "createdAt",
            "profile",
            "accountStatus",
            "isVideoSubmitted",
            "video",
            "title",
            "companyName",
            "hourlyRate"
          ],
          required: false
        },
      ],
    });

    if (!userInfo) {
      throw new Error("User not found");
    }
    const userRoleData = userInfo.roleData as any;
    const field = userInfo.roleId === 3 ? "employeeId" : "userId";
    const warningCounts = await userLog.findAll({
      where: { [field]: id },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
        [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
      ],
      raw: true
    });

    const warnings: any = warningCounts[0] || {
      muteCount: 0,
      suspendCount: 0
    };

    const latestMute = await userLog.findOne({
      where: { [field]: id, isMuted: true },
      include: [
        {
          model: admin,
          as: "mute",
          attributes: ["id", "name", "adminRoleId"],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const latestSuspend = await userLog.findOne({
      where: { [field]: id, isSuspend: true },
      include: [
        {
          model: admin,
          as: "suspend",
          attributes: ["id", "name", "adminRoleId"],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const userLogs = await this.getUserLogInfo({ userId: id, roleId: userInfo.roleId });

    let originalReason = null;
    if (userInfo.appealMessage) {
      const isCurrentlySuspended = userRoleData?.suspendedOn !== null;
      const isCurrentlyMuted = userRoleData?.mutedOn !== null;

      if (isCurrentlySuspended) {
        const originalSuspension = await userLog.findOne({
          where: {
            userId: id,
            isSuspend: true,
            deletedAt: null
          },
          attributes: ["suspendReason", "createdAt"],
          order: [["createdAt", "DESC"]]
        });
        originalReason = originalSuspension?.suspendReason || null;
      } else if (isCurrentlyMuted) {
        const originalMute = await userLog.findOne({
          where: {
            userId: id,
            isMuted: true,
            deletedAt: null
          },
          attributes: ["muteReason", "createdAt"],
          order: [["createdAt", "DESC"]]
        });
        originalReason = originalMute?.muteReason || null;
      } else {
        const latestSuspension = await userLog.findOne({
          where: {
            userId: id,
            isSuspend: true,
            deletedAt: null
          },
          attributes: ["suspendReason", "createdAt"],
          order: [["createdAt", "DESC"]]
        });

        const latestMute = await userLog.findOne({
          where: {
            userId: id,
            isMuted: true,
            deletedAt: null
          },
          attributes: ["muteReason", "createdAt"],
          order: [["createdAt", "DESC"]]
        });

        if (latestSuspension && latestMute) {
          if (latestSuspension.createdAt > latestMute.createdAt) {
            originalReason = latestSuspension.suspendReason;
          } else {
            originalReason = latestMute.muteReason;
          }
        } else if (latestSuspension) {
          originalReason = latestSuspension.suspendReason;
        } else if (latestMute) {
          originalReason = latestMute.muteReason;
        }
      }
      if (!originalReason) {
        const anyRecentLog = await userLog.findOne({
          where: {
            userId: id,
            deletedAt: null,
            [Op.or]: [
              { suspendReason: { [Op.ne]: "" } },
              { muteReason: { [Op.ne]: "" } }
            ]
          },
          attributes: ["suspendReason", "muteReason"],
          order: [["createdAt", "DESC"]]
        });
        
        if (anyRecentLog) {
          originalReason = anyRecentLog.suspendReason || anyRecentLog.muteReason;
        }
      }
    }

    return {
      ...userInfo.toJSON(),
      roleData: userRoleData || null,
      appeal: {
        message: userInfo.appealMessage || null,
        originalReason: originalReason
      },
      warnings: {
        muted: {
          count: parseInt(warnings.muteCount) || 0,
          admin: latestMute?.mute ? (latestMute.mute as any).toJSON() : null
        },
        suspended: {
          count: parseInt(warnings.suspendCount) || 0,
          admin: latestSuspend?.suspend ? (latestSuspend.suspend as any).toJSON() : null
        }
      },
      logs: userLogs
    };
  };

  public getCompanyDetails = async (data: any): Promise<any> => {
  const { id } = data;  
  const companyInfo = await users.findOne({
    where: { id: id, roleId: 2, deletedAt: null }, // roleId: 2 for companies
    attributes: [
      "id",
      "roleId",
      "name",
      "email",
      "phone",
      "profileStatus",
      "rejectionReason",
      "emailVerified",
      "appealMessage",
      "createdAt",
      "updatedAt",
      "lastLogin"   // 👈 Added here
    ],
    include: [
      {
        model: roleData,
        as: "roleData",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "chamberCommerceNumber",
          "currentSituationId",
          "industryId",
          "about",
          "createdAt",
          "profile",
          "accountStatus",
          "isVideoSubmitted",
          "video",
          "title",
          "companyName",
          "hourlyRate",
          "city",
          "province",
          "website",
          "postalCode",
          "houseName",
          "streetName"
        ],
        required: false
      },
    ],
  });

  if (!companyInfo) {
    throw new Error("Company not found");
  }

  const companyRoleData = companyInfo.roleData as any;
  const field = "userId"; // Companies use userId field

  const warningCounts = await userLog.findAll({
    where: { [field]: id },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
    ],
    raw: true
  });

  const warnings: any = warningCounts[0] || {
    muteCount: 0,
    suspendCount: 0
  };

  const latestMute = await userLog.findOne({
    where: { [field]: id, isMuted: true },
    include: [
      {
        model: admin,
        as: "mute",
        attributes: ["id", "name", "adminRoleId"],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  const latestSuspend = await userLog.findOne({
    where: { [field]: id, isSuspend: true },
    include: [
      {
        model: admin,
        as: "suspend",
        attributes: ["id", "name", "adminRoleId"],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  const companyLogs = await this.getUserLogInfo({ userId: id, roleId: companyInfo.roleId });

  let originalReason = null;
  if (companyInfo.appealMessage) {
    const isCurrentlySuspended = companyRoleData?.suspendedOn !== null;
    const isCurrentlyMuted = companyRoleData?.mutedOn !== null;

    if (isCurrentlySuspended) {
      const originalSuspension = await userLog.findOne({
        where: { userId: id, isSuspend: true, deletedAt: null },
        attributes: ["suspendReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });
      originalReason = originalSuspension?.suspendReason || null;
    } else if (isCurrentlyMuted) {
      const originalMute = await userLog.findOne({
        where: { userId: id, isMuted: true, deletedAt: null },
        attributes: ["muteReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });
      originalReason = originalMute?.muteReason || null;
    } else {
      const latestSuspension = await userLog.findOne({
        where: { userId: id, isSuspend: true, deletedAt: null },
        attributes: ["suspendReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });

      const latestMute = await userLog.findOne({
        where: { userId: id, isMuted: true, deletedAt: null },
        attributes: ["muteReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });

      if (latestSuspension && latestMute) {
        originalReason = latestSuspension.createdAt > latestMute.createdAt
          ? latestSuspension.suspendReason
          : latestMute.muteReason;
      } else if (latestSuspension) {
        originalReason = latestSuspension.suspendReason;
      } else if (latestMute) {
        originalReason = latestMute.muteReason;
      }
    }

    if (!originalReason) {
      const anyRecentLog = await userLog.findOne({
        where: {
          userId: id,
          deletedAt: null,
          [Op.or]: [
            { suspendReason: { [Op.ne]: "" } },
            { muteReason: { [Op.ne]: "" } }
          ]
        },
        attributes: ["suspendReason", "muteReason"],
        order: [["createdAt", "DESC"]]
      });
      
      if (anyRecentLog) {
        originalReason = anyRecentLog.suspendReason || anyRecentLog.muteReason;
      }
    }
  }

  return {
    ...companyInfo.toJSON(),
    roleData: companyRoleData || null,
    appeal: {
      message: companyInfo.appealMessage || null,
      originalReason: originalReason
    },
    warnings: {
      muted: {
        count: parseInt(warnings.muteCount) || 0,
        admin: latestMute?.mute ? (latestMute.mute as any).toJSON() : null
      },
      suspended: {
        count: parseInt(warnings.suspendCount) || 0,
        admin: latestSuspend?.suspend ? (latestSuspend.suspend as any).toJSON() : null
      }
    },
    logs: companyLogs
  };
};


  public getUserInfoById = async (data: any): Promise<any> => {
    const { id } = data;

    const userInfo = await users.findOne({
      where: { id: id },
      attributes: [
        "id",
        "roleId",
        "name",
        "email",
        "phone",
        "profileStatus",
        "rejectionReason",
        "emailVerified",
      ],
      include: [
        {
          model: roleData,
          as: "roleData",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "genderId",
            "dob",
            "address",
            "educationalAttainmentId",
            "chamberCommerceNumber",
            "currentSituationId",
            "languageId",
            "industryId",
            "about",
            "createdAt",
            "profile",
            "accountStatus",
            "isVideoSubmitted",
            "video",
          ],
        },
      ],
    });
    const userLogs = await this.getUserLogInfo({ userId: id, roleId: userInfo?.roleId });

    return { userInfo, userLogs };
  };

  public getUserLogInfo = async (data: any): Promise<any> => {
    const { userId, roleId, limit = 10, offset = 0 } = data;

    const field = roleId === 3 ? "employeeId" : "userId";

    if (roleId === 3) {
      const employeeExists = await employee.findOne({
        where: { id: userId, deletedAt: null },
        attributes: ['id']
      });
      if (!employeeExists) {
        throw new Error("Employee not found or has been deleted");
      }
    } else {
      const userExists = await users.findOne({
        where: { id: userId, deletedAt: null },
        attributes: ['id']
      });
      if (!userExists) {
        throw new Error("User not found or has been deleted");
      }
    }

    const totalCount = await userLog.count({
      where: { [field]: userId }
    });

    const userLogs = await userLog.findAll({
      where: { [field]: userId },
      attributes: [
        'id',
        'isSuspend',
        'isMuted',
        'isApproved',
        'days',
        'suspendUntil',
        'muteUntil',
        'suspendedOn',
        'mutedOn',
        'approvedOn',
        'rejectedOn',
        'suspendReason',
        'muteReason',
        'rejectedReason',
        'suspendedBy',
        'mutedBy',
        'approvedBy',
        'rejectedBy',
        'unSuspendedBy',
        'unMutedBy',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset * limit,
      include: [
        {
          as: "suspend",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
        {
          as: "mute",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
        {
          as: "approved",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
        {
          as: "unMute",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
        {
          as: "unSuspend",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
        {
          as: "reject",
          model: admin,
          attributes: ["id", "name", "adminRoleId"],
          required: false
        },
      ],
    });
    const formattedLogs = userLogs.map((log: any) => {
      let description = '';
      let adminInfo = null;


      if (log.isSuspend === 1 || log.isSuspend === true) {
        adminInfo = log.suspend;
        const adminName = log.suspend?.name || 'Admin';
        const duration = log.days ? `${log.days} days` : 'indefinite';
        const reason = log.suspendReason ? ` - ${log.suspendReason}` : '';
        description = `Suspended by ${adminName} for ${duration}${reason}`;
      }
      else if ((log.isSuspend === 0 || log.isSuspend === false) && log.suspendedBy && log.suspendReason) {
        adminInfo = log.suspend;
        description = log.suspendReason;
      }
      else if (log.isSuspend === 0 || log.isSuspend === false) {
        adminInfo = log.unSuspend;
        const adminName = log.unSuspend?.name || 'Admin';
        description = `Unsuspended by ${adminName}`;
      }
      else if (log.isMuted === 1 || log.isMuted === true) {
        adminInfo = log.mute;
        const adminName = log.mute?.name || 'Admin';
        const duration = log.days ? `${log.days} days` : 'indefinite';
        const reason = log.muteReason ? ` - ${log.muteReason}` : '';
        description = `Muted by ${adminName} for ${duration}${reason}`;
      }
      else if (log.isMuted === 0 || log.isMuted === false) {
        adminInfo = log.unMute;
        const adminName = log.unMute?.name || 'Admin';
        description = `Unmuted by ${adminName}`;
      }
      else if (log.isApproved === 1 || log.isApproved === true) {
        adminInfo = log.approved;
        const adminName = log.approved?.name || 'Admin';
        description = `Approved by ${adminName}`;
      }
      else if (log.suspendReason && log.suspendedBy && (log.isSuspend === false || log.isSuspend === 0)) {
        adminInfo = log.suspend;
        const adminName = log.suspend?.name || 'Admin';
        description = `${log.suspendReason}`;
      }
      else if (log.rejectedReason) {
        adminInfo = log.reject;
        const adminName = log.reject?.name || 'Admin';
        description = `Rejected by ${adminName} - ${log.rejectedReason}`;
      }
      else {
        adminInfo = log.suspend || log.mute || log.approved || log.unSuspend || log.unMute || log.reject;
        description = 'Activity logged';
      }
      return {
        description: description,
        createdAt: log.createdAt,
        admin: adminInfo ? {
          id: adminInfo.id,
          name: adminInfo.name,
          adminRoleId: adminInfo.adminRoleId
        } : {
          id: null,
          name: null,
          adminRoleId: null
        }
      };
    });
    return {
      logs: formattedLogs.length > 0 ? formattedLogs : null,
      total: totalCount,
      limit: limit,
      offset: offset,
      totalPages: Math.ceil(totalCount / limit)
    };
  };

  public updateUserStatus = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const {
      userId,
      suspendUntil,
      muteUntil,
      isSuspend,
      isMute,
      adminId,
      roleId,
      suspendReason,
      muteReason,
    } = data;
    const todayDate = new Date();
    let dateUntil: Date | null = new Date();
    var userData: any;
    var notificationStatus: any;
    var notificationbody: any;

    const adminExists = await admin.findOne({
      where: { id: adminId },
      attributes: ['id']
    });
    if (!adminExists) {
      throw new Error(`Admin with ID ${adminId} does not exist`);
    }

    const calculateDays = (untilDate: string | Date | null | undefined) => {
      if (!untilDate) return 0;
      const until = new Date(untilDate);
      const diffTime = until.getTime() - todayDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (roleId == 3) {
      const employeeExists = await employee.findOne({
        where: { id: userId },
        attributes: ["fcmToken"],
      });
      if (!employeeExists) {
        throw new Error("Employee not found");
      }
      userData = employeeExists;
    } else {
      const userExists = await users.findOne({
        where: { id: userId },
        attributes: ["fcmToken"],
      });
      if (!userExists) {
        throw new Error("User not found");
      }
      userData = userExists;
    }
    if (suspendUntil) {
      dateUntil = new Date(suspendUntil);
    } else {
      dateUntil = null;
    }

    const field = roleId === 3 ? "employeeId" : "userId";

    if (isSuspend == true) {
      let durationText = "";
      if (suspendUntil && dateUntil) {
        const now = new Date();
        const diffMs = dateUntil.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;

        if (diffDays > 0) {
          durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
          if (remainingHours > 0) {
            durationText += ` and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
          }
        } else {
          durationText = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        }
      } else {
        durationText = "indefinite";
      }

      notificationStatus = "Opschorten";
      notificationbody = `Je account is voor ${durationText} opgeschort vanwege ${suspendReason ? suspendReason : ""}.`;

      await userLog.create(
        {
          [field]: userId,
          isSuspend: true,
          days: calculateDays(suspendUntil),
          suspendUntil: dateUntil || undefined,
          suspendedBy: adminId,
          suspendedOn: todayDate,
          suspendReason: suspendReason,
        },
        { transaction }
      );

      if (roleId === 3) {
        await employee.update(
          {
            accountStatus: 3,
            suspendedOn: todayDate,
            suspendedDays: calculateDays(suspendUntil),
            suspendReason: suspendReason,
          },
          { where: { id: userId }, transaction }
        );
      } else {
        await roleData.update(
          {
            accountStatus: 3,
            suspendedOn: todayDate,
            suspendedDays: calculateDays(suspendUntil),
            suspendReason: suspendReason,
          },
          { where: { userId: userId }, transaction }
        );
      }
    } else if (isSuspend == false) {
      notificationStatus = "Deblokkeren";
      notificationbody = `Je account is weer geactiveerd.`;

      // Only create new unsuspend log entry - don't modify original suspend log
      await userLog.create(
        {
          [field]: userId,
          isSuspend: false,
          unSuspendedBy: adminId,
          unSuspendedOn: todayDate,
        },
        { transaction }
      );

      if (roleId === 3) {
        await employee.update(
          { accountStatus: 1 },
          { where: { id: userId }, transaction }
        );
      } else {
        await roleData.update(
          { accountStatus: 1 },
          { where: { userId: userId }, transaction }
        );
        
        // Remove appeal when unsuspending user
        await users.update(
          { 
            appealMessage: "", 
            hasAppeal: false 
          },
          { where: { id: userId }, transaction }
        );
      }
    }

    if (isMute == true) {
      const muteDateUntil: Date | null = muteUntil ? new Date(muteUntil) : null; // Indefinite mute
      const muteCalculatedDays = calculateDays(muteUntil);

      let muteDurationText = "";
      if (muteUntil && muteDateUntil) {
        const now = new Date();
        const diffMs = muteDateUntil.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;

        if (diffDays > 0) {
          muteDurationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
          if (remainingHours > 0) {
            muteDurationText += ` and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
          }
        } else {
          muteDurationText = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        }
      } else {
        muteDurationText = "indefinite";
      }

      notificationStatus = "Gedempt";
      notificationbody = `Je account is voor ${muteDurationText} gedempt vanwege ${muteReason ? muteReason : ""}.`;

      await userLog.create(
        {
          [field]: userId,
          isMuted: true,
          days: muteCalculatedDays,
          muteUntil: muteDateUntil || undefined,
          mutedBy: adminId,
          mutedOn: todayDate,
          muteReason: muteReason,
        },
        { transaction }
      );

      if (roleId === 3) {
        await employee.update(
          {
            accountStatus: 4,
            mutedDays: muteCalculatedDays,
            mutedOn: todayDate,
            muteReason: muteReason,
          },
          { where: { id: userId }, transaction }
        );
      } else {
        await roleData.update(
          {
            accountStatus: 4,
            mutedDays: muteCalculatedDays,
            mutedOn: todayDate,
            muteReason: muteReason,
          },
          { where: { userId: userId }, transaction }
        );
      }
    } else if (isMute == false) {
      notificationStatus = "Ontdempen";
      notificationbody = `Je account is niet langer gedempt`;

      // Only create new unmute log entry - don't modify original mute log
      await userLog.create(
        {
          [field]: userId,
          isMuted: false,
          unMutedBy: adminId,
          unMutedOn: todayDate,
        },
        { transaction }
      );

      if (roleId === 3) {
        await employee.update(
          { accountStatus: 1 },
          { where: { id: userId }, transaction }
        );
      } else {
        await roleData.update(
          { accountStatus: 1 },
          { where: { userId: userId }, transaction }
        );
        
        // Remove appeal when unmuting user
        await users.update(
          { 
            appealMessage: "", 
            hasAppeal: false 
          },
          { where: { id: userId }, transaction }
        );
      }
    }

    const res: any = await report.findOne({
      where: { reportedUserId: userId, reportedRoleId: roleId, statusId: 3 },
      attributes: ["id"],
    });
    if (res) {
      const resData = res.get({ plain: true });

      await notifications.update(
        { seen: true },
        { where: { reportId: resData.id, typeId: 5 }, transaction }
      );
    }
    const pushRes: any = await sendPushNotification(
      userData.fcmToken,
      notificationStatus || "Test Notification",
      notificationbody || "This is a test message, Take care.",
      ""
    );

    return;
  };

  // const { userId, deletedStatusId, roleId } = data;
  // if (deletedStatusId == 2 && [1, 2].includes(roleId)) {
  //   await like.destroy({
  //     where: {
  //       [Op.or]: [{ userWhoLikeId: userId }, { toLikeId: userId }],
  //     },
  //     transaction,
  //   });

  //   await messages.destroy({ where: { userId: userId }, transaction });
  //   const allPublicThreads = await threads.findAll({
  //     where: { ownerId: userId },
  //     attributes: ["id"],
  //     transaction,
  //   });
  //   const allP_Threads = await privateThreads.findAll({
  //     where: {
  //       [Op.or]: [
  //         { ownerUserId: userId, roleId: roleId },
  //         { toUserId: userId, toRoleId: roleId },
  //         { ownerEmpId: userId, roleId: roleId },
  //         { toEmpId: userId, toRoleId: roleId },
  //       ],
  //     },
  //     attributes: ["id"],
  //     transaction,
  //   });
  //   const threadIds = allPublicThreads.map((thread) => thread.id);
  //   const privateThreadIds = allP_Threads.map((thread) => thread.id);

  //   const allReportDetail = await report.findAll({
  //     where: {
  //       [Op.or]: [
  //         {
  //           userId: userId,
  //           roleId: roleId,
  //         },
  //         {
  //           reportedUserId: userId,
  //           reportedRoleId: roleId,
  //         },
  //         {
  //           reportedThreadId: threadIds,
  //         },
  //         {
  //           reportedP_ThreadId: privateThreadIds,
  //         },
  //       ],
  //     },
  //     attributes: ["id"],
  //     transaction,
  //   });

  //   if (allReportDetail.length > 0) {
  //     const threadIds = allReportDetail.map((thread) => thread.id);

  //     await notifications.destroy({
  //       where: {
  //         reportId: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });

  //     await report.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }

  //   if (allPublicThreads.length > 0) {
  //     const threadIds = allPublicThreads.map((thread) => thread.id);

  //     await threadLog.destroy({
  //       where: {
  //         threadId: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });

  //     await userNotification.destroy({
  //       where: { threadId: userId },
  //       transaction,
  //     });

  //     await threads.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }

  //   await notifications.destroy({
  //     where: { userId: userId },
  //     transaction,
  //   });

  //   // await threads.destroy({ where: { ownerId: userId }, transaction });

  //   await userLog.destroy({ where: { userId: userId }, transaction });

  //   if (allP_Threads.length > 0) {
  //     // Extract thread IDs
  //     const threadIds = allP_Threads.map((thread) => thread.id);
  //     console.log("here threadId", threadIds);

  //     // Delete messages where threadId is in the found thread IDs
  //     await privateMessages.destroy({
  //       where: {
  //         [Op.or]: [
  //           {
  //             roomId: {
  //               [Op.in]: threadIds,
  //             },
  //           },
  //           {
  //             userId: userId,
  //             roleId: roleId,
  //           },
  //         ],
  //       },
  //       transaction,
  //     });

  //     // Delete the threads themselves
  //     await privateThreads.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }
  //   await userNotification.destroy({
  //     where: {
  //       [Op.or]: [
  //         { pMessageSenderId: userId, pMessageRoleId: roleId },
  //         { userId: userId },
  //       ],
  //     },
  //     transaction,
  //   });

  //   await duplicateData.destroy({ where: { userId: userId }, transaction });
  //   await employee.destroy({ where: { userId: userId }, transaction });
  //   await roleData.destroy({ where: { userId: userId }, transaction });
  //   await users.destroy({ where: { id: userId }, transaction });
  // }

  // if (deletedStatusId == 2 && [3].includes(roleId)) {
  //   await like.destroy({
  //     where: {
  //       [Op.or]: [
  //         { employeeWhoLikeId: userId },
  //         { employeeToLikeId: userId },
  //       ],
  //     },
  //     transaction,
  //   });

  //   await messages.destroy({ where: { empId: userId }, transaction });
  //   const allPublicThreads = await threads.findAll({
  //     where: { ownerEmpId: userId },
  //     attributes: ["id"],
  //     transaction,
  //   });
  //   const allP_Threads = await privateThreads.findAll({
  //     where: {
  //       [Op.or]: [
  //         { ownerUserId: userId, roleId: roleId },
  //         { toUserId: userId, toRoleId: roleId },
  //         { ownerEmpId: userId, roleId: roleId },
  //         { toEmpId: userId, toRoleId: roleId },
  //       ],
  //     },
  //     attributes: ["id"], // only fetching thread IDs to optimize performance
  //     transaction,
  //   });
  //   const threadIds = allPublicThreads.map((thread) => thread.id);
  //   const privateThreadIds = allP_Threads.map((thread) => thread.id);

  //   const allReportDetail = await report.findAll({
  //     where: {
  //       [Op.or]: [
  //         {
  //           userId: userId,
  //           roleId: roleId,
  //         },
  //         {
  //           reportedUserId: userId,
  //           reportedRoleId: roleId,
  //         },
  //         {
  //           reportedThreadId: threadIds,
  //         },
  //         {
  //           reportedP_ThreadId: privateThreadIds,
  //         },
  //       ],
  //     },
  //     attributes: ["id"],
  //     transaction,
  //   });

  //   if (allReportDetail.length > 0) {
  //     // Extract thread IDs
  //     const threadIds = allReportDetail.map((thread) => thread.id);

  //     await notifications.destroy({
  //       where: {
  //         reportId: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });

  //     await report.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }

  //   if (allPublicThreads.length > 0) {
  //     // Extract thread IDs
  //     const threadIds = allPublicThreads.map((thread) => thread.id);

  //     // Delete messages where threadId is in the found thread IDs
  //     await threadLog.destroy({
  //       where: {
  //         threadId: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });

  //     await userNotification.destroy({
  //       where: { threadId: userId },
  //       transaction,
  //     });

  //     // Delete the threads themselves
  //     await threads.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }

  //   await notifications.destroy({
  //     where: { employeeId: userId },
  //     transaction,
  //   });

  //   // await threads.destroy({ where: { ownerId: userId }, transaction });

  //   await userLog.destroy({ where: { employeeId: userId }, transaction });

  //   if (allP_Threads.length > 0) {
  //     // Extract thread IDs
  //     const threadIds = allP_Threads.map((thread) => thread.id);
  //     console.log("here threadId", threadIds);

  //     // Delete messages where threadId is in the found thread IDs
  //     await privateMessages.destroy({
  //       where: {
  //         [Op.or]: [
  //           {
  //             roomId: {
  //               [Op.in]: threadIds,
  //             },
  //           },
  //           {
  //             empId: userId,
  //             roleId: roleId,
  //           },
  //         ],
  //       },
  //       transaction,
  //     });

  //     await privateThreads.destroy({
  //       where: {
  //         id: {
  //           [Op.in]: threadIds,
  //         },
  //       },
  //       transaction,
  //     });
  //   }
  //   await userNotification.destroy({
  //     where: {
  //       [Op.or]: [
  //         { pMessageSenderId: userId, pMessageRoleId: roleId },
  //         { employeeId: userId },
  //       ],
  //     },
  //     transaction,
  //   });
  //   await duplicateData.destroy({
  //     where: { employeeId: userId },
  //     transaction,
  //   });
  //   await employee.destroy({ where: { id: userId }, transaction });
  // }

  // if (deletedStatusId == 1 && [1, 2].includes(roleId)) {
  //   await users.update({ profileStatus: 5 }, { where: { id: userId } });
  // }

  // if (deletedStatusId == 1 && [3].includes(roleId)) {
  //   await employee.update({ profileStatus: 5 }, { where: { id: userId } });
  // }


  public delUser = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, roleId } = data;

    // Soft delete users (roleId 1, 2) by setting deletedAt
    if ([1, 2].includes(roleId)) {
      await users.update(
        { deletedAt: new Date() },
        { where: { id: userId }, transaction }
      );
    }

    // Soft delete employees (roleId 3) by setting deletedAt
    if ([3].includes(roleId)) {
      await employee.update(
        { deletedAt: new Date() },
        { where: { id: userId }, transaction }
      );
    }

    return;
  };

  // public fetchCompaniesData = async (data: any): Promise<any> => {
  //   const { limit, offset, filters } = data;

  //   let whereClause: any = [];

  //   if (filters?.industryId && typeof filters.industryId === 'string') {
  //     try {
  //       filters.industryId = JSON.parse(filters.industryId);
  //     } catch (e) {
  //       filters.industryId = [];
  //     }
  //   }

  //   if (filters?.type) {
  //     switch (filters.type) {
  //       case "approved":
  //         whereClause["$roleData.isApproved$"] = true;
  //         break;
  //       case "unVerified":
  //         whereClause["$roleData.isApproved$"] = {
  //           [Op.or]: [false, null],
  //         };
  //         break;
  //       case "mute":
  //         whereClause.id = {
  //           [Op.in]: Sequelize.literal(
  //             `(SELECT userId FROM userLog WHERE isMuted = true)`
  //           ),
  //         };
  //         break;
  //       case "suspend":
  //         whereClause.id = {
  //           [Op.in]: Sequelize.literal(
  //             `(SELECT userId FROM userLog WHERE isSuspend = true)`
  //           ),
  //         };
  //         break;
  //       default:
  //         // For "all", no additional conditions needed
  //         break;
  //     }
  //   }

  //   if (filters?.search) {
  //     const searchTerm = filters.search.trim();
  //     whereClause[Op.or] = [
  //       { "$roleData.companyName$": { [Op.like]: `%${searchTerm}%` } },
  //       { email: { [Op.like]: `%${searchTerm}%` } },
  //       { phone: { [Op.like]: `%${searchTerm}%` } },
  //       { "$roleData.chamberCommerceNumber$": { [Op.like]: `%${searchTerm}%` } },
  //       { "$roleData.firstName$": { [Op.like]: `%${searchTerm}%` } },
  //       { "$roleData.lastName$": { [Op.like]: `%${searchTerm}%` } }
  //     ];
  //   }

  //   if (filters?.industryId && filters.industryId.length > 0) {
  //     whereClause["$roleData.industryId$"] = {
  //       [Op.and]: filters.industryId.map((id: number) =>
  //         Sequelize.literal(
  //           `JSON_CONTAINS(\`roleData\`.\`industryId\`, '${id}', '$')`
  //         )
  //       ),
  //     };
  //   }

  //   if (filters?.currentMonth === true) {
  //     const currentDate = new Date();
  //     const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  //     const currentYear = currentDate.getFullYear();

  //     whereClause["$roleData.createdAt$"] = {
  //       [Op.and]: [
  //         Sequelize.literal(`MONTH(\`roleData\`.\`createdAt\`) = ${currentMonth}`),
  //         Sequelize.literal(`YEAR(\`roleData\`.\`createdAt\`) = ${currentYear}`)
  //       ]
  //     };
  //   }

  //   const res: any = await users.findAndCountAll({
  //     where: { roleId: 2, deletedAt: null, ...whereClause },
  //     attributes: ["id", "phone", "email", "roleId", "profileStatus"],
  //     include: [
  //       {
  //         model: roleData,
  //         attributes: [
  //           "id",
  //           "companyName",
  //           "chamberCommerceNumber",
  //           "currentSituationId",
  //           "accountStatus",
  //           "profile",
  //           "industryId",
  //           "firstName",
  //           "lastName",
  //           "createdAt"
  //         ],
  //         required: 
  //           (filters && filters.type === "mute") || 
  //           (filters && filters.type === "suspend") || 
  //           (filters && filters.search) || 
  //           (filters && filters.industryId && filters.industryId.length > 0) || 
  //           (filters && filters.currentMonth === true),
  //       },
  //       {
  //         model: userLog,
  //         attributes: [],
  //         required: filters?.type === "mute" || filters?.type === "suspend",
  //         as: "userLog",
  //       },
  //     ],
  //     order: [["$roleData.createdAt$", "DESC"]],
  //     limit: limit,
  //     offset: limit * offset,
  //     distinct: true,
  //   });

  //   // Enhance rows with additional data
  //   const enhancedRows = await Promise.all(
  //     res.rows.map(async (company: any) => {
  //       // Get employee count for this company
  //       const employeeCount = await employee.count({
  //         where: { 
  //           userId: company.id, 
  //           deletedAt: null 
  //         }
  //       });

  //       // Get warning counts
  //       const warningCounts = await userLog.findAll({
  //         where: { userId: company.id },
  //         attributes: [
  //           [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
  //           [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount'],
  //           [Sequelize.fn('COUNT', Sequelize.literal('*')), 'totalWarnings']
  //         ],
  //         raw: true
  //       });

  //       const warnings: any = warningCounts[0] || {
  //         muteCount: 0,
  //         suspendCount: 0,
  //         totalWarnings: 0
  //       };

  //       return {
  //         ...company.toJSON(),
  //         logo: company.roleData?.profile || null,
  //         companyName: company.roleData?.companyName || null,
  //         chamberCommerceNumber: company.roleData?.chamberCommerceNumber || null,
  //         employeeCount: employeeCount,
  //         warnings: {
  //           total: parseInt(warnings.totalWarnings) || 0,
  //           mute: parseInt(warnings.muteCount) || 0,
  //           suspend: parseInt(warnings.suspendCount) || 0
  //         }
  //       };
  //     })
  //   );

  //   res.rows = enhancedRows;

  //   return res;
  // };

  public getAllCompanyInfo = async (data: any): Promise<any> => {
    const { limit, offset, filters } = data;

    let whereClause: any = [];
    // whereClause["$users.roleId$"] = 2;

    if (filters?.type) {
      switch (filters.type) {
        case "verified":
          whereClause["$roleData.isApproved$"] = true;
          break;
        case "unVerified":
          whereClause["$roleData.isApproved$"] = {
            [Op.or]: [false, null],
          };
          break;
        case "mute":
          whereClause.id = {
            [Op.in]: Sequelize.literal(
              `(SELECT userId FROM userLog WHERE isMuted = true)`
            ),
          };
          break;
        case "suspend":
          whereClause.id = {
            [Op.in]: Sequelize.literal(
              `(SELECT userId FROM userLog WHERE isSuspend = true)`
            ),
          };
          break;
        default:
          break;
      }
    }

    const res: any = await users.findAndCountAll({
      where: { roleId: 2, deletedAt: null, ...whereClause },
      attributes: ["id", "phone", "email", "roleId", "profileStatus"],
      include: [
        {
          model: roleData,
          attributes: [
            "id",
            "companyName",
            "chamberCommerceNumber",
            "currentSituationId",
            "accountStatus",
            "companyName",
            "profile",
            "mutedOn",
            "suspendedOn",
          ],

          required: true,
        },
        {
          model: userLog,
          attributes: [],
          required: false,
          as: "userLog",
        },
      ],
      limit: limit,
      offset: limit * offset,
      distinct: true,
    });
    res.rows = res.rows.reverse();

    return res;
  };
  public getCompanyInfoById = async (data: any): Promise<any> => {
    const { id } = data;
    let statusDetail: any;
    let userInfo: any;
    let employeeInfo: any;

    userInfo = await users.findOne({
      where: { id: id },
      attributes: [
        "id",
        "roleId",
        "name",
        "email",
        "phone",
        "profileStatus",
        "rejectionReason",
        "emailVerified",
      ],
      include: [
        {
          model: roleData,
          as: "roleData",
          attributes: [
            "id",
            "companyName",
            "profile",
            "streetName",
            "houseName",
            "city",
            "province",
            "postalCode",
            "chamberCommerceNumber",
            "website",
            "industryId",
            "about",
            "createdAt",
            "mutedOn",
            "suspendedOn",
            "isVideoSubmitted",
            "accountStatus",
            "video",
            [
              Sequelize.literal(`(
                      SELECT COUNT(*)
                      FROM employee AS Employee
                      WHERE Employee.userId = roleData.userId
                    )`),
              "employeeCount",
            ],
          ],
        },
      ],
    });
    if (userInfo?.roleData) {
      const roleData = userInfo.roleData;
      statusDetail = {
        isMuted: roleData.mutedOn !== null,
        isSuspended: roleData.suspendedOn !== null,
        mutedOn: roleData.mutedOn,
        suspendedOn: roleData.suspendedOn,
        mutedBy: null,
        suspendedBy: null,
        muteReason: null,
        suspendReason: null
      };
      if (statusDetail.isMuted || statusDetail.isSuspended) {
        const latestAction = await userLog.findOne({
          where: { 
            userId: id,
            [Op.or]: [
              { isMuted: true },
              { isSuspend: true }
            ]
          },
          include: [
            {
              as: "suspend",
              model: admin,
              attributes: ["id", "name", "adminRoleId"],
              required: false
            },
            {
              as: "mute", 
              model: admin,
              attributes: ["id", "name", "adminRoleId"],
              required: false
            }
          ],
          order: [["createdAt", "DESC"]]
        });

        if (latestAction) {
          if (latestAction.isSuspend) {
            statusDetail.suspendedBy = latestAction.suspend;
            statusDetail.suspendReason = latestAction.suspendReason;
          }
          if (latestAction.isMuted) {
            statusDetail.mutedBy = latestAction.mute;
            statusDetail.muteReason = latestAction.muteReason;
          }
        }
      }
    } else {
      statusDetail = null;
    }

    employeeInfo = await employee.findAndCountAll({
      where: { userId: id },
      attributes: [
        "id",
        "profile",
        "firstName",
        "lastName",
        "phone",
        "currentSituationId",
        "currentSituationName",
        "profileStatus",
        "accountStatus",
        "email",
        [Sequelize.literal("3"), "roleId"],
      ],
    });

    // const roleInfo: any = await roleData.findOne({ where: { userId: id } });
    // if (roleInfo && roleInfo.isApproved) {
    //   userInfo = await roleData.findOne({
    //     where: { userId: id },
    //     attributes: [
    //       "id",
    //       "companyName",
    //       "profile",
    //       "streetName",
    //       "houseName",
    //       "city",
    //       "province",
    //       "postalCode",
    //       "chamberCommerceNumber",
    //       "website",
    //       "industryId",
    //       "about",
    //       "createdAt",
    //       "isVideoSubmitted",
    //       "accountStatus",
    //       [
    //         Sequelize.literal(`(
    //           SELECT COUNT(*)
    //           FROM employee AS Employee
    //           WHERE Employee.userId = roleData.userId
    //         )`),
    //         "employeeCount",
    //       ],
    //     ],
    //     include: [
    //       {
    //         as: "users",
    //         model: users,
    //         attributes: ["profileStatus", "rejectionReason", "id", "roleId"],
    //       },
    //     ],
    //   });

    //   employeeInfo = await employee.findAndCountAll({
    //     where: { userId: id },
    //     attributes: [
    //       "id",
    //       "profile",
    //       "firstName",
    //       "lastName",
    //       "phone",
    //       "currentSituationId",
    //       "profileStatus",
    //       "accountStatus",
    //       [Sequelize.literal("3"), "roleId"],
    //     ],
    //   });
    // } else {
    //   userInfo = await users.findOne({
    //     where: { id: id },
    //     attributes: [
    //       "id",
    //       "roleId",
    //       "name",
    //       "email",
    //       "phone",
    //       "rejectionReason",
    //       "profileStatus",
    //       "emailVerified"
    //     ],
    //   });
    // }

    return { userInfo, statusDetail, employeeInfo };
  };

  public getCompanyEmpInfoById = async (data: any): Promise<any> => {
    const { userId, search, limit = 10, offset = 0 } = data;
    
    let whereClause: any = { 
      userId: userId,
      deletedAt: null 
    };

    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { firstName: { [Op.like]: searchTerm } },
        { lastName: { [Op.like]: searchTerm } },
        { email: { [Op.like]: searchTerm } },
        { phone: { [Op.like]: searchTerm } },
        { currentSituationName: { [Op.like]: searchTerm } }
      ];
    }

    const result = await employee.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "profile",
        "firstName",
        "lastName",
        "currentSituationId",
        "currentSituationName",
        "phone",
        "email",
        "profileStatus",
        "accountStatus",
        "isApproved",
        "createdAt",
        "suspendedOn",
        "mutedOn"
      ],
      order: [
        ["createdAt", "ASC"], // First created employee will be the representative
        ["firstName", "ASC"]
      ],
      limit: parseInt(limit),
      offset: parseInt(offset) * parseInt(limit),
    });

    // Mark the first employee as representative
    if (result.rows.length > 0) {
      (result.rows[0] as any).dataValues.isRepresentative = true;
    }

    return result;
  };

  public getAllEmployees = async (): Promise<any> => {
    // Temporary function to debug employee data
    const allEmployees = await employee.findAll({
      attributes: ["id", "firstName", "lastName", "email", "deletedAt", "createdAt"],
      order: [["id", "ASC"]]
    });
    
    return {
      count: allEmployees.length,
      employees: allEmployees
    };
  };

  public getEmployeeDetails = async (data: any): Promise<any> => {
  const { employeeId } = data;
  
  console.log(`[DEBUG] Processing employee ${employeeId}`);
  
  const basicCheck = await employee.findOne({
    where: { id: employeeId },
    attributes: ["id", "deletedAt", "userId"]
  });
  
  if (!basicCheck) {
    throw new Error(`Employee with ID ${employeeId} does not exist`);
  }
  
  if (basicCheck.deletedAt) {
    throw new Error(`Employee found but has been deleted on ${basicCheck.deletedAt}`);
  }
  
  const employeeInfo = await employee.findOne({
  where: { id: employeeId, deletedAt: null },
  attributes: [
    "id",
    "userId",
    "profile",
    "firstName",
    "lastName",
    "currentSituationId",
    "currentSituationName",
    "email",
    "phone",
    "profileStatus",
    "accountStatus",
    "isApproved",
    "rejectionReason",
    "appealMessage",
    "hasAppeal",
    "createdAt",
    "updatedAt",
    "suspendedOn",
    "mutedOn",
    "suspendReason",
    "muteReason",
    "roleId",   // 👈 added
  ],
  include: [
    {
      model: users,
      as: "users",
      attributes: ["id", "roleId", "name", "lastLogin"],
      required: false,
      include: [
        {
          model: roleData,
          as: "roleData",
          attributes: ["id", "companyName", "city", "province", "website"],
          required: false
        }
      ]
    }
  ]
});


  if (!employeeInfo) {
    throw new Error(`Employee with ID ${employeeId} does not exist or has been deleted`);
  }

  const companyName = (employeeInfo.users as any)?.roleData?.companyName || "Unknown Company";

  const employeeLogs = await this.getUserLogInfo({ 
    userId: employeeInfo.id, 
    roleId: 3
  });

  const threadsCreated = await threads.findAndCountAll({
    where: { ownerEmpId: employeeId, deletedAt: null },
    attributes: ["id", "title", "description", "createdAt", "locked", "typeId"],
    include: [
      { model: forumCategory, as: "forumCategory", attributes: ["id", "name"], required: false },
      { model: forumSubCategory, as: "forumSubCategory", attributes: ["id", "name"], required: false }
    ],
    order: [["createdAt", "DESC"]],
    limit: 10
  });

  const privateThreadsCreated = await privateThreads.findAndCountAll({
    where: { ownerEmpId: employeeId, deletedAt: null },
    attributes: ["id", "title", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: 10
  });

  const warningCounts = await userLog.findAll({
    where: { employeeId: employeeId },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
    ],
    raw: true
  });

  const warnings: any = warningCounts[0] || { muteCount: 0, suspendCount: 0 };

  const latestMute = await userLog.findOne({
    where: { employeeId: employeeId, isMuted: true },
    include: [{ model: admin, as: "mute", attributes: ["id", "name", "adminRoleId"], required: false }],
    order: [['createdAt', 'DESC']]
  });

  const latestSuspend = await userLog.findOne({
    where: { employeeId: employeeId, isSuspend: true },
    include: [{ model: admin, as: "suspend", attributes: ["id", "name", "adminRoleId"], required: false }],
    order: [['createdAt', 'DESC']]
  });

  const allThreads = threadsCreated.rows.map((thread: any) => ({
    threadId: thread.id,
    threadName: thread.title,
    threadPath: `${thread.forumCategory?.name || 'Unknown'} > ${thread.forumSubCategory?.name || 'Unknown'}`
  }));

  let originalReason = null;
  if (employeeInfo.appealMessage) {
    const isCurrentlySuspended = employeeInfo.suspendedOn !== null;
    const isCurrentlyMuted = employeeInfo.mutedOn !== null;

    if (isCurrentlySuspended) {
      const originalSuspension = await userLog.findOne({
        where: { employeeId: employeeId, isSuspend: true, deletedAt: null },
        attributes: ["suspendReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });
      originalReason = originalSuspension?.suspendReason || null;
    } else if (isCurrentlyMuted) {
      const originalMute = await userLog.findOne({
        where: { employeeId: employeeId, isMuted: true, deletedAt: null },
        attributes: ["muteReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });
      originalReason = originalMute?.muteReason || null;
    } else {
      const latestSuspension = await userLog.findOne({
        where: { employeeId: employeeId, isSuspend: true, deletedAt: null },
        attributes: ["suspendReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });

      const latestMute = await userLog.findOne({
        where: { employeeId: employeeId, isMuted: true, deletedAt: null },
        attributes: ["muteReason", "createdAt"],
        order: [["createdAt", "DESC"]]
      });

      if (latestSuspension && latestMute) {
        originalReason = latestSuspension.createdAt > latestMute.createdAt
          ? latestSuspension.suspendReason
          : latestMute.muteReason;
      } else if (latestSuspension) {
        originalReason = latestSuspension.suspendReason;
      } else if (latestMute) {
        originalReason = latestMute.muteReason;
      }
    }

    if (!originalReason) {
      const anyRecentLog = await userLog.findOne({
        where: {
          employeeId: employeeId,
          deletedAt: null,
          [Op.or]: [
            { suspendReason: { [Op.ne]: "" } },
            { muteReason: { [Op.ne]: "" } }
          ]
        },
        attributes: ["suspendReason", "muteReason"],
        order: [["createdAt", "DESC"]]
      });
      
      if (anyRecentLog) {
        originalReason = anyRecentLog.suspendReason || anyRecentLog.muteReason;
      }
    }
  }

  return {
    ...employeeInfo.toJSON(),
    lastLogin: (employeeInfo.users as any)?.lastLogin || null,
    companyName,
    logs: employeeLogs,
    threads: allThreads,
    appeal: {
      message: employeeInfo.appealMessage || null,
      originalReason: originalReason
    },
    warnings: {
      muted: {
        count: parseInt(warnings.muteCount) || 0,
        admin: latestMute?.mute ? (latestMute.mute as any).toJSON() : null
      },
      suspended: {
        count: parseInt(warnings.suspendCount) || 0,
        admin: latestSuspend?.suspend ? (latestSuspend.suspend as any).toJSON() : null
      }
    }
  };
};


  public updateModeratorStatus = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { moderatorId, days, suspendUntil, isSuspend, adminId } = data;
    const todayDate = new Date();
    let dateUntil = new Date();

    const moderator = await admin.findOne({
      where: { id: moderatorId, adminRoleId: 2, deletedAt: null }
    });
    if (!moderator) {
      throw new Error("Moderator not found or is not a valid moderator");
    }

    const adminUser = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminUser) {
      throw new Error("Admin not found");
    }

    if (suspendUntil) {
      dateUntil = new Date(suspendUntil);
    } else if (days) {
      dateUntil.setDate(dateUntil.getDate() + days);
    } else {
      dateUntil.setMinutes(dateUntil.getMinutes() + 1);
    }

    if (isSuspend == true) {
      let durationText = "";
      if (suspendUntil) {
        const now = new Date();
        const diffMs = dateUntil.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;

        if (diffDays > 0) {
          durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
          if (remainingHours > 0) {
            durationText += ` and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
          }
        } else {
          durationText = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        }
      } else {
        if (days) {
          durationText = `${days} day${days > 1 ? 's' : ''}`;
        } else {
          durationText = "1 minute";
        }
      }

      await adminLog.create(
        {
          adminId: moderatorId,
          isSuspend: true,
          days: days || 0,
          suspendUntil: dateUntil,
          suspendedBy: adminId,
          suspendedOn: todayDate,
        },
        { transaction }
      );

      await admin.update(
        {
          accountStatus: 3,
          suspendedOn: todayDate,
          suspendedDays: days || 0
        },
        { where: { id: moderatorId }, transaction }
      );
    } else if (isSuspend == false) {
      const adminLogSuspendData: any = await adminLog.findOne({
        where: { isSuspend: true, adminId: moderatorId },
      });

      await adminLog.update(
        { isSuspend: false },
        {
          where: { adminId: moderatorId, id: adminLogSuspendData?.id },
          transaction,
        }
      );

      await adminLog.create(
        {
          adminId: moderatorId,
          isSuspend: false,
          unSuspendedBy: adminId,
          unSuspendedOn: todayDate,
        },
        { transaction }
      );

      await admin.update(
        { accountStatus: 1 },
        { where: { id: moderatorId }, transaction }
      );
    }
  };

  public getReportedThread = async (data: any): Promise<any> => {
  const { name } = data;

  const res: any = await report.findAndCountAll({
    attributes: [
      "id",
      "userId",
      "roleId",
      "problem",
      "messageDetail",
      "createdAt",
      "reportedUserId",
      "reportedRoleId",
    ],
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: privateThreads,
        as: "privateThreads",
        where: name
          ? { title: { [Op.like]: `%${name}%` } }
          : {},
        attributes: ["id", "title"],
        include: [
          {
            as: "users",
            model: users,
            attributes: ["id", "name", "roleId", "email", "phone"],
            include: [
              {
                as: "roleData",
                model: roleData,
                attributes: [
                  "companyName",
                  "firstName",
                  "lastName",
                  "profile",
                  "id",
                ],
              },
              {
                model: toxicityScores,
                as: "toxicityScores",
                attributes: ["toxicityScore", "summary", "analysis"],
                required: false, // only include if exists
              },
            ],
          },
          {
            as: "toUsers",
            model: users,
            attributes: ["id", "name", "roleId", "email", "phone"],
            include: [
              {
                as: "roleData",
                model: roleData,
                attributes: [
                  "companyName",
                  "firstName",
                  "lastName",
                  "profile",
                  "id",
                ],
              },
              {
                model: toxicityScores,
                as: "toxicityScores",
                attributes: ["toxicityScore", "summary", "analysis"],
                required: false,
              },
            ],
          },
          {
            as: "employee",
            model: employee,
            attributes: [
              "id",
              "firstName",
              "lastName",
              [Sequelize.literal("3"), "roleId"],
              "profile",
              "email",
              "phone",
            ],
            include: [
              {
                as: "users",
                model: users,
                attributes: ["id", "roleId", "name"],
                include: [
                  {
                    as: "roleData",
                    model: roleData,
                    attributes: ["companyName", "id", "profile"],
                  },
                  {
                    model: toxicityScores,
                    as: "toxicityScores",
                    attributes: ["toxicityScore", "summary", "analysis"],
                    required: false,
                  },
                ],
              },
            ],
          },
          {
            as: "toEmployee",
            model: employee,
            attributes: [
              "id",
              "firstName",
              "lastName",
              [Sequelize.literal("3"), "roleId"],
              "profile",
              "email",
              "phone",
            ],
            include: [
              {
                as: "users",
                model: users,
                attributes: ["id"],
                include: [
                  {
                    as: "roleData",
                    model: roleData,
                    attributes: ["companyName", "id", "profile"],
                  },
                  {
                    model: toxicityScores,
                    as: "toxicityScores",
                    attributes: ["toxicityScore", "summary", "analysis"],
                    required: false,
                  },
                ],
              },
            ],
          },
          {
            as: "privateMessages",
            model: privateMessages,
            attributes: ["message", "createdAt", "img"],
            limit: 2,
            order: [["createdAt", "desc"]],
          },
        ],
      },
    ],
  });

  const modifiedResult = await Promise.all(
    res.rows.map(async (item: any) => {
      let userDetail = null;

      if (item.roleId == 1 || item.roleId == 2) {
        userDetail = await users.findOne({
          where: { id: item.userId },
          attributes: ["id", "roleId", "name", "email", "phone"],
          include: [
            {
              model: roleData,
              as: "roleData",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "companyName",
                "profile",
              ],
            },
            {
              model: toxicityScores,
              as: "toxicityScores",
              attributes: ["toxicityScore", "summary", "analysis"],
              required: false,
            },
          ],
        });
      } else {
        userDetail = await employee.findOne({
          where: { id: item.userId },
          attributes: ["id", "firstName", "lastName", "profile", "email", "phone"],
          include: [
            {
              as: "users",
              model: users,
              attributes: ["id", "roleId", "name"],
              include: [
                {
                  model: roleData,
                  as: "roleData",
                  attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "companyName",
                    "profile",
                  ],
                },
                {
                  model: toxicityScores,
                  as: "toxicityScores",
                  attributes: ["toxicityScore", "summary", "analysis"],
                  required: false,
                },
              ],
            },
          ],
        });
      }

      return {
        ...item.toJSON(),
        userDetail,
      };
    })
  );

  return {
    count: res.count,
    rows: modifiedResult,
  };
};



  public solvePrivateReport = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { reportId } = data;
    await notifications.destroy({ where: { reportId: reportId }, transaction });
    await report.destroy({ where: { id: reportId }, transaction });
  };

  public getReportedThreadChatById = async (data: any): Promise<any> => {
    const { threadId } = data;
    const allMessage: any = await privateMessages.findAll({
      where: { roomId: threadId },
      order: [["createdAt", "desc"]],
      include: [
        {
          as: "users",
          model: users,
          attributes: ["id", "name"],
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: ["id", "firstName", "lastName", "profile"],
            },
          ],
        },
        {
          as: "employee",
          model: employee,
          attributes: ["id", "firstName", "lastName", "profile"],
          include: [
            {
              as: "users",
              model: users,
              attributes: ["id"],
              include: [
                {
                  as: "roleData",
                  model: roleData,
                  attributes: ["id", "companyName", "profile"],
                },
              ],
            },
          ],
        },
      ],
    });

    const filteredMessages = await Promise.all(
      allMessage.map(async (msg: any) => {
        let name: any;

        if (msg.roleId == 1) {
          name = `${msg.users?.roleData?.firstName} ${msg.users?.roleData?.lastName}`;
        } else {
          name = `${msg.employee?.firstName} ${msg.employee?.lastName}`;
        }

        return {
          messageId: msg.id,
          userId: msg.roleId !== 3 ? msg.users?.id : msg.employee?.id,
          roleId: msg.roleId,
          name: name,
          companyName:
            msg.roleId === 3 ? msg.employee?.users?.roleData?.companyName : "",
          userLogo:
            msg.roleId !== 3
              ? msg.users?.roleData?.profile
              : msg.employee?.profile,
          roomId: msg.roomId,
          message: msg.message,
          img: msg.img,
          timeStamp: msg.createdAt,
        };
      })
    );
    const reversedMessages = filteredMessages.reverse();
    return reversedMessages;
  };

  public updateThreadStatus = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { threadId, statusId } = data;

    switch (statusId) {
      case 1:
        await threads.update(data, { where: { id: threadId }, transaction });
        await threadLog.create({ ...data, isEdited: true }, { transaction });

        break;

      case 2:
        await threads.update(
          { locked: true },
          { where: { id: threadId }, transaction }
        );
        await threadLog.create({ ...data, isLocked: true }, { transaction });
        break;

      case 3:
        await Promise.all([
          threadLog.destroy({ where: { threadId }, transaction }),
          messages.destroy({ where: { roomId: threadId }, transaction }),
          userNotification.destroy({
            where: { threadId: threadId },
            transaction,
          }),
          threads.destroy({ where: { id: threadId }, transaction }),
        ]);
        break;

      case 4:
        await threads.update(
          { locked: false },
          { where: { id: threadId }, transaction }
        );
        await threadLog.create({ ...data, isLocked: false }, { transaction });
        break;

      default:
        throw new Error("Ongeldige status-ID");
    }

    if (statusId != 1) {
      const res: any = await report.findOne({
        where: {
          reportedThreadId: threadId,
          statusId: 1,
        },
        attributes: ["id"],
      });
      if (res) {
        const resData = res.get({ plain: true });

        await notifications.update(
          { seen: true },
          { where: { reportId: resData.id, typeId: 6 }, transaction }
        );
      }
    }
  };

  public getThreadLogInfo = async (data: any): Promise<any> => {
  const { id } = data;

  // 1) fetch raw logs from threadLog (no includes)
  const logs: any[] = await threadLog.findAll({
    where: { threadId: id },
    attributes: {
      exclude: ["updatedAt", "deletedAt"]
    },
    raw: true, // return plain objects
    order: [["createdAt", "DESC"]],
  });

  if (!logs || logs.length === 0) return [];

  // 2) collect all admin ids referenced in logs (lockedBy, unLockedBy, editedBy, hiddenBy, pinnedBy, customActivityBy)
  const adminIdSet = new Set<number>();
  for (const l of logs) {
    if (l.lockedBy) adminIdSet.add(l.lockedBy);
    if (l.unLockedBy) adminIdSet.add(l.unLockedBy);
    if (l.editedBy) adminIdSet.add(l.editedBy);
    if (l.hiddenBy) adminIdSet.add(l.hiddenBy);
    if (l.pinnedBy) adminIdSet.add(l.pinnedBy);
    if (l.customActivityBy) adminIdSet.add(l.customActivityBy);
  }
  const adminIds = Array.from(adminIdSet);
  // 3) fetch admin rows in one query
  const admins = adminIds.length
    ? await admin.findAll({
        where: { id: adminIds },
        attributes: ["id", "adminRoleId", "name"],
        raw: true,
      })
    : [];

  // 4) map admin id -> admin object
  const adminById = new Map<number, any>();
  for (const a of admins) adminById.set(a.id, a);

  // 5) transform logs into the desired output
  const result = logs.map((log: any) => {
    let action = "Unknown action";
    let actor: any = null;

    // Custom Activity Log
    if (log.customActivity && log.customActivityBy) {
      action = log.customActivity;
      if (adminById.has(log.customActivityBy)) {
        const ad = adminById.get(log.customActivityBy);
        actor = { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" };
      } else {
        actor = { source: "admin" };
      }
    }

    // Edited
    else if (log.isEdited) {
      action = "Thread edited by admin";
      if (log.editedBy && adminById.has(log.editedBy)) {
        const ad = adminById.get(log.editedBy);
        actor = { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" };
      } else {
        actor = { source: "system" };
      }
    }

    // Locked cases
    else if (log.isLocked === 1) {
      if (log.lockedBy) {
        action = "Thread locked by admin";
        const ad = adminById.get(log.lockedBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread locked by user (WebSocket action: lockRoom)";
        actor = { source: "user" };
      }
    }

    // Unlocked cases
    else if (log.isLocked === 0 && (log.unLockedBy !== undefined || log.unLockedBy !== null)) {
      if (log.unLockedBy) {
        action = "Thread unlocked by admin";
        const ad = adminById.get(log.unLockedBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread unlocked by user (WebSocket action: unLockRoom)";
        actor = { source: "user" };
      }
    }

    // Hidden / Unhidden (requires threadLog columns isHidden/hiddenBy to exist)
    else if (log.isHidden === 1) {
      if (log.hiddenBy) {
        action = "Thread hidden by admin";
        const ad = adminById.get(log.hiddenBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread hidden by user";
        actor = { source: "user" };
      }
    } else if (log.isHidden === 0 && log.hiddenBy !== undefined) {
      // if explicit unhide logged
      if (log.hiddenBy) {
        action = "Thread unhidden by admin";
        const ad = adminById.get(log.hiddenBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread unhidden by user";
        actor = { source: "user" };
      }
    }

    // Pinned / Unpinned (requires threadLog columns isPinned/pinnedBy to exist)
    else if (log.isPinned === 1) {
      if (log.pinnedBy) {
        action = "Thread pinned by admin";
        const ad = adminById.get(log.pinnedBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread pinned by user";
        actor = { source: "user" };
      }
    } else if (log.isPinned === 0 && log.pinnedBy !== undefined) {
      if (log.pinnedBy) {
        action = "Thread unpinned by admin";
        const ad = adminById.get(log.pinnedBy);
        actor = ad ? { id: ad.id, roleId: ad.adminRoleId, name: ad.name, source: "admin" } : { source: "admin" };
      } else {
        action = "Thread unpinned by user";
        actor = { source: "user" };
      }
    }

    // fallback actor if still null
    if (!actor) actor = { source: "system" };

    return {
      id: log.id,
      threadId: log.threadId,
      action,
      actor,
      timestamp: log.createdAt,
    };
  });

  return result;
};









  public addCustomForumThreadLog = async (data: any): Promise<any> => {
    const { forumId, adminId, customActivity } = data;

    // Validate thread exists
    const threadExists = await threads.findOne({
      where: { id: forumId, deletedAt: null }
    });
    if (!threadExists) {
      throw new Error("Forum thread not found");
    }

    // Validate admin exists
    const adminUser = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminUser) {
      throw new Error("Admin not found");
    }

    // Create custom log entry
    const customLog = await threadLog.create({
      threadId: forumId,
      customActivity: customActivity,
      customActivityBy: adminId,
      // Set all other fields to undefined/false to indicate this is a custom log
      isEdited: false,
      editedBy: undefined,
      isLocked: undefined,
      lockedBy: undefined,
      unLockedBy: undefined,
      isHidden: undefined,
      hiddenBy: undefined,
      isPinned: undefined,
      pinnedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      id: customLog.id,
      threadId: forumId,
      customActivity: customActivity,
      adminId: adminId,
      createdAt: customLog.createdAt
    };
  };

  public updateAdminPassword = async (data: any): Promise<any> => {
    const { id, currentPass, newPass, confirmPass } = data;
    let isUser: any;
    let isMatched: any;
    let userUpdate: any;

    isUser = await admin.findOne({ where: { id } });
    if (!isUser) {
      throw new Error("Admin bestaat niet.");
    }
    isMatched = await bcrypt.compare(currentPass, isUser?.password);
    if (!isMatched) {
      throw new Error("Het huidige wachtwoord is ongeldig.");
    }
    if (newPass != confirmPass) {
      throw new Error(
        "De velden Wachtwoord en Bevestig wachtwoord moeten hetzelfde zijn."
      );
    }
    const hashedPassword = await bcrypt.hash(newPass, 10);

    userUpdate = await admin.update(
      { password: hashedPassword },
      { where: { id: id } }
    );
    if (!userUpdate) {
      throw new Error("Fout bij het bijwerken van het wachtwoord.");
    }
  };

  public saveAppInfo = async (data: any): Promise<any> => {
    const { termsOfServices, privacyPolicy, aboutApp } = data;

    const updateFields: any = {
      ...(termsOfServices !== undefined && { termsOfServices }),
      ...(privacyPolicy !== undefined && { privacyPolicy }),
      ...(aboutApp !== undefined && { aboutApp }),
    };

    let appInfoRecord = await appInfo.findOne();

    if (appInfoRecord) {
      await appInfoRecord.update(updateFields);
    } else {
      await appInfo.create(updateFields);
    }

    return { success: true };
  };

  public getAppInfo = async (data: any): Promise<any> => {
    const { typeId } = data;

    const appInfoRecord = await appInfo.findOne({
      attributes: ["aboutApp", "termsOfServices", "privacyPolicy"],
    });

    if (!appInfoRecord) {
      throw new Error("Inhoud niet gevonden");
    }

    let content;
    if (typeId === 1) {
      content = appInfoRecord.aboutApp;
    } else if (typeId === 2) {
      content = appInfoRecord.privacyPolicy;
    } else if (typeId === 3) {
      content = appInfoRecord.termsOfServices;
    } else {
      throw new Error("Ongeldige type-ID");
    }

    return content;
  };

  public getThreadDetailsById = async (data: any): Promise<any> => {
    const { threadId } = data;

    return await threads.findOne({
      where: { id: threadId },
      attributes: { exclude: ["deletedAt", "updatedAt"] },
      include: [
        {
          as: "users",
          model: users,
          attributes: ["id","name","roleId"],
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: ["companyName", "firstName", "lastName", "profile"],
            },
          ],
        },
        {
          as: "employee",
          model: employee,
          attributes: [
            "id",
            "firstName",
            "lastName",
            "profile",
            [Sequelize.literal("3"), "roleId"],
          ],
          include: [
            {
              as: "users",
              model: users,
              attributes: ["name","roleId"],
              include: [
                {
                  as: "roleData",
                  model: roleData,
                  attributes: ["companyName", "firstName", "lastName", "profile"],
                },
              ],
            },
          ],
        },
        {
          as: "forumCategory",
          model: forumCategory,
          attributes: ["name"],
        },
        {
          as: "forumSubCategory",
          model: forumSubCategory,
          attributes: ["name"],
        },
      ],
    });
  };

  public getDashboardOverview = async (): Promise<any> => {
    const [
      userCount,
      empCount,
      forumCategoryCount,
      threadCount,
      spamCount,
      openRequestChanges,
      openRequestNewMembers,
      pendingSpamReq,
      resolvedSpamReq,
    ] = await Promise.all([
      users.count(),
      employee.count(),
      forumCategory.count(),
      threads.count(),
      report.count(),
      notifications.count({ where: { typeId: 4, seen: false } }),
      notifications.count({
        where: { typeId: { [Op.in]: [1, 2, 3] }, seen: false },
      }),
      notifications.count({
        where: { typeId: { [Op.in]: [5, 6, 7] }, seen: false },
      }),
      notifications.count({
        where: { typeId: { [Op.in]: [5, 6, 7] }, seen: true },
      }),
    ]);

    const totalUsers = userCount + empCount;

    return {
      totalUsers,
      forumCategoryCount,
      threadCount,
      spamCount,
      openRequestChanges,
      openRequestNewMembers,
      pendingSpamReq,
      resolvedSpamReq,
    };
  };

  public getDashboardStats = async (): Promise<any> => {
    const [
      registeredIndividuals,
      registeredCompanies,
      registeredEmployees,
      totalCategories,
      totalSubCategories,
      numberOfThreads,
    ] = await Promise.all([
      users.count({ where: { roleId: 1, deletedAt: null } }),
      users.count({ where: { roleId: 2, deletedAt: null } }),
      employee.count({ where: { deletedAt: null } }),
      forumCategory.count({ where: { deletedAt: null } }),
      forumSubCategory.count({ where: { deletedAt: null } }),
      threads.count({ where: { deletedAt: null } }),
    ]);

    return {
      registeredIndividuals,
      registeredCompanies,
      registeredEmployees,
      totalCategories,
      totalSubCategories,
      numberOfThreads,
    };
  };

  public getReportStats = async (): Promise<any> => {
    const [
      reportedUsers,
      reportedCompanies,
      reportedEmployees,
      reportedPrivateChats,
      reportedForums
    ] = await Promise.all([
      report.count({
        where: {
          reportedRoleId: { [Op.in]: [1, 2] },
          deletedAt: null
        }
      }),
      report.count({
        where: {
          reportedRoleId: 2,
          deletedAt: null
        }
      }),
      report.count({
        where: {
          reportedRoleId: 3,
          deletedAt: null
        }
      }),
      report.count({
        where: {
          reportedP_ThreadId: { [Op.and]: [Sequelize.literal('reportedP_ThreadId IS NOT NULL')] },
          deletedAt: null
        }
      }),
      report.count({
        where: {
          reportedThreadId: { [Op.and]: [Sequelize.literal('reportedThreadId IS NOT NULL')] },
          deletedAt: null
        }
      }),
      report.count({ where: { deletedAt: null } }),
    ]);

    return {
      reportedUsers,
      reportedCompanies,
      reportedEmployees,
      reportedPrivateChats,
      reportedForums,
      totalReports: reportedUsers + reportedCompanies + reportedEmployees + reportedPrivateChats + reportedForums,
    };
  };

  public getRegistrationRequestStats = async (): Promise<any> => {
    const [
      individualRegistrationRequests,
      companyRegistrationRequests,
      employeeRegistrationRequests,
      totalRegistrationRequests,
    ] = await Promise.all([
      users.count({
        where: {
          roleId: 1,
          profileStatus: 2,
          deletedAt: null
        }
      }),
      users.count({
        where: {
          roleId: 2,
          profileStatus: 2,
          deletedAt: null
        }
      }),
      employee.count({
        where: {
          profileStatus: 2,
          deletedAt: null
        }
      }),
      Promise.all([
        users.count({
          where: {
            profileStatus: 2,
            deletedAt: null
          }
        }),
        employee.count({
          where: {
            profileStatus: 2,
            deletedAt: null
          }
        })
      ]).then(([userCount, empCount]) => userCount + empCount),
    ]);

    return {
      individualRegistrationRequests,
      companyRegistrationRequests,
      employeeRegistrationRequests,
      totalRegistrationRequests,
    };
  };

  public getProfileUpdateRequestStats = async (): Promise<any> => {
    const [
      individualProfileUpdateRequests,
      companyProfileUpdateRequests,
      employeeProfileUpdateRequests,
      totalProfileUpdateRequests,
    ] = await Promise.all([
      users.count({
        where: {
          roleId: 1,
          profileStatus: 7,
          deletedAt: null
        }
      }),
      users.count({
        where: {
          roleId: 2,
          profileStatus: 7,
          deletedAt: null
        }
      }),
      employee.count({
        where: {
          profileStatus: 7,
          deletedAt: null
        }
      }),
      Promise.all([
        users.count({
          where: {
            profileStatus: 7,
            deletedAt: null
          }
        }),
        employee.count({
          where: {
            profileStatus: 7,
            deletedAt: null
          }
        })
      ]).then(([userCount, empCount]) => userCount + empCount),
    ]);

    return {
      individualProfileUpdateRequests,
      companyProfileUpdateRequests,
      employeeProfileUpdateRequests,
      totalProfileUpdateRequests,
    };
  };

  public getAppealsStats = async (): Promise<any> => {
    const [
      individualMuteSuspensionAppeals,
      companyMuteSuspensionAppeals,
      employeeMuteSuspensionAppeals,
      totalAppeals,
    ] = await Promise.all([
      userLog.count({
        where: {
          userId: { [Op.and]: [Sequelize.literal('userId IS NOT NULL')] },
          employeeId: { [Op.and]: [Sequelize.literal('employeeId IS NULL')] },
          [Op.or]: [
            { isSuspend: true },
            { isMuted: true }
          ],
          deletedAt: null
        }
      }),
      userLog.count({
        where: {
          userId: { [Op.and]: [Sequelize.literal('userId IS NOT NULL')] },
          employeeId: { [Op.and]: [Sequelize.literal('employeeId IS NULL')] },
          [Op.or]: [
            { isSuspend: true },
            { isMuted: true }
          ],
          deletedAt: null
        },
        include: [
          {
            model: users,
            where: { roleId: 2 },
            attributes: []
          }
        ]
      }),
      userLog.count({
        where: {
          employeeId: { [Op.and]: [Sequelize.literal('employeeId IS NOT NULL')] },
          [Op.or]: [
            { isSuspend: true },
            { isMuted: true }
          ],
          deletedAt: null
        }
      }),
      userLog.count({
        where: {
          [Op.or]: [
            { isSuspend: true },
            { isMuted: true }
          ],
          deletedAt: null
        }
      }),
    ]);

    return {
      individualMuteSuspensionAppeals,
      companyMuteSuspensionAppeals,
      employeeMuteSuspensionAppeals,
      totalAppeals,
    };
  };

  public getRegisteredUsersChartData = async (period: string = 'month', startDate?: string, endDate?: string): Promise<any> => {
    const now = new Date();
    let start: Date;
    let end: Date = endDate ? new Date(endDate) : now;

    switch (period) {
      case 'day':
        start = new Date(now.getTime() - (11 * 24 * 60 * 60 * 1000));
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case 'month':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case 'year':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 5);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        if (startDate) {
          start = new Date(startDate);
        } else {
          start = new Date(now.getTime() - (11 * 24 * 60 * 60 * 1000));
        }
        break;
    }

    const dates = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));

      if (period === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (period === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (period === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const chartData = await Promise.all(
      dates.map(async (date) => {
        const endOfPeriod = new Date(date);

        if (period === 'day') {
          endOfPeriod.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
          endOfPeriod.setMonth(endOfPeriod.getMonth() + 1, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
        } else if (period === 'year') {
          endOfPeriod.setMonth(11, 31);
          endOfPeriod.setHours(23, 59, 59, 999);
        } else {
          endOfPeriod.setHours(23, 59, 59, 999);
        }

        const [
          registeredOnly,
          profileSubmitted,
          videoSelfieSubmitted
        ] = await Promise.all([
          users.count({
            where: {
              profileStatus: 1,
              createdAt: {
                [Op.lte]: endOfPeriod
              },
              deletedAt: null
            }
          }),
          users.count({
            where: {
              profileStatus: 2,
              createdAt: {
                [Op.lte]: endOfPeriod
              },
              deletedAt: null
            }
          }),
          users.count({
            where: {
              profileStatus: 6,
              createdAt: {
                [Op.lte]: endOfPeriod
              },
              deletedAt: null
            }
          })
        ]);

        let dateFormat: string;
        if (period === 'day') {
          dateFormat = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (period === 'month') {
          dateFormat = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (period === 'year') {
          dateFormat = date.getFullYear().toString();
        } else {
          dateFormat = date.toISOString().split('T')[0];
        }
        return {
          date: dateFormat,
          registeredOnly,
          profileSubmitted,
          videoSelfieSubmitted
        };
      })
    );
    return {
      period,
      data: chartData
    };
  };

  public getLoggedInUsersChartData = async (period: string = 'month', startDate?: string, endDate?: string): Promise<any> => {
    const now = new Date();
    let start: Date;
    let end: Date = endDate ? new Date(endDate) : now;

    switch (period) {
      case 'day':
        start = new Date(now.getTime() - (11 * 24 * 60 * 60 * 1000));
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case 'month':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      case 'year':
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 5);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        if (startDate) {
          start = new Date(startDate);
        } else {
          start = new Date(now.getTime() - (11 * 24 * 60 * 60 * 1000));
        }
        break;
    }

    const dates = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));

      if (period === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (period === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (period === 'year') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const chartData = await Promise.all(
      dates.map(async (date) => {
        const endOfPeriod = new Date(date);

        if (period === 'day') {
          endOfPeriod.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
          endOfPeriod.setMonth(endOfPeriod.getMonth() + 1, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
        } else if (period === 'year') {
          endOfPeriod.setMonth(11, 31);
          endOfPeriod.setHours(23, 59, 59, 999);
        } else {
          endOfPeriod.setHours(23, 59, 59, 999);
        }

        const loggedInUsersCount = await users.count({
          where: {
            createdAt: {
              [Op.lte]: endOfPeriod
            },
            deletedAt: null
          }
        });

        let dateFormat: string;
        if (period === 'day') {
          dateFormat = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (period === 'month') {
          dateFormat = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else if (period === 'year') {
          dateFormat = date.getFullYear().toString();
        } else {
          dateFormat = date.toISOString().split('T')[0];
        }

        return {
          date: dateFormat,
          loggedInUsers: loggedInUsersCount,
        };
      })
    );

    return {
      period,
      data: chartData,
    };
  };

  public getAllDashboardStats = async (): Promise<any> => {
    const [
      dashboardStats,
      reportStats,
      registrationRequestStats,
      profileUpdateRequestStats,
      appealsStats,
    ] = await Promise.all([
      this.getDashboardStats(),
      this.getReportStats(),
      this.getRegistrationRequestStats(),
      this.getProfileUpdateRequestStats(),
      this.getAppealsStats(),
    ]);

    return {
      dashboardStats,
      reportStats,
      registrationRequestStats,
      profileUpdateRequestStats,
      appealsStats,
    };
  };

  // public getModeratorLogs = async (data: any): Promise<any> => {
  //   const { page = 1, limit = 10, moderatorId, startDate, endDate } = data;
  //   const offset = (page - 1) * limit;

  //   const activityLogsQuery: any = {
  //     where: {
  //       adminId: moderatorId
  //     },
  //     attributes: [
  //       'id',
  //       'adminId',
  //       'isSuspend',
  //       'days',
  //       'suspendUntil',
  //       'suspendedBy',
  //       'unSuspendedBy',
  //       'suspendedOn',
  //       'unSuspendedOn',
  //       'createdAt',
  //       'updatedAt'
  //     ],
  //     order: [['createdAt', 'DESC']],
  //     limit: 5,
  //     include: [
  //       {
  //         model: admin,
  //         as: 'info',
  //         attributes: ['id', 'name', 'email'],
  //         required: false
  //       },
  //       {
  //         model: admin,
  //         as: 'suspend',
  //         attributes: ['id', 'name', 'email'],
  //         required: false
  //       },
  //       {
  //         model: admin,
  //         as: 'unSuspend',
  //         attributes: ['id', 'name', 'email'],
  //         required: false
  //       }
  //     ]
  //   };

  //   if (startDate && endDate) {
  //     activityLogsQuery.where.createdAt = {
  //       [Op.between]: [new Date(startDate), new Date(endDate)]
  //     };
  //   }

  //   const activityLogs = await adminLog.findAll({
  //     ...activityLogsQuery,
  //     raw: false
  //   });

  //   const performanceStatsQuery: any = {
  //     where: {
  //       [Op.or]: [
  //         { suspendedBy: moderatorId },
  //         { unSuspendedBy: moderatorId },
  //         { mutedBy: moderatorId },
  //         { approvedBy: moderatorId },
  //         { rejectedBy: moderatorId }
  //       ],
  //       createdAt: {
  //         [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30))
  //       }
  //     },
  //     attributes: [
  //       [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
  //       [Sequelize.fn('COUNT', Sequelize.col('id')), 'reportsHandled'],
  //       [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN approvedBy = ' + moderatorId + ' THEN 1 ELSE 0 END')), 'approve'],
  //       [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN rejectedBy = ' + moderatorId + ' THEN 1 ELSE 0 END')), 'reject'],
  //       [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN suspendedBy = ' + moderatorId + ' THEN 1 ELSE 0 END')), 'suspend'],
  //       [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN mutedBy = ' + moderatorId + ' THEN 1 ELSE 0 END')), 'mute']
  //     ],
  //     group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
  //     order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'DESC']],
  //     limit: limit,
  //     offset: offset
  //   };

  //   const performanceStats = await userLog.findAll(performanceStatsQuery);
  //   const totalStatsCount = await userLog.count({
  //     where: {
  //       [Op.or]: [
  //         { suspendedBy: moderatorId },
  //         { unSuspendedBy: moderatorId },
  //         { mutedBy: moderatorId },
  //         { approvedBy: moderatorId },
  //         { rejectedBy: moderatorId }
  //       ],
  //       createdAt: {
  //         [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30))
  //       }
  //     },
  //     distinct: true,
  //     col: 'createdAt'
  //   });

  //   const formattedActivityLogs = activityLogs.map((log: any) => {
  //     let description = '';


  //     if (log.isSuspend === 1 || log.isSuspend === true) {
  //       const adminName = log.suspend?.name || 'Admin';
  //       const duration = log.days ? `${log.days} days` : 'indefinite';
  //       description = `Suspended by ${adminName} for ${duration}`;
  //     }
  //     else if ((log.isSuspend === 0 || log.isSuspend === false) && log.suspendedBy) {
  //       const adminName = log.suspend?.name || 'Admin';
  //       description = `Custom activity logged by ${adminName}`;
  //     }
  //     else if (log.isSuspend === 0 || log.isSuspend === false) {
  //       const adminName = log.unSuspend?.name || 'Admin';
  //       description = `Unsuspended by ${adminName}`;
  //     }
  //     else {
  //       description = 'Activity logged';
  //     }
  //     return {
  //       description: description,
  //       date: log.createdAt ? log.createdAt.toLocaleDateString('en-GB') : null,
  //       time: log.createdAt ? log.createdAt.toLocaleTimeString('en-US', {
  //         hour: '2-digit',
  //         minute: '2-digit',
  //         hour12: true
  //       }) : null
  //     };
  //   });
  //   const formattedPerformanceStats = performanceStats.map((stat: any) => ({
  //     date: stat.getDataValue('date'),
  //     reportsHandled: parseInt(stat.getDataValue('reportsHandled') || 0),
  //     approve: parseInt(stat.getDataValue('approve') || 0),
  //     reject: parseInt(stat.getDataValue('reject') || 0),
  //     suspend: parseInt(stat.getDataValue('suspend') || 0),
  //     mute: parseInt(stat.getDataValue('mute') || 0)
  //   }));

  //   return {
  //     activityPerformance: {
  //       logs: formattedActivityLogs.length > 0 ? formattedActivityLogs : null,
  //       total: activityLogs.length
  //     },
  //     performanceStatistics: {
  //       stats: formattedPerformanceStats.length > 0 ? formattedPerformanceStats : null,
  //       total: totalStatsCount,
  //       page: page,
  //       limit: limit,
  //       totalPages: Math.ceil(totalStatsCount / limit)
  //     }
  //   };
  // };

  public addCustomModeratorLog = async (data: any): Promise<any> => {
    const { moderatorId, activity, adminId } = data;

    const moderator = await admin.findOne({
      where: { id: moderatorId, adminRoleId: 2, deletedAt: null }
    });
    if (!moderator) {
      throw new Error("Moderator not found or is not a valid moderator");
    }

    const adminUser = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminUser) {
      throw new Error("Admin not found");
    }

    const customLog = await adminLog.create({
      adminId: moderatorId,
      isSuspend: false,
      suspendedBy: adminId,
      suspendedOn: new Date(),
      suspendReason: activity,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      id: customLog.id,
      moderatorId: moderatorId,
      activity: activity,
      createdBy: adminId,
      createdAt: customLog.createdAt
    };
  };

  public getModeratorActivityLogs = async (data: any): Promise<any> => {
    const { moderatorId, startDate, endDate } = data;

    const activityLogsQuery: any = {
      where: {
        adminId: moderatorId
      },
      attributes: [
        'id',
        'adminId',
        'isSuspend',
        'days',
        'suspendUntil',
        'suspendedBy',
        'unSuspendedBy',
        'suspendedOn',
        'unSuspendedOn',
        'suspendReason',
        'createdAt',
        'updatedAt'
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: admin,
          as: 'info',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: admin,
          as: 'suspend',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: admin,
          as: 'unSuspend',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    };

    if (startDate && endDate) {
      activityLogsQuery.where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const activityLogs = await adminLog.findAll({
      ...activityLogsQuery,
      raw: false
    });

    const formattedActivityLogs = activityLogs.map((log: any) => {
      let description = '';

      if (log.isSuspend === 1 || log.isSuspend === true) {
        const adminName = log.suspend?.name || 'Admin';
        const duration = log.days ? `${log.days} days` : 'indefinite';
        description = `Suspended by ${adminName} for ${duration}`;
      }
      else if ((log.isSuspend === 0 || log.isSuspend === false) && log.suspendedBy && log.suspendReason) {
        // Custom activity log - show the actual activity text
        description = log.suspendReason;
      }
      else if (log.isSuspend === 0 || log.isSuspend === false) {
        const adminName = log.unSuspend?.name || 'Admin';
        description = `Unsuspended by ${adminName}`;
      }
      else {
        description = 'Activity logged';
      }

      return {
        description: description,
        createdAt: log.createdAt
      };
    });

    return {
      logs: formattedActivityLogs.length > 0 ? formattedActivityLogs : null,
      total: activityLogs.length
    };
  };

  public getModeratorPerformanceStats = async (data: any): Promise<any> => {
    const { page = 1, limit = 10, moderatorId } = data;
    const offset = (page - 1) * limit;

    const performanceStatsQuery: any = {
      where: {
        [Op.or]: [
          { suspendedBy: moderatorId },
          { unSuspendedBy: moderatorId },
          { mutedBy: moderatorId },
          { approvedBy: moderatorId },
          { rejectedBy: moderatorId }
        ],
        createdAt: {
          [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      },
      attributes: [
        'id',
        'createdAt',
        'suspendedBy',
        'unSuspendedBy',
        'mutedBy',
        'approvedBy',
        'rejectedBy'
      ],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset
    };

    const performanceStats = await userLog.findAll(performanceStatsQuery);
    const dailyStats = new Map();

    performanceStats.forEach((stat: any) => {
      const date = stat.createdAt.toISOString().split('T')[0];

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date: date,
          reportsHandled: 0,
          approve: 0,
          reject: 0,
          suspend: 0,
          mute: 0
        });
      }

      const dayStat = dailyStats.get(date);
      dayStat.reportsHandled++;

      if (stat.approvedBy === parseInt(moderatorId)) {
        dayStat.approve++;
      }
      if (stat.rejectedBy === parseInt(moderatorId)) {
        dayStat.reject++;
      }
      if (stat.suspendedBy === parseInt(moderatorId)) {
        dayStat.suspend++;
      }
      if (stat.mutedBy === parseInt(moderatorId)) {
        dayStat.mute++;
      }
    });

    const formattedPerformanceStats = Array.from(dailyStats.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalStatsCount = await userLog.count({
      where: {
        [Op.or]: [
          { suspendedBy: moderatorId },
          { unSuspendedBy: moderatorId },
          { mutedBy: moderatorId },
          { approvedBy: moderatorId },
          { rejectedBy: moderatorId }
        ],
        createdAt: {
          [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    });

    return {
      stats: formattedPerformanceStats.length > 0 ? formattedPerformanceStats : null,
      total: totalStatsCount,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalStatsCount / limit)
    };
  };

  public getUsersAppeals = async (data: any) => {
    try {
      const {
        limit = 10,
        offset = 0,
        search = "",
        status = [],
        hasAppeal = null,
      } = data;

      const whereClause: any = {
        deletedAt: null,
        roleId: 1, // Filter for entrepreneurs/individuals only
        hasAppeal: true, // Only users with appeals
      };

      const statusArray = Array.isArray(status) ? status : (status ? [status] : []);
      
      // Build search conditions
      const searchConditions: any[] = [];
      if (search && search.trim()) {
        searchConditions.push(
          { name: { [Op.like]: `%${search.trim()}%` } },
          { email: { [Op.like]: `%${search.trim()}%` } },
          { phone: { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.firstName$": { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.lastName$": { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.companyName$": { [Op.like]: `%${search.trim()}%` } }
        );
      }
      
      // Build status conditions
      const statusConditions: any[] = [];
      if (statusArray.length > 0) {
        statusArray.forEach((statusType: string) => {
          switch (statusType.toLowerCase()) {
            case "active":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 1 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
            case "suspended":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 3 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
            case "muted":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 4 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
          }
        });
      }

      // Combine search and status conditions
      const combinedConditions: any[] = [];
      if (searchConditions.length > 0) {
        combinedConditions.push({ [Op.or]: searchConditions });
      }
      if (statusConditions.length > 0) {
        combinedConditions.push({ [Op.or]: statusConditions });
      }

      if (combinedConditions.length > 0) {
        whereClause[Op.and] = combinedConditions;
      }

      if (hasAppeal !== null) {
        if (hasAppeal === true) {
          whereClause.hasAppeal = true;
        } else if (hasAppeal === false) {
          whereClause.hasAppeal = false;
        }
      }
      const includeArray: any[] = [
        {
          model: roleData,
          as: "roleData",
          required: true, // Always required for users with appeals
          attributes: [
            "id",
            "firstName",
            "lastName", 
            "companyName",
            "profile",
            "mutedOn",
            "suspendedOn",
            "isApproved",
            "industryId",
            "languageId",
            "chamberCommerceNumber",
            "title",
            "currentSituationId",
            "accountStatus"
          ],
        },
      ];

      const { count: totalCount, rows: usersList } = await users.findAndCountAll({
        where: whereClause,
        include: includeArray,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        attributes: [
          "id",
          "roleId",
          "name", 
          "phone",
          "email",
          "appealMessage",
          "hasAppeal",
          "createdAt"
        ],
      });

      const usersWithWarnings = await Promise.all(
        usersList.map(async (user: any) => {
          const muteCount = await userLog.count({
            where: {
              userId: user.id,
              isMuted: true,
              deletedAt: null,
            },
          });

          const suspendCount = await userLog.count({
            where: {
              userId: user.id,
              isSuspend: true,
              deletedAt: null,
            },
          });
        
          let currentStatus = "active";
          // Use accountStatus to determine current status instead of date fields
          if (user.roleData?.accountStatus === 3) {
            currentStatus = "suspended";
          } else if (user.roleData?.accountStatus === 4) {
            currentStatus = "muted";
          }

          return {
            id: user.id,
            roleId: user.roleId,
            name: user.name,
            profilePicture: user.roleData?.profile || null,
            phone: user.phone,
            email: user.email,
            status: currentStatus,
            warnings: {
              total: muteCount + suspendCount,
              mute: muteCount,
              suspend: suspendCount,
            },
            hasAppeal: user.hasAppeal,
            appealMessage: user.appealMessage,
            createdAt: user.createdAt,
            roleData: user.roleData || null,
          };
        })
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        users: usersWithWarnings,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalCount,
          totalPages,
          currentPage: Math.floor(offset / limit) + 1,
        },
      };
    } catch (error) {
      throw error;
    }
  };

  public getEmployeesAppeals = async (data: any) => {
  try {
    const {
      limit = 10,
      offset = 0,
      search = "",
      status = [],
      hasAppeal = null,
    } = data;

    const whereClause: any = {
      deletedAt: null,
      hasAppeal: true, // Only employees with appeals
    };

    const statusArray = Array.isArray(status) ? status : (status ? [status] : []);

    // Build search conditions
    const searchConditions: any[] = [];
    if (search && search.trim()) {
      searchConditions.push(
        { firstName: { [Op.like]: `%${search.trim()}%` } },
        { lastName: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } }
      );
    }

    // Build status conditions
    const statusConditions: any[] = [];
    if (statusArray.length > 0) {
      statusArray.forEach((statusType: string) => {
        switch (statusType.toLowerCase()) {
          case "active":
            statusConditions.push({ accountStatus: 1 });
            break;
          case "suspended":
            statusConditions.push({ accountStatus: 3 });
            break;
          case "muted":
            statusConditions.push({ accountStatus: 4 });
            break;
          case "unavailable":
            statusConditions.push({ accountStatus: 2 });
            break;
        }
      });
    }

    if (searchConditions.length > 0 || statusConditions.length > 0) {
      whereClause[Op.and] = [];
      if (searchConditions.length > 0) whereClause[Op.and].push({ [Op.or]: searchConditions });
      if (statusConditions.length > 0) whereClause[Op.and].push({ [Op.or]: statusConditions });
    }

    if (hasAppeal !== null) {
      whereClause.hasAppeal = !!hasAppeal;
    }

    const includeArray: any[] = [
      {
        model: users,
        as: "users",
        required: false,
        attributes: ["id", "name", "roleId"],
        include: [
          {
            model: roleData,
            as: "roleData",
            required: false,
            attributes: ["companyName", "profile"]
          }
        ]
      }
    ];

    const { count: totalCount, rows: employeesList } = await employee.findAndCountAll({
      where: whereClause,
      include: includeArray,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "userId",
        "firstName",
        "lastName",
        "email",
        "phone",
        "profile",
        "accountStatus",
        "hasAppeal",
        "createdAt"
      ],
    });

    const employeesWithWarnings = await Promise.all(
      employeesList.map(async (emp: any) => {
        const muteCount = await userLog.count({
          where: {
            employeeId: emp.id,
            isMuted: true,
            deletedAt: null,
          },
        });

        const suspendCount = await userLog.count({
          where: {
            employeeId: emp.id,
            isSuspend: true,
            deletedAt: null,
          },
        });

        let currentStatus = "active";
        if (emp.accountStatus === 3) currentStatus = "suspended";
        else if (emp.accountStatus === 4) currentStatus = "muted";

        return {
          id: emp.id,
          userId: emp.userId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          name: `${emp.firstName} ${emp.lastName}`,
          profile: emp.profile || null, // ✅ fixed here
          phone: emp.phone,
          email: emp.email,
          status: currentStatus,
          accountStatus: emp.accountStatus, // ✅ added
          warnings: {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount,
          },
          hasAppeal: emp.hasAppeal || false,
          appeal: {
            message: null,
            originalReason: null
          },
          createdAt: emp.createdAt,
          companyName: emp.users?.roleData?.companyName || "Unknown Company",
          userInfo: emp.users || null,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      employees: employeesWithWarnings,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalCount,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1,
      },
    };
  } catch (error) {
    throw error;
  }
};


  public getCompaniesAppeals = async (data: any) => {
    try {
      const {
        limit = 10,
        offset = 0,
        search = "",
        status = [],
        hasAppeal = null,
      } = data;

      const whereClause: any = {
        deletedAt: null,
        roleId: 2, // Filter for companies only
        hasAppeal: true, // Only companies with appeals
      };

      const statusArray = Array.isArray(status) ? status : (status ? [status] : []);
      
      // Build search conditions
      const searchConditions: any[] = [];
      if (search && search.trim()) {
        searchConditions.push(
          { name: { [Op.like]: `%${search.trim()}%` } },
          { email: { [Op.like]: `%${search.trim()}%` } },
          { phone: { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.firstName$": { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.lastName$": { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.companyName$": { [Op.like]: `%${search.trim()}%` } },
          { "$roleData.chamberCommerceNumber$": { [Op.like]: `%${search.trim()}%` } }
        );
      }
      
      const statusConditions: any[] = [];
      if (statusArray.length > 0) {
        statusArray.forEach((statusType: string) => {
          switch (statusType.toLowerCase()) {
            case "active":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 1 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
            case "suspended":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 3 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
            case "muted":
              statusConditions.push({
                [Op.and]: [
                  { "$roleData.accountStatus$": 4 },
                  { appealMessage: { [Op.ne]: null } }
                ]
              });
              break;
          }
        });
      }

      const combinedConditions: any[] = [];
      if (searchConditions.length > 0) {
        combinedConditions.push({ [Op.or]: searchConditions });
      }
      if (statusConditions.length > 0) {
        combinedConditions.push({ [Op.or]: statusConditions });
      }

      if (combinedConditions.length > 0) {
        whereClause[Op.and] = combinedConditions;
      }

      if (hasAppeal !== null) {
        if (hasAppeal === true) {
          whereClause.hasAppeal = true;
        } else if (hasAppeal === false) {
          whereClause.hasAppeal = false;
        }
      } else {
        // Default behavior: only show companies with appeals
        whereClause.hasAppeal = true;
      }
      const includeArray: any[] = [
        {
          model: roleData,
          as: "roleData",
          required: true, // Always required for companies
          attributes: [
            "id",
            "firstName",
            "lastName", 
            "companyName",
            "profile",
            "mutedOn",
            "suspendedOn",
            "isApproved",
            "industryId",
            "languageId",
            "chamberCommerceNumber",
            "title",
            "currentSituationId",
            "accountStatus"
          ],
        },
      ];

      const { count: totalCount, rows: companiesList } = await users.findAndCountAll({
        where: whereClause,
        include: includeArray,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        attributes: [
          "id",
          "roleId",
          "name", 
          "phone",
          "email",
          "appealMessage",
          "hasAppeal",
          "createdAt"
        ],
      });

      const companiesWithWarnings = await Promise.all(
        companiesList.map(async (company: any) => {
          const muteCount = await userLog.count({
            where: {
              userId: company.id,
              isMuted: true,
              deletedAt: null,
            },
          });

          const suspendCount = await userLog.count({
            where: {
              userId: company.id,
              isSuspend: true,
              deletedAt: null,
            },
          });
        
          let currentStatus = "active";
          if (company.roleData?.accountStatus === 3) {
            currentStatus = "suspended";
          } else if (company.roleData?.accountStatus === 4) {
            currentStatus = "muted";
          }

          return {
            id: company.id,
            roleId: company.roleId,
            name: company.name,
            profilePicture: company.roleData?.profile || null,
            phone: company.phone,
            email: company.email,
            status: currentStatus,
            warnings: {
              total: muteCount + suspendCount,
              mute: muteCount,
              suspend: suspendCount,
            },
            hasAppeal: company.hasAppeal,
            appealMessage: company.appealMessage,
            createdAt: company.createdAt,
            roleData: company.roleData || null,
          };
        })
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        companies: companiesWithWarnings,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalCount,
          totalPages,
          currentPage: Math.floor(offset / limit) + 1,
        },
      };
    } catch (error) {
      throw error;
    }
  };

  public getReportedUsersList = async (data: any): Promise<any> => {
    const { limit, offset, search } = data;

    let whereClause: any = {
      deletedAt: null
    };
    whereClause.reportedUserId = {
      [Op.and]: [Sequelize.literal('reportedUserId IS NOT NULL')]
    };
    // Filter for entrepreneurs/individuals only (roleId: 1)
    whereClause.reportedRoleId = 1;

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { problem: { [Op.like]: `%${searchTerm}%` } },
        // Search in reported user info (only roleId 1)
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.reportedUserId 
          AND u.roleId = 1
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        // Search in reporter info
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.userId 
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.userId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`)
      ];
    }

    const response: any = await report.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "reportedUserId",
        "reportedRoleId",
        "createdAt"
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset * limit,
      distinct: true
    });

    const formattedRows = await Promise.all(
      response.rows.map(async (reportItem: any) => {
          const reportedUser = await users.findOne({
          where: { id: reportItem.reportedUserId, deletedAt: null, roleId: 1 },
            attributes: ["id", "name", "roleId"],
            include: [
              {
                model: roleData,
                as: "roleData",
                attributes: ["firstName", "lastName", "profile"],
                required: false
              }
            ]
          });

        let reportedUserInfo = null;
          if (reportedUser) {
            const userRoleData = reportedUser.roleData as any;
            reportedUserInfo = {
              id: reportedUser.id,
              name: userRoleData?.firstName && userRoleData?.lastName
                ? `${userRoleData.firstName} ${userRoleData.lastName}`
                : reportedUser.name,
              profile: userRoleData?.profile,
              roleId: reportedUser.roleId
            };
        }

        return {
          id: reportItem.id,
          name: reportedUserInfo?.name || 'Unknown User',
          profile: reportedUserInfo?.profile || null,
          createdAt: reportItem.createdAt
        };
      })
    );
    return {
      rows: formattedRows,
      count: response.count,
      limit: limit,
      offset: offset
    };
  };

  public getReportedEmployeesList = async (data: any): Promise<any> => {
    const { limit, offset, search } = data;

    let whereClause: any = {
      deletedAt: null
    };
    whereClause.reportedUserId = {
      [Op.and]: [Sequelize.literal('reportedUserId IS NOT NULL')]
    };
    // Filter for employees only (roleId: 3)
    whereClause.reportedRoleId = 3;

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { problem: { [Op.like]: `%${searchTerm}%` } },
        // Search in reported employee info (only roleId 3)
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.reportedUserId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR e.email LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        // Search in reporter info
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.userId 
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.userId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`)
      ];
    }

    const response: any = await report.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "reportedUserId",
        "reportedRoleId",
        "createdAt"
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset * limit,
      distinct: true
    });

    const formattedRows = await Promise.all(
      response.rows.map(async (reportItem: any) => {
        const reportedEmployee = await employee.findOne({
          where: { id: reportItem.reportedUserId, deletedAt: null },
          attributes: ["id", "firstName", "lastName", "profile", "email"],
          include: [
            {
              model: users,
              as: "users",
              attributes: ["id", "name", "roleId"],
              required: false,
              include: [
                {
                  model: roleData,
                  as: "roleData",
                  attributes: ["companyName"],
                  required: false
                }
              ]
            }
          ]
        });

        let reportedEmployeeInfo = null;
        if (reportedEmployee) {
          const userData = reportedEmployee.users as any;
          const roleData = userData?.roleData;
          reportedEmployeeInfo = {
            id: reportedEmployee.id,
            name: reportedEmployee.firstName && reportedEmployee.lastName
              ? `${reportedEmployee.firstName} ${reportedEmployee.lastName}`
              : userData?.name || 'Unknown Employee',
            profile: reportedEmployee.profile,
            email: reportedEmployee.email,
            companyName: roleData?.companyName || 'Unknown Company',
            roleId: 3
          };
        }

        return {
          id: reportItem.id,
          name: reportedEmployeeInfo?.name || 'Unknown Employee',
          profile: reportedEmployeeInfo?.profile || null,
          email: reportedEmployeeInfo?.email || null,
          companyName: reportedEmployeeInfo?.companyName || 'Unknown Company',
          createdAt: reportItem.createdAt
        };
      })
    );
    
    return {
      rows: formattedRows,
      count: response.count,
      limit: limit,
      offset: offset
    };
  };

  public getReportedCompaniesList = async (data: any): Promise<any> => {
    const { limit, offset, search } = data;

    let whereClause: any = {
      deletedAt: null
    };
    whereClause.reportedUserId = {
      [Op.and]: [Sequelize.literal('reportedUserId IS NOT NULL')]
    };
    whereClause.reportedRoleId = 2;

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { problem: { [Op.like]: `%${searchTerm}%` } },
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.reportedUserId 
          AND u.roleId = 2
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
            OR rd.chamberCommerceNumber LIKE '%${searchTerm}%'
          )
        )`),
        // Search in reporter info
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.userId 
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.userId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`)
      ];
    }

    const response: any = await report.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "reportedUserId",
        "reportedRoleId",
        "createdAt"
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset * limit,
      distinct: true
    });

    const formattedRows = await Promise.all(
      response.rows.map(async (reportItem: any) => {
        const reportedCompany = await users.findOne({
          where: { id: reportItem.reportedUserId, roleId: 2, deletedAt: null },
          attributes: ["id", "name", "roleId"],
          include: [
            {
              model: roleData,
              as: "roleData",
              attributes: ["firstName", "lastName", "profile", "companyName", "chamberCommerceNumber"],
              required: false
            }
          ]
        });

        let reportedCompanyInfo = null;
        if (reportedCompany) {
          const companyRoleData = reportedCompany.roleData as any;
          reportedCompanyInfo = {
            id: reportedCompany.id,
            name: companyRoleData?.companyName || companyRoleData?.firstName && companyRoleData?.lastName
              ? `${companyRoleData.firstName} ${companyRoleData.lastName}`
              : reportedCompany.name,
            profile: companyRoleData?.profile,
            roleId: reportedCompany.roleId,
            companyName: companyRoleData?.companyName,
            chamberCommerceNumber: companyRoleData?.chamberCommerceNumber
          };
        }

        return {
          id: reportItem.id,
          name: reportedCompanyInfo?.name || 'Unknown Company',
          profile: reportedCompanyInfo?.profile || null,
          companyName: reportedCompanyInfo?.companyName || null,
          chamberCommerceNumber: reportedCompanyInfo?.chamberCommerceNumber || null,
          createdAt: reportItem.createdAt
        };
      })
    );

    return {
      rows: formattedRows,
      count: response.count,
      limit: limit,
      offset: offset
    };
  };

  public getReportedUserDetails = async (data: any): Promise<any> => {
  const { reportId } = data;

  const reportItem = await report.findOne({
    where: { id: reportId, deletedAt: null },
    attributes: [
      "id",
      "userId",
      "roleId",
      "reportedUserId",
      "reportedRoleId",
      "problem",
      "createdAt"
    ]
  });

  if (!reportItem) {
    throw new Error("Report not found");
  }

  let reportedUserInfo = null;
  if (reportItem.reportedRoleId === 3) {
    const reportedEmployee = await employee.findOne({
      where: { id: reportItem.reportedUserId, deletedAt: null },
      attributes: [
        "id",
        "userId",
        "firstName",
        "lastName",
        "profile",
        "email",
        "phone",
        "roleId"   // 👈 added
      ],
      include: [
        {
          model: users,
          as: "users",
          include: [
            {
              model: roleData,
              as: "roleData",
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (reportedEmployee) {
      reportedUserInfo = {
        ...reportedEmployee.toJSON(),
        users: reportedEmployee.users ? {
          ...(reportedEmployee.users as any).toJSON(),
          roleData: (reportedEmployee.users as any).roleData || null
        } : null
      };
    }
  } else {
    const reportedUser = await users.findOne({
      where: { id: reportItem.reportedUserId, deletedAt: null },
      include: [
        {
          model: roleData,
          as: "roleData",
          required: false
        }
      ]
    });

    if (reportedUser) {
      reportedUserInfo = {
        ...reportedUser.toJSON(),
        roleData: reportedUser.roleData || null
      };
    }
  }

  let reporterInfo = null;
  if (reportItem.roleId === 3) {
    const reporterEmployee = await employee.findOne({
      where: { id: reportItem.userId, deletedAt: null },
      attributes: [
        "id",
        "userId",
        "firstName",
        "lastName",
        "profile",
        "email",
        "phone",
        "roleId"   // 👈 added
      ],
      include: [
        {
          model: users,
          as: "users",
          include: [
            {
              model: roleData,
              as: "roleData",
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (reporterEmployee) {
      reporterInfo = {
        ...reporterEmployee.toJSON(),
        users: reporterEmployee.users ? {
          ...(reporterEmployee.users as any).toJSON(),
          roleData: (reporterEmployee.users as any).roleData || null
        } : null
      };
    }
  } else {
    const reporterUser = await users.findOne({
      where: { id: reportItem.userId, deletedAt: null },
      include: [
        {
          model: roleData,
          as: "roleData",
          required: false
        }
      ]
    });

    if (reporterUser) {
      reporterInfo = {
        ...reporterUser.toJSON(),
        roleData: reporterUser.roleData || null
      };
    }
  }

  const reportedUserToxicity = await this.toxicityService.getUserToxicityScore(reportItem.reportedUserId, reportItem.reportedRoleId);
  const reporterToxicity = await this.toxicityService.getUserToxicityScore(reportItem.userId, reportItem.roleId);

  return {
    ...reportItem.toJSON(),
    reportedUser: reportedUserInfo || null,
    reporter: reporterInfo || null,
    problem: reportItem.problem,
    toxicityScores: {
      reportedUser: reportedUserToxicity?.toxicityScore || 0,
      reporter: reporterToxicity?.toxicityScore || 0
    }
  };
};


  public getReportedEmployeeDetails = async (data: any): Promise<any> => {
    const { reportId } = data;

    const reportItem = await report.findOne({
      where: { id: reportId, deletedAt: null, reportedRoleId: 3 },
      attributes: [
        "id",
        "userId",
        "roleId",
        "reportedUserId",
        "reportedRoleId",
        "problem",
        "createdAt"
      ]
    });

    if (!reportItem) {
      throw new Error("Report not found or not an employee report");
    }

    // Get reported employee info
    const reportedEmployee = await employee.findOne({
      where: { id: reportItem.reportedUserId, deletedAt: null },
      include: [
        {
          model: users,
          as: "users",
          include: [
            {
              model: roleData,
              as: "roleData",
              required: false
            }
          ],
          required: false
        }
      ]
    });

    let reportedEmployeeInfo = null;
    if (reportedEmployee) {
      reportedEmployeeInfo = {
        ...reportedEmployee.toJSON(),
        users: reportedEmployee.users ? {
          ...(reportedEmployee.users as any).toJSON(),
          roleData: (reportedEmployee.users as any).roleData || null
        } : null
      };
    }

    // Get reporter info
    let reporterInfo = null;
    if (reportItem.roleId === 3) {
      const reporterEmployee = await employee.findOne({
        where: { id: reportItem.userId, deletedAt: null },
        include: [
          {
            model: users,
            as: "users",
            include: [
              {
                model: roleData,
                as: "roleData",
                required: false
              }
            ],
            required: false
          }
        ]
      });

      if (reporterEmployee) {
        reporterInfo = {
          ...reporterEmployee.toJSON(),
          users: reporterEmployee.users ? {
            ...(reporterEmployee.users as any).toJSON(),
            roleData: (reporterEmployee.users as any).roleData || null
          } : null
        };
      }
    } else {
      const reporterUser = await users.findOne({
        where: { id: reportItem.userId, deletedAt: null },
        include: [
          {
            model: roleData,
            as: "roleData",
            required: false
          }
        ]
      });

      if (reporterUser) {
        reporterInfo = {
          ...reporterUser.toJSON(),
          roleData: reporterUser.roleData || null
        };
      }
    }

    const reportedEmployeeToxicity = await this.toxicityService.getUserToxicityScore(reportItem.reportedUserId, reportItem.reportedRoleId);
    const reporterToxicity = await this.toxicityService.getUserToxicityScore(reportItem.userId, reportItem.roleId);

    return {
      ...reportItem.toJSON(),
      reportedEmployee: reportedEmployeeInfo || null,
      reporter: reporterInfo || null,
      problem: reportItem.problem,
      toxicityScores: {
        reportedEmployee: reportedEmployeeToxicity?.toxicityScore || 0,
        reporter: reporterToxicity?.toxicityScore || 0
      }
    };
  };

  public getReportedCompanyDetails = async (data: any): Promise<any> => {
  const { reportId } = data;

  const reportItem = await report.findOne({
    where: { id: reportId, deletedAt: null },
    attributes: [
      "id",
      "userId",
      "roleId",
      "reportedUserId",
      "reportedRoleId",
      "problem",
      "createdAt"
    ]
  });

  if (!reportItem) {
    throw new Error("Report not found");
  }

  // Verify this is a company report
  if (reportItem.reportedRoleId !== 2) {
    throw new Error("This report is not for a company");
  }

  let reportedCompanyInfo = null;
  const reportedCompany = await users.findOne({
    where: { id: reportItem.reportedUserId, roleId: 2, deletedAt: null },
    include: [
      {
        model: roleData,
        as: "roleData",
        required: false
      }
    ]
  });

  if (reportedCompany) {
    reportedCompanyInfo = {
      ...reportedCompany.toJSON(),
      roleData: reportedCompany.roleData || null
    };
  }

  let reporterInfo = null;
  if (reportItem.roleId === 3) {
    const reporterEmployee = await employee.findOne({
      where: { id: reportItem.userId, deletedAt: null },
      attributes: [
        "id",
        "userId",
        "firstName",
        "lastName",
        "profile",
        "email",
        "phone",
        "roleId"   // 👈 added
      ],
      include: [
        {
          model: users,
          as: "users",
          include: [
            {
              model: roleData,
              as: "roleData",
              required: false
            }
          ],
          required: false
        }
      ]
    });

    if (reporterEmployee) {
      reporterInfo = {
        ...reporterEmployee.toJSON(),
        users: reporterEmployee.users ? {
          ...(reporterEmployee.users as any).toJSON(),
          roleData: (reporterEmployee.users as any).roleData || null
        } : null
      };
    }
  } else {
    const reporterUser = await users.findOne({
      where: { id: reportItem.userId, deletedAt: null },
      include: [
        {
          model: roleData,
          as: "roleData",
          required: false
        }
      ]
    });

    if (reporterUser) {
      reporterInfo = {
        ...reporterUser.toJSON(),
        roleData: reporterUser.roleData || null
      };
    }
  }

  const reportedCompanyToxicity = await this.toxicityService.getUserToxicityScore(reportItem.reportedUserId, reportItem.reportedRoleId);
  const reporterToxicity = await this.toxicityService.getUserToxicityScore(reportItem.userId, reportItem.roleId);

  return {
    ...reportItem.toJSON(),
    reportedCompany: reportedCompanyInfo || null,
    reporter: reporterInfo || null,
    problem: reportItem.problem,
    toxicityScores: {
      reportedCompany: reportedCompanyToxicity?.toxicityScore || 0,
      reporter: reporterToxicity?.toxicityScore || 0
    }
  };
};



  public getReportedUsers = async (data: any): Promise<any> => {
    const { limit, offset, search } = data;

    let whereClause: any = {
      deletedAt: null
    };
    whereClause.reportedUserId = {
      [Op.and]: [Sequelize.literal('reportedUserId IS NOT NULL')]
    };

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereClause[Op.or] = [
        { problem: { [Op.like]: `%${searchTerm}%` } },
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.reportedUserId 
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.reportedUserId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM users u 
          LEFT JOIN roleData rd ON u.id = rd.userId 
          WHERE u.id = report.userId 
          AND u.deletedAt IS NULL
          AND (
            u.name LIKE '%${searchTerm}%' 
            OR rd.firstName LIKE '%${searchTerm}%' 
            OR rd.lastName LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`),
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM employee e 
          LEFT JOIN users u ON e.userId = u.id
          LEFT JOIN roleData rd ON u.id = rd.userId
          WHERE e.id = report.userId 
          AND e.deletedAt IS NULL
          AND (
            e.firstName LIKE '%${searchTerm}%' 
            OR e.lastName LIKE '%${searchTerm}%'
            OR u.name LIKE '%${searchTerm}%'
            OR rd.companyName LIKE '%${searchTerm}%'
          )
        )`)
      ];
    }

    const response: any = await report.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "userId",
        "roleId",
        "reportedUserId",
        "reportedRoleId",
        "problem",
        "createdAt"
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset * limit,
      distinct: true
    });

    const formattedRows = await Promise.all(
      response.rows.map(async (reportItem: any) => {
        let reportedUserInfo = null;
        if (reportItem.reportedRoleId === 3) {
          const reportedEmployee = await employee.findOne({
            where: { id: reportItem.reportedUserId, deletedAt: null },
            attributes: ["id", "firstName", "lastName", "profile"],
            include: [
              {
                model: users,
                as: "users",
                attributes: ["id", "name", "roleId"],
                include: [
                  {
                    model: roleData,
                    as: "roleData",
                    attributes: ["companyName", "profile"],
                    required: false
                  }
                ],
                required: false
              }
            ]
          });

          if (reportedEmployee) {
            const employeeUsers = reportedEmployee.users as any;
            const employeeRoleData = employeeUsers?.roleData as any;
            reportedUserInfo = {
              id: reportedEmployee.id,
              name: `${reportedEmployee.firstName} ${reportedEmployee.lastName}`,
              profile: reportedEmployee.profile,
              roleId: 3,
              companyName: employeeRoleData?.companyName
            };
          }
        } else {
          const reportedUser = await users.findOne({
            where: { id: reportItem.reportedUserId, deletedAt: null },
            attributes: ["id", "name", "roleId"],
            include: [
              {
                model: roleData,
                as: "roleData",
                attributes: ["firstName", "lastName", "companyName", "profile"],
                required: false
              }
            ]
          });

          if (reportedUser) {
            const userRoleData = reportedUser.roleData as any;
            reportedUserInfo = {
              id: reportedUser.id,
              name: userRoleData?.firstName && userRoleData?.lastName
                ? `${userRoleData.firstName} ${userRoleData.lastName}`
                : reportedUser.name,
              profile: userRoleData?.profile,
              roleId: reportedUser.roleId,
              companyName: userRoleData?.companyName
            };
          }
        }

        let reporterInfo = null;
        if (reportItem.roleId === 3) {
          const reporterEmployee = await employee.findOne({
            where: { id: reportItem.userId, deletedAt: null },
            attributes: ["id", "firstName", "lastName", "profile"],
            include: [
              {
                model: users,
                as: "users",
                attributes: ["id", "name", "roleId"],
                include: [
                  {
                    model: roleData,
                    as: "roleData",
                    attributes: ["companyName", "profile"],
                    required: false
                  }
                ],
                required: false
              }
            ]
          });

          if (reporterEmployee) {
            const employeeUsers = reporterEmployee.users as any;
            const employeeRoleData = employeeUsers?.roleData as any;
            reporterInfo = {
              id: reporterEmployee.id,
              name: `${reporterEmployee.firstName} ${reporterEmployee.lastName}`,
              profile: reporterEmployee.profile,
              roleId: 3,
              companyName: employeeRoleData?.companyName
            };
          }
        } else {
          const reporterUser = await users.findOne({
            where: { id: reportItem.userId, deletedAt: null },
            attributes: ["id", "name", "roleId"],
            include: [
              {
                model: roleData,
                as: "roleData",
                attributes: ["firstName", "lastName", "companyName", "profile"],
                required: false
              }
            ]
          });

          if (reporterUser) {
            const userRoleData = reporterUser.roleData as any;
            reporterInfo = {
              id: reporterUser.id,
              name: userRoleData?.firstName && userRoleData?.lastName
                ? `${userRoleData.firstName} ${userRoleData.lastName}`
                : reporterUser.name,
              profile: userRoleData?.profile,
              roleId: reporterUser.roleId,
              companyName: userRoleData?.companyName
            };
          }
        }
        const reportedUserToxicity = await this.toxicityService.getUserToxicityScore(reportItem.reportedUserId, reportItem.reportedRoleId);
        const reporterToxicity = await this.toxicityService.getUserToxicityScore(reportItem.userId, reportItem.roleId);

        return {
          id: reportItem.id,
          name: reportedUserInfo?.name || 'Unknown User',
          profile: reportedUserInfo?.profile || null,
          createdAt: reportItem.createdAt,
          reportedUser: {
            id: reportItem.reportedUserId,
            roleId: reportItem.reportedRoleId,
            name: reportedUserInfo?.name || 'Unknown User',
            profile: reportedUserInfo?.profile || null,
            companyName: reportedUserInfo?.companyName || null,
            toxicityScore: reportedUserToxicity?.toxicityScore || 0
          },
          reporter: {
            id: reportItem.userId,
            roleId: reportItem.roleId,
            name: reporterInfo?.name || 'Unknown User',
            profile: reporterInfo?.profile || null,
            companyName: reporterInfo?.companyName || null,
            toxicityScore: reporterToxicity?.toxicityScore || 0
          },
          problem: reportItem.problem
        };
      })
    );

    return {
      limit: limit,
      users: formattedRows
    };
  };

  public markReportAsResolved = async (data: any): Promise<any> => {
    const { reportId, reportedRoleId } = data;
    const existingReport = await report.findOne({
      where: { id: reportId, deletedAt: null }
    });

    if (!existingReport) {
      throw new Error("Report not found or already resolved");
    }

    // If reportedRoleId is provided, validate it matches the report
    if (reportedRoleId && existingReport.reportedRoleId !== reportedRoleId) {
      const entityType = reportedRoleId === 2 ? "company" : reportedRoleId === 3 ? "employee" : "user";
      throw new Error(`This report is not for a ${entityType}`);
    }

    await report.update(
      { deletedAt: new Date() },
      { where: { id: reportId } }
    );

    const entityType = existingReport.reportedRoleId === 2 ? "Company" : existingReport.reportedRoleId === 3 ? "Employee" : "User";
    const message = `${entityType} report marked as resolved successfully`;

    return {
      message: message,
      reportId: reportId,
      reportedRoleId: existingReport.reportedRoleId,
      entityType: entityType
    };
  };


  public calculateUserToxicityScore = async (data: any): Promise<any> => {
    const { userId, roleId } = data;

    try {
      const analysis = await this.toxicityService.calculateUserToxicityScore(userId, roleId);

      return {
        success: true,
        data: analysis
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate toxicity score: ${error.message}`);
    }
  };

  public addCustomUserLog = async (data: any): Promise<any> => {
    const { userId, roleId, activity, adminId } = data;

    if (roleId === 3) {
      const employeeExists = await employee.findOne({
        where: { id: userId, deletedAt: null }
      });
      if (!employeeExists) {
        throw new Error("Employee not found");
      }
    } else {
      const userExists = await users.findOne({
        where: { id: userId, deletedAt: null }
      });
      if (!userExists) {
        throw new Error("User not found");
      }
    }

    const adminUser = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminUser) {
      throw new Error("Admin not found");
    }

    const field = roleId === 3 ? "employeeId" : "userId";

    const customLog = await userLog.create({
      [field]: userId,
      isSuspend: false,
      isMuted: false,
      suspendedBy: adminId,
      suspendedOn: new Date(),
      suspendReason: activity,
      createdAt: new Date(),
      updatedAt: new Date()
    });


    return {
      id: customLog.id,
      userId: userId,
      roleId: roleId,
      activity: activity,
      createdBy: adminId,
      createdAt: customLog.createdAt
    };
  };

  public getUserThreads = async (data: any): Promise<any> => {
    const { userId, roleId, limit = 10, offset = 0 } = data;

    // Check if user exists based on role
    if (roleId === 3) {
      // Check if employee exists
      const employeeExists = await employee.findOne({
        where: { id: userId, deletedAt: null }
      });
      if (!employeeExists) {
        throw new Error("Employee not found");
      }
    } else {
      // Check if user exists
      const userExists = await users.findOne({
        where: { id: userId, deletedAt: null }
      });
      if (!userExists) {
        throw new Error("User not found");
      }
    }

    // Get threads where user is the owner
    const whereClause: any = {
      roleId: roleId,
      deletedAt: null
    };
    
    if (roleId === 3) {
      // For employees: check ownerEmpId and ensure ownerId is null/0
      whereClause.ownerEmpId = userId;
      whereClause.ownerId = { [Op.or]: [null, 0] };
    } else {
      // For users: check ownerId and ensure ownerEmpId is null/0
      whereClause.ownerId = userId;
      whereClause.ownerEmpId = { [Op.or]: [null, 0] };
    }

    const ownedThreads = await threads.findAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "categoryId",
        "subCategoryId",
        "locked",
        "createdAt",
        "updatedAt"
      ],
      include: [
        {
          model: forumCategory,
          as: "forumCategory",
          attributes: ["name"],
          required: false
        },
        {
          model: forumSubCategory,
          as: "forumSubCategory",
          attributes: ["name"],
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Get threads where user has sent messages
    const participatedThreads = await threads.findAll({
      where: {
        id: {
          [Op.in]: Sequelize.literal(`(
            SELECT DISTINCT roomId 
            FROM messages 
            WHERE userId = ${userId} 
            AND roleId = ${roleId}
            AND deletedAt IS NULL
          )`)
        },
        roleId: roleId,
        deletedAt: null
      },
      attributes: [
        "id",
        "title",
        "description",
        "categoryId",
        "subCategoryId",
        "locked",
        "createdAt",
        "updatedAt"
      ],
      include: [
        {
          model: forumCategory,
          as: "forumCategory",
          attributes: ["name"],
          required: false
        },
        {
          model: forumSubCategory,
          as: "forumSubCategory",
          attributes: ["name"],
          required: false
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const allThreads = [...ownedThreads, ...participatedThreads];
    const uniqueThreads = allThreads.filter((thread, index, self) =>
      index === self.findIndex(t => t.id === thread.id)
    );
    const paginatedThreads = uniqueThreads.slice(offset * limit, (offset + 1) * limit);
    const formattedThreads = paginatedThreads.map((thread: any) => ({
      threadId: thread.id,
      threadName: thread.title,
      threadPath: thread.forumCategory?.name && thread.forumSubCategory?.name
        ? `${thread.forumCategory.name} > ${thread.forumSubCategory.name}`
        : thread.forumCategory?.name || thread.forumSubCategory?.name || null
    }));

    return {
      threads: formattedThreads,
      total: uniqueThreads.length,
      limit: limit,
      offset: offset
    };
  };

  public getCompanyThreads = async (data: { companyId: number, limit?: number, offset?: number }): Promise<any> => {
  const { companyId, limit = 10, offset = 0 } = data;

  // Check if company exists
  const companyExists = await users.findOne({
    where: { id: companyId, roleId: 2, deletedAt: null }
  });
  if (!companyExists) {
    throw new Error("Company not found");
  }

  // Get threads where company is the owner
  const ownedThreads = await threads.findAll({
    where: {
      ownerId: companyId,
      deletedAt: null
    },
    attributes: [
      "id",
      "title",
      "description",
      "categoryId",
      "subCategoryId",
      "locked",
      "createdAt",
      "updatedAt"
    ],
    include: [
      {
        model: forumCategory,
        as: "forumCategory",
        attributes: ["name"],
        required: false
      },
      {
        model: forumSubCategory,
        as: "forumSubCategory",
        attributes: ["name"],
        required: false
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  // Get threads where company has sent messages
  const participatedThreads = await threads.findAll({
    where: {
      id: {
        [Op.in]: Sequelize.literal(`(
          SELECT DISTINCT roomId 
          FROM messages 
          WHERE userId = ${companyId} 
          AND deletedAt IS NULL
        )`)
      },
      deletedAt: null
    },
    attributes: [
      "id",
      "title",
      "description",
      "categoryId",
      "subCategoryId",
      "locked",
      "createdAt",
      "updatedAt"
    ],
    include: [
      {
        model: forumCategory,
        as: "forumCategory",
        attributes: ["name"],
        required: false
      },
      {
        model: forumSubCategory,
        as: "forumSubCategory",
        attributes: ["name"],
        required: false
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  const allThreads = [...ownedThreads, ...participatedThreads];
  const uniqueThreads = allThreads.filter((thread, index, self) =>
    index === self.findIndex(t => t.id === thread.id)
  );

  const paginatedThreads = uniqueThreads.slice(offset * limit, (offset + 1) * limit);

  const formattedThreads = paginatedThreads.map(thread => ({
    threadId: thread.id,
    threadName: thread.title,
    threadPath: thread.forumCategory?.name && thread.forumSubCategory?.name
      ? `${thread.forumCategory.name} > ${thread.forumSubCategory.name}`
      : thread.forumCategory?.name || thread.forumSubCategory?.name || null
  }));

  return {
    threads: formattedThreads,
    total: uniqueThreads.length,
    limit,
    offset
  };
};


  public approveRejectUser = async (data: any): Promise<any> => {
    const { userId, status, adminId, rejectionReason, customLog } = data;

    const userExists = await users.findOne({
      where: { id: userId, deletedAt: null }
    });
    if (!userExists) {
      throw new Error("User not found");
    }

    const adminExists = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminExists) {
      throw new Error("Admin not found");
    }

    if (![3, 4].includes(status)) {
      throw new Error("Invalid status. Use 3 for approved or 4 for rejected");
    }

    const isApproved = status === 3;
    const isApprovedValue = isApproved ? true : false;

    await users.update(
      {
        profileStatus: status,
        rejectionReason: isApproved ? null : (rejectionReason || "No reason provided")
      },
      { where: { id: userId } }
    );

    await roleData.update(
      { isApproved: isApprovedValue },
      { where: { userId: userId } }
    );

    if (isApproved) {
      // Remove intro video from AWS and set video to null in roleData
      const userInfo: any = await roleData.findOne({ 
        where: { userId: userId }, 
        attributes: ['videoKey'], 
        raw: true 
      });
      
      if (userInfo?.videoKey) {
        try {
          const AWS = require('aws-sdk');
          AWS.config.update({
            accessKeyId: process.env.A_ACCESS_KEY_ID,
            secretAccessKey: process.env.A_SECRET_ACCESS_KEY,
          });
          const BUCKET_NAME = `${process.env.FILE_UPLOAD_BUCKET_NAME}`;
          const s3 = new AWS.S3();

          const params = {
            Bucket: BUCKET_NAME,
            Key: userInfo.videoKey,
          };

          await s3.deleteObject(params).promise();
          console.log(`Video deleted successfully for user ${userId}`);

          await roleData.update(
            { video: "", videoKey: "" },
            { where: { userId: userId } }
          );
        } catch (error) {
          console.error("Error deleting video from S3:", error);
        }
      }

      await userLog.create({
        userId: userId,
        isApproved: true,
        approvedBy: adminId,
        approvedOn: new Date()
      });
    } else {
      if (customLog) {
        // Create custom log only
        await this.addCustomUserLog({
          userId: userId,
          roleId: userExists.roleId,
          activity: customLog,
          adminId: adminId
        });
      } else {
        // Create standard rejection log only if no custom log provided
        await userLog.create({
          userId: userId,
          isApproved: false,
          rejectedReason: rejectionReason || "No reason provided",
          rejectedBy: adminId,
          rejectedOn: new Date()
        });
      }
    }

    const userData = await users.findOne({
      where: { id: userId },
      attributes: ['fcmToken', "email", "name"],
      include: [{
        as: "roleData",
        model: roleData,
        attributes: ["companyName", "firstName", "lastName"]
      }]
    });

    let userName: string;
    if (userData && (userData.roleData as any)?.companyName) {
      userName = (userData.roleData as any).companyName;
    } else {
      userName = `${(userData?.roleData as any)?.firstName || ''} ${(userData?.roleData as any)?.lastName || ''}`.trim();
    }

    const notificationStatus = isApproved ? "Goedgekeurd" : "Afgewezen";
    const notificationBody = isApproved
      ? "Uw account is succesvol goedgekeurd."
      : `Uw account is afgewezen vanwege ${rejectionReason || "onbekende reden"}.`;

    // Use new unified notification system
    if (isApproved) {
      await this.notificationService.createApprovalNotification({
        userId: userId,
        adminId: adminId,
        title: `Account ${notificationStatus}`,
        content: notificationBody
      });
    } else {
      await this.notificationService.createRejectionNotification({
        userId: userId,
        adminId: adminId,
        title: `Account ${notificationStatus}`,
        content: notificationBody,
        rejectionReason: rejectionReason
      });
    }

    if (userData?.fcmToken) {
      try {
        await sendPushNotification(
          userData.fcmToken,
          `Account ${notificationStatus}`,
          notificationBody,
          ""
        );
      } catch (error) {
        console.log("Failed to send push notification:", error);
      }
    }

    return {
      userId: userId,
      status: status,
      statusText: isApproved ? "Approved" : "Rejected",
      adminId: adminId,
      rejectionReason: isApproved ? null : (rejectionReason || "No reason provided"),
      customLog: isApproved ? null : customLog,
      processedAt: new Date()
    };
  };

public approveRejectEmployee = async (data: any): Promise<any> => {
  const { employeeId, status, adminId, rejectionReason, customLog } = data;

  // 1️⃣ Validate employee
  const employeeExists = await employee.findOne({
    where: { id: employeeId, deletedAt: null }
  });
  if (!employeeExists) throw new Error("Employee not found");

  // 2️⃣ Validate admin
  const adminExists = await admin.findOne({
    where: { id: adminId, deletedAt: null }
  });
  if (!adminExists) throw new Error("Admin not found");

  // 3️⃣ Validate status
  if (![3, 4].includes(status)) throw new Error("Invalid status. Use 3 for approved or 4 for rejected");

  const isApproved = status === 3;

  // 4️⃣ Update employee table
  await employee.update(
    {
      profileStatus: status,
      isApproved: isApproved,
      rejectionReason: isApproved ? null : (rejectionReason || "No reason provided"),
      rejectedBy: isApproved ? null : adminId
    },
    { where: { id: employeeId } }
  );

  // 5️⃣ Update users table rejectionReason if rejected
  if (!isApproved) {
    await users.update(
      {
        rejectionReason: rejectionReason || "No reason provided",
        rejectedBy: adminId
      },
      { where: { id: employeeExists.userId } }
    );
  }

  // 6️⃣ Create log in userLog table
  const logData: any = {
    userId: employeeExists.userId,
    employeeId: employeeId,
    isApproved: isApproved
  };

  if (isApproved) {
    logData.approvedBy = adminId;
    logData.approvedOn = new Date();
  } else {
    logData.rejectedBy = adminId;
    logData.rejectedReason = rejectionReason || "No reason provided";
    logData.rejectedOn = new Date();
  }

  // Always create the standard log entry
  await userLog.create(logData);

  // Additionally create custom log if provided for rejection
  if (!isApproved && customLog && customLog.trim() !== "") {
    await this.addCustomUserLog({
      userId: employeeExists.userId,
      employeeId: employeeId,
      roleId: 3,
      activity: customLog,
      adminId: adminId
    });
  }

  // 7️⃣ Fetch employee + user for notification
  const employeeData = await employee.findOne({
    where: { id: employeeId },
    attributes: ['firstName', 'lastName'],
    include: [{
      as: "users",
      model: users,
      attributes: ['fcmToken'],
      required: false,
      include: [{
        as: "roleData",
        model: roleData,
        attributes: ["companyName"],
        required: false
      }]
    }]
  });

  const notificationStatus = isApproved ? "Goedgekeurd" : "Afgewezen";
  const notificationBody = isApproved
    ? "Uw account is succesvol goedgekeurd."
    : `Uw account is afgewezen vanwege ${rejectionReason || "onbekende reden"}.`;

  await userNotification.create({
    userId: employeeExists.userId,
    adminId: adminId,
    content: notificationBody,
    seen: false,
    typeId: isApproved ? 1 : 2
  });

  const fcmToken = (employeeData?.users as any)?.fcmToken;
  if (fcmToken) {
    try {
      await sendPushNotification(
        fcmToken,
        `Account ${notificationStatus}`,
        notificationBody,
        ""
      );
    } catch (error) {
      console.log("Failed to send push notification:", error);
    }
  }

  return {
    employeeId: employeeId,
    userId: employeeExists.userId,
    status: status,
    statusText: isApproved ? "Approved" : "Rejected",
    adminId: adminId,
    rejectionReason: isApproved ? null : (rejectionReason || "No reason provided"),
    customLog: isApproved ? null : customLog || null,
    processedAt: new Date()
  };
};





  public approveRejectCompany = async (data: any): Promise<any> => {
    const { companyId, status, adminId, rejectionReason, customLog } = data;

    const companyExists = await users.findOne({
      where: { id: companyId, roleId: 2, deletedAt: null } // Filter for companies only
    });
    if (!companyExists) {
      throw new Error("Company not found");
    }

    const adminExists = await admin.findOne({
      where: { id: adminId, deletedAt: null }
    });
    if (!adminExists) {
      throw new Error("Admin not found");
    }

    if (![3, 4].includes(status)) {
      throw new Error("Invalid status. Use 3 for approved or 4 for rejected");
    }

    const isApproved = status === 3;
    const isApprovedValue = isApproved ? true : false;

    await users.update(
      {
        profileStatus: status,
        rejectionReason: isApproved ? null : (rejectionReason || "No reason provided")
      },
      { where: { id: companyId } }
    );

    await roleData.update(
      { isApproved: isApprovedValue },
      { where: { userId: companyId } }
    );

    if (isApproved) {
      // Remove intro video from AWS and set video to null in roleData
      const companyInfo: any = await roleData.findOne({ 
        where: { userId: companyId }, 
        attributes: ['videoKey'], 
        raw: true 
      });
      
      if (companyInfo?.videoKey) {
        try {
          const AWS = require('aws-sdk');
          AWS.config.update({
            accessKeyId: process.env.A_ACCESS_KEY_ID,
            secretAccessKey: process.env.A_SECRET_ACCESS_KEY,
          });
          const BUCKET_NAME = `${process.env.FILE_UPLOAD_BUCKET_NAME}`;
          const s3 = new AWS.S3();

          const params = {
            Bucket: BUCKET_NAME,
            Key: companyInfo.videoKey,
          };

          await s3.deleteObject(params).promise();
          console.log(`Video deleted successfully for company ${companyId}`);

          await roleData.update(
            { video: "", videoKey: "" },
            { where: { userId: companyId } }
          );
        } catch (error) {
          console.error("Error deleting video from S3:", error);
        }
      }

      await userLog.create({
        userId: companyId,
        isApproved: true,
        approvedBy: adminId,
        approvedOn: new Date()
      });
    } else {
      if (customLog) {
        // Create custom log only
        await this.addCustomUserLog({
          userId: companyId,
          roleId: companyExists.roleId,
          activity: customLog,
          adminId: adminId
        });
      } else {
        // Create standard rejection log only if no custom log provided
        await userLog.create({
          userId: companyId,
          isApproved: false,
          rejectedReason: rejectionReason || "No reason provided",
          rejectedBy: adminId,
          rejectedOn: new Date()
        });
      }
    }

    const companyData = await users.findOne({
      where: { id: companyId },
      attributes: ['fcmToken', "email", "name"],
      include: [{
        as: "roleData",
        model: roleData,
        attributes: ["companyName", "firstName", "lastName"]
      }]
    });

    let companyName: string;
    if (companyData && (companyData.roleData as any)?.companyName) {
      companyName = (companyData.roleData as any).companyName;
    } else {
      companyName = `${(companyData?.roleData as any)?.firstName || ''} ${(companyData?.roleData as any)?.lastName || ''}`.trim();
    }

    const notificationStatus = isApproved ? "Goedgekeurd" : "Afgewezen";
    const notificationBody = isApproved
      ? "Uw bedrijfsaccount is succesvol goedgekeurd."
      : `Uw bedrijfsaccount is afgewezen vanwege ${rejectionReason || "onbekende reden"}.`;

    await userNotification.create({
      userId: companyId,
      adminId: adminId,
      content: notificationBody,
      seen: false,
      typeId: isApproved ? 1 : 2 // 1 = approved, 2 = rejected
    });

    if (companyData?.fcmToken) {
      try {
        await sendPushNotification(
          companyData.fcmToken,
          `Bedrijfsaccount ${notificationStatus}`,
          notificationBody,
          ""
        );
      } catch (error) {
        console.log("Failed to send push notification:", error);
      }
    }

    return {
      companyId: companyId,
      status: status,
      statusText: isApproved ? "Approved" : "Rejected",
      adminId: adminId,
      rejectionReason: isApproved ? null : (rejectionReason || "No reason provided"),
      customLog: isApproved ? null : customLog,
      processedAt: new Date()
    };
  };

  public reviewAppeal = async (data: any): Promise<any> => {
  const { userId, roleId, status, adminId, rejectionReason } = data;

  // Determine which table to query based on role
  let userExists: any;
  if (roleId === 3) { // Employee
    userExists = await employee.findOne({ where: { id: userId, deletedAt: null } });
  } else if (roleId === 2) { // Company
    userExists = await roleData.findOne({ where: { userId, deletedAt: null } });
  } else { // Generic User
    userExists = await users.findOne({ where: { id: userId, deletedAt: null } });
  }

  if (!userExists) {
    const entityType = roleId === 2 ? "Company" : roleId === 3 ? "Employee" : "User";
    throw new Error(`${entityType} not found`);
  }

  // Check admin
  const adminExists = await admin.findOne({ where: { id: adminId, deletedAt: null } });
  if (!adminExists) throw new Error("Admin not found");

  // Check if appeal exists
  if (!userExists.appealMessage || !userExists.hasAppeal) {
    const entityType = roleId === 2 ? "company" : roleId === 3 ? "employee" : "user";
    throw new Error(`No appeal found for this ${entityType}`);
  }

  // Validate status
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Invalid status. Use 'approved' or 'rejected'");
  }

  // Handle approval: reset suspension/mute if applicable and update account status
  if (status === "approved") {
    // Update accountStatus to 1 (available) for all roles
    if (roleId === 1 || roleId === 2) {
      // For users (freelancer, company) - update roleData
      await roleData.update(
        { accountStatus: 1 },
        { where: { userId } }
      );
    } else if (roleId === 3) {
      // For employees - update employee table
      await employee.update(
        { accountStatus: 1 },
        { where: { id: userId } }
      );
    }

    // Only employees have user logs for suspension/mute
    if (roleId === 3) {
      const latestSuspension = await userLog.findOne({
        where: { employeeId: userId, isSuspend: true, deletedAt: null },
        order: [["createdAt", "DESC"]],
      });

      const latestMute = await userLog.findOne({
        where: { employeeId: userId, isMuted: true, deletedAt: null },
        order: [["createdAt", "DESC"]],
      });

      if (latestSuspension) {
        await userLog.create({
          employeeId: userId,
          isSuspend: false,
          unSuspendedBy: adminId,
          unSuspendedOn: new Date(),
        });
      }

      if (latestMute) {
        await userLog.create({
          employeeId: userId,
          isMuted: false,
          unMutedBy: adminId,
          unMutedOn: new Date(),
        });
      }
    }
  }

  // Update appeal status
  const updateData: any = { appealMessage: null, hasAppeal: false };
  if (status === "rejected" && rejectionReason) updateData.rejectionReason = rejectionReason;

  // Update in correct table
  if (roleId === 3) await employee.update(updateData, { where: { id: userId } });
  else if (roleId === 2) await roleData.update(updateData, { where: { userId } });
  else await users.update(updateData, { where: { id: userId } });

  // Notification message
  const notificationStatus = status === "approved" ? "Goedgekeurd" : "Afgewezen";
  const notificationBody =
    status === "approved"
      ? "Uw beroep is goedgekeurd. Uw account is hersteld."
      : `Uw beroep is afgewezen. ${rejectionReason || "Geen verdere uitleg beschikbaar."}`;

  // Create notification (fail gracefully)
  try {
    await userNotification.create({
      userId,
      adminId,
      content: notificationBody,
      seen: false,
      typeId: status === "approved" ? 1 : 2,
    });
  } catch (error: unknown) {
    console.warn("Failed to create notification in DB:", (error as Error).message);
  }

  // Push notification (fail gracefully)
  const fcmToken = (userExists as any).fcmToken;
  if (fcmToken) {
    try {
      await sendPushNotification(fcmToken, `Appeal ${notificationStatus}`, notificationBody, "");
    } catch (error: unknown) {
      console.warn(`Failed to send push notification to userId=${userId}:`, (error as Error).message);
    }
  }

  const entityType = roleId === 2 ? "Company" : roleId === 3 ? "Employee" : "User";
  const entityId = roleId === 2 ? "companyId" : roleId === 3 ? "employeeId" : "userId";

  return {
    [entityId]: userId,
    roleId: roleId || (userExists as any).roleId,
    entityType,
    status,
    statusText: status === "approved" ? "Approved" : "Rejected",
    adminId,
    rejectionReason: status === "rejected" ? rejectionReason : null,
    processedAt: new Date(),
  };
};




}

const generateOTP = () => {
  return (Math.floor(Math.random() * 900000) + 100000).toString().slice(-6);
};

const isWithinTimeLimit = (timestamp: any, minutes: any) => {
  const expirationTime = new Date(timestamp);
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  return new Date() < expirationTime;
};

const calculateRemainingTime = (timestamp: any, minutes: any) => {
  const expirationTime: any = new Date(timestamp);
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  const nowTime: any = new Date();
  const remainingTime: any = expirationTime - nowTime;

  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
  const minutesLeft = Math.floor(
    (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${minutesLeft} minute(s) and ${seconds} second(s)`;
};
