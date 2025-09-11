import { sequelize } from "@src/config/database";
import {
  duplicateData,
  employee,
  forumCategory,
  forumSubCategory,
  notifications,
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
  public getAllNotification = async (data: any): Promise<any> => {
    const { typeId } = data;
    console.log("typeId", typeId);

    const numericTypeId = Number(typeId);

    if (![1, 4, 5, 6, 7].includes(numericTypeId)) {
      throw new Error("Ongeldige status-ID.");
    }

    const statusId =
      numericTypeId === 1 ? { [Op.in]: [1, 2, 3] } : numericTypeId;

    const res: any = await notifications.findAndCountAll({
      where: { seen: false, typeId: statusId },
      order: [["createdAt", "desc"]],
      attributes: {
        exclude: [
          "deletedBy",
          "updatedAt",
          "updatedBy",
          "deletedAt",
          "seen",
          "contentDE",
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
        },
        {
          as: "users",
          model: users,
          attributes: ["id", "roleId", "name"],
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

  public updateNotification = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const {
      notificationId,
      userId,
      typeId,
      profileStatus,
      adminId,
      rejectionReason,
      empCompanyId,
    } = data;

    const isApproved = profileStatus === 3;
    const statusKey = isApproved ? 1 : 2;
    const isApprovedStatus = isApproved ? true : false;
    const approvedByField = isApproved ? 'approvedBy' : "rejectedBy";
    const approvedOnField = isApproved ? 'approvedOn' : "rejectedOn";
    const sendToId = isApproved ? empCompanyId : userId;
    const notificationStatus = isApproved ? "Goedgekeurd" : "Afgewezen";
    const notificationbody = isApproved ? "Uw account is succesvol goedgekeurd." : `Uw account is afgewezen vanwege ${rejectionReason}`;
    const statusValue = isApproved ? "approved" : "decline";
    var userName: string = "";
    var userData: any;
    // const userNotificationTypeId = isApproved ? 1 : 2;

    // Update notification status
    await notifications.update(
      { seen: true, StatusKey: statusKey, Status: statusValue },
      { where: { id: notificationId }, transaction }
    );

    // Update profile status based on typeId
    const updateData = { profileStatus };

    if (typeId === 1 || typeId === 3) {
      userData = await users.findOne({
        where: { id: userId }, attributes: ['fcmToken', "email", "name"], include: [{
          as: "roleData",
          model: roleData,
          attributes: ["companyName", "firstName", "lastName"]
        }]
      })
      if (userData.roleData.companyName) {
        userName = userData.roleData.companyName
      } else {
        userName = `${userData.roleData.firstName} ${userData.roleData.lastName}`
      }

      await users.update(updateData, {
        where: {
          id: userId,
          rejectionReason: rejectionReason ? rejectionReason : "",
        },
        transaction,
      });

      await roleData.update(
        { isApproved: isApprovedStatus },
        { where: { userId: userId }, transaction }
      );

      await userLog.create(
        {
          userId: userId,
          isApproved: profileStatus == 3 ? true : false,
          rejectedReason: rejectionReason ? rejectionReason : "",
          [approvedByField]: adminId,
          [approvedOnField]: new Date(),
        },
        { transaction }
      );
    } else if (typeId === 2) {
      userData = await employee.findOne({
        where: { id: userId }, attributes: ['fcmToken', 'firstName', 'lastName', "email"], include: [{
          as: "users", model: users, attributes: ["fcmToken"]
        }]

      })
      userName = `${userData.firstName} ${userData.lastName}`
      const notificationbodyEmp = isApproved ? "Uw account is succesvol goedgekeurd." : `Employee ( ${userData.firstName} ${userData.lastName} ) wordt afgewezen vanwege ${rejectionReason}.`;

      await employee.update(
        {
          ...updateData,
          isApproved: isApprovedStatus,
          rejectionReason: rejectionReason ? rejectionReason : "",
        },
        { where: { id: userId }, transaction }
      );
      const pushRes: any = await sendPushNotification(
        userData.users.fcmToken,
        notificationStatus || "Test Notification",
        notificationbodyEmp || "This is a test message, Take care.",
        ""
      );

      // if (pushRes) {
      // await pushNotification.create({
      //   sendBy: adminId,
      //   title: notificationStatus,
      //   body: notificationbody,
      //   sendTo: sendToId,
      //   isSendToAll: false,
      //   // image: null,
      // });
      return;
    }

    if (userData.fcmToken) {
      const pushRes: any = await sendPushNotification(
        userData.fcmToken,
        notificationStatus || "Test Notification",
        notificationbody || "This is a test message, Take care.",
        ""
      );

      // if (pushRes) {
      // await pushNotification.create({
      //   sendBy: adminId,
      //   title: notificationStatus,
      //   body: notificationbody,
      //   sendTo: sendToId,
      //   isSendToAll: false,
      //   // image: null,
      // });

      var emailHtml: any;
      var subject: any;
      if (isApproved) {
        emailHtml = getProcessedTemplate("approved_by_admin", { username: userName });
        subject = 'Profiel goedgekeurd.';
      } else {
        emailHtml = getProcessedTemplate("rejected_by admin", { username: userName, reason: rejectionReason });
        subject = 'Profiel afgewezen.';

      }

      const isEmailSend: any = await sendEmail({
        from: String(process.env.EMAIL),
        to: userData.email,
        subject: subject,
        html: emailHtml, // Use processed HTML
      });

      if (!isEmailSend) {
        throw new Error("Fout bij het verzenden van een e-mail.")
      }
    }


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

  public viewPreviousNotification = async (data: any): Promise<any> => {
    const res: any = await notifications.findAndCountAll({
      where: { seen: true, StatusKey: 1 },
      order: [["createdAt", "desc"]],
      attributes: {
        exclude: [
          "deletedBy",
          "updatedAt",
          "updatedBy",
          "deletedAt",
          "seen",
          "contentDE",
        ],
      },
      include: [
        {
          as: "report",
          model: report,
          attributes: ["reportedThreadId", "reportedP_ThreadId", "problem"],
        },
        {
          as: "users",
          model: users,
          attributes: ["id", "roleId", "name"],
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
        },
      ],
    });
    return res;
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
