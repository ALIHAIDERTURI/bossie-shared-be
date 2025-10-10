import { sequelize } from "@src/config/database";
import {
  admin,
  duplicateData,
  employee,
  forumCategory,
  forumSubCategory,
  privateMessages,
  privateThreads,
  pushNotification,
  report,
  roleData,
  threads,
  userLog,
  userNotification,
  users,
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { getProcessedTemplate } from "@src/utils/renderEmailTemplate";
import { sendEmail } from "@src/utils/sendEmail";
import { Op, Sequelize, Transaction } from "sequelize";

export class NotificationService {
  
  /**
   * Unified notification creation method
   * Handles all types of notifications in a standardized way
   */
  public createNotification = async (data: {
    userId?: number;
    employeeId?: number;
    adminId?: number;
    typeId: number;
    title: string;
    content: string;
    contentDE?: string;
    isCustom?: boolean;
    metadata?: any;
    reportId?: number;
    threadId?: number;
    privateThreadId?: number;
    pMessageSenderId?: number;
    pMessageRoleId?: number;
    Status?: string;
    StatusKey?: number;
    transaction?: Transaction;
  }): Promise<any> => {
    const {
      userId,
      employeeId,
      adminId,
      typeId,
      title,
      content,
      contentDE,
      isCustom = false,
      metadata,
      reportId,
      threadId,
      privateThreadId,
      pMessageSenderId,
      pMessageRoleId,
      Status,
      StatusKey,
      transaction
    } = data;

    const notificationData: any = {
      userId,
      employeeId,
      adminId,
      typeId,
      title,
      content,
      contentDE,
      isCustom,
      seen: false,
      reportId,
      threadId,
      privateThreadId,
      pMessageSenderId,
      pMessageRoleId,
      Status,
      StatusKey,
      metadata: metadata ? JSON.stringify(metadata) : null,
    };

    return await userNotification.create(notificationData, { transaction });
  };

  /**
   * Helper methods for common notification types
   */
  public createApprovalNotification = async (data: {
    userId?: number;
    employeeId?: number;
    adminId: number;
    title: string;
    content: string;
    transaction?: Transaction;
  }): Promise<any> => {
    return this.createNotification({
      ...data,
      typeId: 1, // Request Approved
      isCustom: false,
    });
  };

  public createRejectionNotification = async (data: {
    userId?: number;
    employeeId?: number;
    adminId: number;
    title: string;
    content: string;
    rejectionReason?: string;
    transaction?: Transaction;
  }): Promise<any> => {
    return this.createNotification({
      ...data,
      typeId: 2, // Request Declined
      isCustom: false,
      metadata: data.rejectionReason ? { rejectionReason: data.rejectionReason } : null,
    });
  };

  public createMessageNotification = async (data: {
    userId?: number;
    employeeId?: number;
    pMessageSenderId: number;
    pMessageRoleId: number;
    content: string;
    message: string;
    transaction?: Transaction;
  }): Promise<any> => {
    return this.createNotification({
      ...data,
      typeId: 3, // New Message
      title: "New Message",
      isCustom: false,
    });
  };

  public createThreadNotification = async (data: {
    userId?: number;
    employeeId?: number;
    threadId: number;
    content: string;
    transaction?: Transaction;
  }): Promise<any> => {
    return this.createNotification({
      ...data,
      typeId: 4, // New Thread
      title: "New Thread",
      isCustom: false,
    });
  };

  public createReportNotification = async (data: {
    userId?: number;
    employeeId?: number;
    reportId: number;
    reportType: number; // 5=User Report, 6=Forum Report, 7=Personal Chat Report
    content: string;
    Status?: string;
    StatusKey?: number;
    transaction?: Transaction;
  }): Promise<any> => {
    const titleMap = {
      5: "User Report",
      6: "Forum Report", 
      7: "Personal Chat Report",
    };

    return this.createNotification({
      ...data,
      typeId: data.reportType,
      title: titleMap[data.reportType as keyof typeof titleMap] || "Report",
      isCustom: false,
    });
  };

  public createProfileUpdateNotification = async (data: {
    userId?: number;
    employeeId?: number;
    adminId: number;
    isApproved: boolean;
    rejectionReason?: string;
    transaction?: Transaction;
  }): Promise<any> => {
    const typeId = data.isApproved ? 8 : 9; // Profile Update Approved/Rejected
    const title = data.isApproved ? "Profile Update Approved" : "Profile Update Rejected";
    const content = data.isApproved 
      ? "Your profile update has been approved."
      : `Your profile update has been rejected.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`;

    return this.createNotification({
      userId: data.userId,
      employeeId: data.employeeId,
      adminId: data.adminId,
      typeId,
      title,
      content,
      isCustom: false,
      metadata: data.rejectionReason ? { rejectionReason: data.rejectionReason } : null,
      transaction: data.transaction,
    });
  };

  public createAccountStatusNotification = async (data: {
    userId?: number;
    employeeId?: number;
    adminId: number;
    action: 'mute' | 'unmute' | 'suspend' | 'unsuspend';
    reason?: string;
    duration?: string;
    transaction?: Transaction;
  }): Promise<any> => {
    const typeIdMap = {
      mute: 10,
      unmute: 11,
      suspend: 12,
      unsuspend: 13,
    };

    const titleMap = {
      mute: "Account Muted",
      unmute: "Account Unmuted", 
      suspend: "Account Suspended",
      unsuspend: "Account Unsuspended",
    };

    const contentMap = {
      mute: `Your account has been muted${data.duration ? ` for ${data.duration}` : ''}${data.reason ? `. Reason: ${data.reason}` : ''}.`,
      unmute: "Your account has been unmuted.",
      suspend: `Your account has been suspended${data.duration ? ` for ${data.duration}` : ''}${data.reason ? `. Reason: ${data.reason}` : ''}.`,
      unsuspend: "Your account has been unsuspended.",
    };

    return this.createNotification({
      userId: data.userId,
      employeeId: data.employeeId,
      adminId: data.adminId,
      typeId: typeIdMap[data.action],
      title: titleMap[data.action],
      content: contentMap[data.action],
      isCustom: false,
      metadata: {
        action: data.action,
        reason: data.reason,
        duration: data.duration,
      },
      transaction: data.transaction,
    });
  };

  public createCustomNotification = async (data: {
    sendBy: number;
    title: string;
    body: string;
    sendTo?: any; // JSON array of user IDs or specific targets
    isSendToAll?: boolean;
    image?: string;
    transaction?: Transaction;
  }): Promise<any> => {
    const { sendBy, title, body, sendTo, isSendToAll = false, image, transaction } = data;

    // Create entry in pushNotification table
    const pushNotifData: any = {
      sendBy,
      title,
      body,
      isSendToAll,
      notificationType: 'admin', // Admin-created notification
    };
    
    if (sendTo) {
      pushNotifData.sendTo = JSON.stringify(sendTo);
    }
    
    if (image) {
      pushNotifData.image = image;
    }

    const pushNotif = await pushNotification.create(pushNotifData, { transaction });

    // For custom admin notifications, we only store in pushNotification table
    // No need to create individual userNotification entries

    return pushNotif;
  };

  /**
   * Create auto-triggered notification (backend system notifications)
   */
  public createAutoNotification = async (data: {
    title: string;
    body: string;
    sendTo?: any; // JSON array of user IDs or specific targets
    isSendToAll?: boolean;
    image?: string;
    transaction?: Transaction;
  }): Promise<any> => {
    const { title, body, sendTo, isSendToAll = false, image, transaction } = data;

    // Create entry in pushNotification table
    const pushNotifData: any = {
      sendBy: 1, // System admin ID for auto notifications
      title,
      body,
      isSendToAll,
      notificationType: 'auto', // Auto-triggered notification
    };
    
    if (sendTo) {
      pushNotifData.sendTo = JSON.stringify(sendTo);
    }
    
    if (image) {
      pushNotifData.image = image;
    }

    const pushNotif = await pushNotification.create(pushNotifData, { transaction });

    // If sending to specific users, also create userNotification entries
    if (!isSendToAll && sendTo && Array.isArray(sendTo)) {
      for (const target of sendTo) {
        // Support both UI format { userId, employeeId } and old format { id, roleId }
        // Also preserve roleId and name fields for additional info
        const { userId, employeeId, id, roleId, name } = target;
        
        let notificationUserId, notificationEmployeeId;
        
        if (userId !== undefined || employeeId !== undefined) {
          // UI format: { userId } or { employeeId }
          notificationUserId = userId;
          notificationEmployeeId = employeeId;
        } else {
          // Old format: { id, roleId }
          if (roleId === 3) {
            notificationEmployeeId = id;
          } else {
            notificationUserId = id;
          }
        }
        
        await this.createNotification({
          userId: notificationUserId,
          employeeId: notificationEmployeeId,
          adminId: 1, // System admin ID
          typeId: 14, // Custom Notification
          title,
          content: body,
          isCustom: true,
          metadata: { pushNotificationId: pushNotif.id },
          transaction
        });
      }
    }

    return pushNotif;
  };

  public getNotificationHistory = async (data: {
    adminId?: number;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<any> => {
    const { adminId, limit = 20, offset = 0, search } = data;

    let whereClause: any = {
      deletedAt: null,
      isSendToAll: { [Op.or]: [true, false] } // Include both all users and selected users
    };

    if (adminId) {
      whereClause.sendBy = adminId;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { body: { [Op.like]: `%${search}%` } }
      ];
    }

    const notifications = await pushNotification.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit.toString()),
      offset: parseInt(offset.toString()),
      attributes: {
        exclude: ["deletedAt", "updatedAt"]
      }
    });

    return {
      count: notifications.count,
      rows: notifications.rows.map((notification: any) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        sendBy: notification.sendBy,
        isSendToAll: notification.isSendToAll,
        sendTo: notification.sendTo,
        image: notification.image,
        createdAt: notification.createdAt,
        recipientInfo: notification.isSendToAll 
          ? "All Users" 
          : this.formatRecipientInfo(notification.sendTo)
      }))
    };
  };

  public searchNotifications = async (data: {
    search: string;
    adminId?: number;
    limit?: number;
    offset?: number;
  }): Promise<any> => {
    return this.getNotificationHistory({
      ...data,
      search: data.search
    });
  };

  public resendNotification = async (data: {
    notificationId: number;
    adminId: number;
    transaction?: Transaction;
  }): Promise<any> => {
    const { notificationId, adminId, transaction } = data;

    // Get the original notification
    const originalNotification = await pushNotification.findOne({
      where: { 
        id: notificationId,
        sendBy: adminId, // Ensure admin can only resend their own notifications
        deletedAt: null 
      }
    });

    if (!originalNotification) {
      throw new Error("Notification not found or you don't have permission to resend it");
    }

    const notificationData = originalNotification.get({ plain: true });

    // Parse sendTo if it's a JSON string
    let parsedSendTo = notificationData.sendTo;
    if (typeof notificationData.sendTo === 'string') {
      try {
        parsedSendTo = JSON.parse(notificationData.sendTo);
      } catch (error) {
        console.error("Error parsing sendTo:", error);
      }
    }

    // Re-send the notification using existing sendPushNotifications logic
    const resendData: any = {
      sendBy: adminId,
      title: notificationData.title || "Notification",
      body: notificationData.body || "Notification content",
      sendTo: notificationData.sendTo, // Keep original format for DB
      isSendToAll: notificationData.isSendToAll || false,
      notificationType: notificationData.notificationType || 'admin'
    };

    // Include image if it exists
    if (notificationData.image) {
      resendData.image = notificationData.image;
    }

    // Create a new notification entry
    const newNotification = await pushNotification.create(resendData, { transaction });

    // Send push notifications to users (use parsed sendTo)
    await this.sendPushNotificationsToUsers({
      sendBy: adminId,
      title: resendData.title,
      body: resendData.body,
      sendTo: parsedSendTo, // Use parsed array for sending
      isSendToAll: resendData.isSendToAll,
      image: resendData.image
    });

    return {
      originalNotificationId: notificationId,
      newNotificationId: newNotification.id,
      message: "Notification resent successfully"
    };
  };

  /**
   * Get notification details by ID
   */
  public getNotificationDetails = async (data: {
    notificationId: number;
    adminId?: number;
  }): Promise<any> => {
    const { notificationId, adminId } = data;

    let whereClause: any = {
      id: notificationId,
      deletedAt: null
    };

    if (adminId) {
      whereClause.sendBy = adminId;
    }

    const notification = await pushNotification.findOne({
      where: whereClause,
      include: [
        {
          model: admin,
          as: "admin",
          attributes: ["id", "name", "email"]
        }
      ]
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const notificationData = notification.get({ plain: true });

    return {
      ...notificationData,
      recipientInfo: notificationData.isSendToAll 
        ? "All Users" 
        : this.formatRecipientInfo(notificationData.sendTo)
    };
  };

  /**
   * Helper method to format recipient information
   */
  private formatRecipientInfo = (sendTo: any): string => {
    if (!sendTo) return "All Users";
    
    try {
      const recipients = typeof sendTo === 'string' ? JSON.parse(sendTo) : sendTo;
      if (Array.isArray(recipients)) {
        return `${recipients.length} selected users`;
      }
    } catch (error) {
      console.error("Error parsing sendTo:", error);
    }
    
    return "Selected users";
  };

  /**
   * Helper method to send push notifications to users
   * This replicates the logic from users.service.ts
   */
  private sendPushNotificationsToUsers = async (data: {
    sendBy: number;
    title: string;
    body: string;
    sendTo: any;
    isSendToAll: boolean;
    image?: string;
  }): Promise<void> => {
    const { sendBy, title, body, sendTo, isSendToAll, image } = data;

    let allFcmTokens: string[] = [];

    if (isSendToAll) {
      // Fetch all users and employee data when sending to all
      const UserData: any = await users.findAll({
        attributes: ["fcmToken"],
      });
      const employeeData: any = await employee.findAll({
        attributes: ["fcmToken"],
      });

      // Combine all tokens from users and employees
      allFcmTokens = [
        ...UserData.map((u: any) => u.fcmToken),
        ...employeeData.map((e: any) => e.fcmToken),
      ];
    } else {
      // Handle selected users
      for (const recipient of sendTo) {
        const { id, roleId, userId, employeeId } = recipient;
        
        let targetId, targetRoleId;
        
        if (userId !== undefined) {
          targetId = userId || employeeId;
          targetRoleId = userId ? 1 : 3;
        } else {
          targetId = id;
          targetRoleId = roleId;
        }

        const UserData: any = await users.findAll({
          where: { id: targetId, roleId: targetRoleId },
          attributes: ["fcmToken"],
        });

        if (UserData.length > 0) {
          allFcmTokens.push(...UserData.map((u: any) => u.fcmToken));
        } else {
          const employeeData: any = await employee.findAll({
            where: { id: targetId },
            attributes: ["fcmToken"],
          });

          if (employeeData.length > 0) {
            allFcmTokens.push(...employeeData.map((e: any) => e.fcmToken));
          }
        }
      }
    }

    // Send push notifications
    await Promise.all(
      allFcmTokens.map(async (fcmToken: string) => {
        if (!fcmToken) return;

        try {
          await sendPushNotification(
            fcmToken,
            title || "Test Notification",
            body || "This is a test message, Take care.",
            image || ""
          );
        } catch (error) {
          console.error("Failed to send push notification:", error);
        }
      })
    );
  };

  public getAllNotification = async (data: any): Promise<any> => {
    const { typeId } = data;
    console.log("typeId", typeId);

    const numericTypeId = Number(typeId);

    if (![1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(numericTypeId)) {
      throw new Error("Invalid status ID.");
    }

    const statusId =
      numericTypeId === 1 ? { [Op.in]: [1, 2, 3] } : numericTypeId;

    const res: any = await userNotification.findAndCountAll({
      where: { seen: false, typeId: statusId },
      order: [["createdAt", "desc"]],
      attributes: {
        exclude: [
          "deletedBy",
          "updatedAt",
          "updatedBy",
          "deletedAt",
          "seen",
        ],
      },
      include: [
        {
          as: "report",
          model: report,
          attributes: [
            "reportedThreadId",
            "reportedP_ThreadId",
            "problem",
            "messageDetail",
          ],
          required: false,
        },
        {
          as: "users",
          model: users,
          attributes: ["id", "roleId", "name"],
          required: false,
        },
        {
          as: "employee",
          model: employee,
          attributes: [
            "id",
            [Sequelize.literal("3"), "roleId"],
            "firstName",
            "lastName",
          ],
          required: false,
        },
        {
          as: "admin",
          model: admin,
          attributes: ["id", "name", "email"],
          required: false,
        },
        {
          as: "threads",
          model: threads,
          attributes: ["id", "title"],
          required: false,
        },
      ],
    });

    if (numericTypeId === 4) {
      for (let i = 0; i < res.rows.length; i++) {
        const notificationInstance = res.rows[i];
        const notification = notificationInstance.get({ plain: true });

        let userId = notification.userId ? notification.userId : null;
        let employeeId = notification.employeeId
          ? notification.employeeId
          : null;

        if (userId || employeeId) {
          // Find the duplicate data based on userId or employeeId
          const dupData: any = await duplicateData.findOne({
            where: {
              employeeId: employeeId,
              userId: userId,
            },
            attributes: ["id"], // Only fetch the 'id' field
          });

          if (dupData) {
            const data = dupData.get({ plain: true });
            const updateReqId = data.id; // Set `updateReqId` only if `dupData` exists
            res.rows[i].setDataValue("updateReqId", updateReqId);
          }
        }

        // Update the instance directly in the `res.rows` with either the found `updateReqId` or null
      }
    }

    return res;
  };


  public getUserReportInfoById = async (data: any): Promise<any> => {
    const { reportId } = data;

    // Fetch report info first
    const reportInfo = await report.findOne({
      where: { id: reportId },
      attributes: {
        exclude: [
          "reportedP_ThreadId",
          "reportedThreadId",
          "updatedAt",
          "deletedAt",
        ],
      },
    });

    if (!reportInfo) {
      return null; // Handle the case where the report is not found
    }

    let userInfo = null;

    // Determine the model and attributes based on roleId
    if (reportInfo.roleId == 3) {
      // Employee case
      userInfo = await employee.findOne({
        where: { id: reportInfo.userId },
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
            attributes: ["id", "name", "roleId"],
            include: [
              {
                as: "roleData",
                model: roleData,
                attributes: ["id", "companyName", "profile"],
              },
            ],
          },
        ],
      });
    } else {
      // Users case
      userInfo = await users.findOne({
        where: { id: reportInfo.userId },
        attributes: ["id", "name", "roleId"],
        include: [
          {
            as: "roleData",
            model: roleData,
            attributes: [
              "id",
              "firstName",
              "lastName",
              "companyName",
              "profile",
            ],
          },
        ],
      });
    }

    // Fetch reported user info if reportedRoleId is not 3
    let reportedUserInfo = null;
    if (reportInfo.reportedRoleId !== 3) {
      reportedUserInfo = await users.findOne({
        where: { id: reportInfo.reportedUserId }, // Assuming the correct reported user ID field
        attributes: ["id", "name", "roleId"],
        include: [
          {
            as: "roleData",
            model: roleData,
            attributes: [
              "id",
              "firstName",
              "lastName",
              "companyName",
              "profile",
            ],
          },
        ],
      });
    }

    return {
      reportInfo: reportInfo.get(),
      userInfo,
      reportedUserInfo,
    };
  };

  public getDuplicateDataByUserId = async (data: any): Promise<any> => {
    const { userId, roleId } = data;

    // Define attributes based on roleId
    let attributeData: any;
    let colName: any;
    const includeCondition: any = [];

    switch (roleId) {
      case 1:
        colName = "userId";
        attributeData = [
          "id",
          "profile",
          "industryId",
          "about",
          "firstName",
          "lastName",
          "title",
          "genderId",
          "dob",
          "age",
          "address",
          "educationalAttainmentId",
          "currentSituationId",
          "languageId",
          "hourlyRate",
        ];

        includeCondition.push({
          as: "users",
          model: users,
          attributes: ["id", "name", "email"],
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: attributeData,
            },
          ],
        });
        break;
      case 2:
        colName = "userId";
        attributeData = [
          "id",
          "profile",
          "companyName",
          "streetName",
          "houseName",
          "city",
          "province",
          "postalCode",
          "chamberCommerceNumber",
          "website",
          "industryId",
          "about",
        ];

        includeCondition.push({
          as: "users",
          model: users,
          attributes: ["id", "name", "email"],
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: attributeData,
            },
          ],
        });
        break;

      case 3:
        colName = "employeeId";
        attributeData = [
          "id",
          "profile",
          "firstName",
          "lastName",
          "currentSituationId",
          "currentSituationName",
        ];

        includeCondition.push({
          as: "employee",
          model: employee,
          attributes: attributeData,
        });
        break;

      default:
        throw new Error("Ongeldige rol-ID");
    }

    const res: any = await duplicateData.findOne({
      where: { [colName]: userId },
      attributes: attributeData, // Only necessary attributes from duplicateData
      include: includeCondition, // Include based on roleId
    });

    if (!res) {
      throw new Error("Opname niet gevonden"); // Handle case when res is null
    }
    // Use .get() to convert Sequelize instances to plain objects
    const previousData =
      roleId !== 3 ? res?.users?.get() || null : res.employee;
    const updatedData = res.get();

    const resp: any = {
      previousData,
      updatedData,
    };

    // Remove the `users` property from `updatedData` only if roleId is not 3
    if (roleId !== 3 && resp.updatedData?.users) {
      delete resp.updatedData.users;
    }

    return resp;
  };


  public getNotificationById = async (data: any): Promise<any> => {
    const { userId, roleId } = data;

    const colName = roleId == 3 ? "employeeId" : "userId";
    const rows: any = await userNotification.findAll({
      where: { [colName]: userId, seen: false },
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["deletedAt", "updatedAt"] },
      include: [
        {
          as: 'threads',
          model: threads,
          attributes: { exclude: ["deletedAt", "updatedAt"] },
          include: [
            {
              as: "users",
              model: users,
              attributes: ["name"],
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
                  attributes: ["name"],
                  include: [
                    {
                      as: "roleData",
                      model: roleData,
                      attributes: ["companyName", "firstName", "lastName"],
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
        },
        {
          as: 'privateThreads',
          model: privateThreads,
          attributes: {
            exclude: ["deletedAt", "updatedAt"],
          },
          include: [
            {
              as: "users",
              model: users,
              attributes: ["id", "name", "roleId"],
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
              ],
            },
            {
              as: "toUsers",
              model: users,
              attributes: ["id", "name", "roleId"],
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
              ],
            },
            {
              as: "employee",
              model: employee,
              attributes: [
                "id",
                "firstName",
                "lastName",
                [sequelize.literal("3"), "roleId"],
                "profile",
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
                      attributes: ["companyName", "id"],
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
                [sequelize.literal("3"), "roleId"],
                "profile",
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
                      attributes: ["companyName", "id"],
                    },
                  ],
                },
              ],
            },
            {
              as: "privateMessages",
              model: privateMessages,
              attributes: ["message", "createdAt", "id", "img"],
              limit: 2,
              order: [["createdAt", "desc"]],
            },
          ],

        }
      ]
    });

    const count: any = await userNotification.count({
      where: { [colName]: userId, seen: false },
    });
    return {
      count,
      rows,
    };
  };
}
