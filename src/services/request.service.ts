import { sequelize } from "@src/config/database";
import {
  admin,
  adminLog,
  duplicateData,
  employee,
  notifications,
  pushNotification,
  roleData,
  userLog,
  userNotification,
  users,
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { getProcessedTemplate } from "@src/utils/renderEmailTemplate";
import { sendEmail } from "@src/utils/sendEmail";
import { Op, Sequelize, Transaction } from "sequelize";
const AWS = require('aws-sdk');


export class RequestService {
  public getAllPendingRequest = async (data: any): Promise<any> => {
    const { roleId, filters, isActive, limit, offset } = data;
    let whereClause: any = {};
    let profileStatus: any;
    var userData: any;

    if (filters?.name) {
      whereClause = {
        [Op.or]: [
          { firstName: { [Op.like]: `%${filters.name}%` } },
          { lastName: { [Op.like]: `%${filters.name}%` } },
          { companyName: { [Op.like]: `%${filters.name}%` } },
        ],
      };
    }
    isActive ? (profileStatus = 2) : (profileStatus = 4);

    const companyCount = await users.count({
      where: { roleId: 2, profileStatus: profileStatus },
    });
    const freelancerCount = await users.count({
      where: { roleId: 1, profileStatus: profileStatus },
    });
    const employeeCount = await employee.count({
      where: { profileStatus: profileStatus },
    });

    const updateReqWhereClause =
      roleId === 3
        ? { employeeId: { [Op.not]: null } } // Fetch employee data
        : { userId: { [Op.not]: null } }; // Fetch user data for roleId 1 or 2

    const updateReqCount = await duplicateData.count({
      where: updateReqWhereClause,
    })

    const excludeFirstEmployeeSubQuery = Sequelize.literal(`
  SELECT MIN(e2.id)
  FROM employee AS e2
  WHERE e2.userId = employee.userId
`);

    switch (roleId) {
      case 1:
        userData = await users.findAndCountAll({
          where: { roleId: 1, profileStatus: profileStatus, },
          order: [["createdAt", "DESC"]],
          limit: limit,
          offset: offset * limit,
          attributes: [
            "id",
            "name",
            "email",
            "roleId",
            "phone",
            "emailVerified",
            "updatedAt",
            "rejectionReason",
            "rejectedBy",
          ],
          include: [
            {
              as: "roleData",
              model: roleData,
              where: whereClause,
              attributes: ["id", "firstName", "lastName", "title", "profile", "updatedAt", "currentSituationId"],
            },
            {
              as: "admin",
              model: admin,
              attributes: ["id", "name", "adminRoleId"],
            },
          ],
        });
        break;
      case 2:
        userData = await users.findAndCountAll({
          where: { roleId: 2, profileStatus: profileStatus },
          order: [["createdAt", "DESC"]],
          limit: limit,
          offset: offset * limit,
          attributes: [
            "id",
            "name",
            "email",
            "roleId",
            "phone",
            "emailVerified",
            "updatedAt",
            "rejectionReason",
            "rejectedBy"
          ],
          include: [
            {
              as: "roleData",
              model: roleData,
              where: whereClause,
              attributes: [
                "id",
                "companyName",
                "chamberCommerceNumber",
                "profile",
                "updatedAt",
                "currentSituationId"
              ],
            },
            {
              as: "admin",
              model: admin,
              attributes: ["id", "name", "adminRoleId"],
            },
          ],
        });
        break;
      case 3:
        if (whereClause[Op.or]) {
          whereClause[Op.or] = whereClause[Op.or].filter(
            (condition: any) => !condition.companyName
          );
        }
        userData = await employee.findAndCountAll({
          where: {
            profileStatus: profileStatus, ...whereClause,
          },
          order: [["createdAt", "DESC"]],
          limit: limit,
          offset: offset * limit,
          attributes: [
            "id",
            "firstName",
            "lastName",
            "profile",
            "email",
            "phone",
            [Sequelize.literal("3"), "roleId"],
            "updatedAt",
            "rejectionReason",
            "rejectedBy",
            "currentSituationId",
            "currentSituationName"
          ],
          include: [
            {
              as: "admin",
              model: admin,
              attributes: ["id", "name", "adminRoleId"],
            },
          ],
        });
        break;
      default:
        throw new Error("Ongeldige Rol-ID.");
    }

    return { ...userData, companyCount, freelancerCount, employeeCount, updateReqCount }
  };

  public getUserInfo = async (data: any): Promise<any> => {
    const { roleId, userId } = data;
    let userInfo: any;

    switch (roleId) {
      case 1:
        userInfo = await users.findOne({
          where: { id: userId },
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
                "video"
              ],
            },
          ],
        });
        break;
      case 2:
        userInfo = await users.findOne({
          where: { id: userId },
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
        break;
      case 3:
        userInfo = await employee.findOne({
          where: { id: userId },
          attributes: [
            "id",
            "profile",
            "firstName",
            "lastName",
            "currentSituationId",
            "currentSituationName",
            "email",
            "phone",
            "profileStatus",
            "accountStatus",
            [Sequelize.literal("3"), "roleId"],
          ],
        });
        break;
      default:
        throw new Error("Ongeldige Rol-ID.");
    }

    return userInfo;
  };

  public updateRequestStatus = async (data: any): Promise<any> => {
    const { roleId, profileStatus, userId, rejectionReason, adminId, empCompanyId } = data;
    const reason = rejectionReason || null;
    var userData: any;
    const isApprovedValue = profileStatus == 3 ? true : false;
    const isApproved = profileStatus === 3;
    var userName: string;
    const notificationStatus = isApproved ? "Goedgekeurd" : "Afgewezen";
    // const sendToId = isApproved ? empCompanyId : userId;
    const sendToId = userId;
    const notificationbody = isApproved ? "Uw account is succesvol goedgekeurd." : `Uw account is afgewezen vanwege ${rejectionReason}.`;

    if ([1, 2].includes(roleId)) {
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
      // Update for roleId 1 and 2
      await users.update(
        { profileStatus, rejectionReason: reason },
        { where: { roleId, id: userId } }
      );
      await roleData.update(
        { isApproved: isApprovedValue },
        { where: { userId: userId } }
      );

      if (isApprovedValue) {
        const userInfo: any = await roleData.findOne({ where: { userId: userId }, attributes: ['videoKey'], raw: true })
        if (userInfo.videoKey) {
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

          const isDelete = await s3.deleteObject(params).promise();

          if (!isDelete) {
            throw new Error("Fout bij het verwijderen van de video");
          }
          console.log(`Video deleted successfully`);
          await roleData.update(
            { video: "" },
            { where: { userId: userId } }
          );
        }

        await userLog.create(
          {
            userId: userId,
            isApproved: profileStatus == 3 ? true : false,
            rejectedReason: rejectionReason ? rejectionReason : "",
            approvedBy: adminId,
            approvedOn: new Date(),
          },
        );

        const pushRes: any = await sendPushNotification(
          userData.fcmToken,
          notificationStatus || "Test Notification",
          notificationbody || "This is a test message, Take care.",
          ""
        );
        let employeeData = await employee.findOne({ where: { userId } });

        if (!employeeData) {
          console.log("No employee found for userId:", userId);
        } else {
          employeeData.profileStatus = 3;
          await employeeData.save();
          console.log("Profile status updated to 3 for employee:", employeeData.id);
        }
      } else {

        await users.update(
          { profileStatus, rejectionReason: reason, rejectedBy: adminId },
          { where: { roleId, id: userId } }
        );

        await userLog.create(
          {
            userId: userId,
            isApproved: profileStatus == 3 ? true : false,
            rejectedReason: rejectionReason ? rejectionReason : "",
            rejectedBy: adminId,
            rejectedOn: new Date(),
          },
        );

        const pushRes: any = await sendPushNotification(
          userData.fcmToken,
          notificationStatus || "Test Notification",
          notificationbody || "This is a test message, Take care.",
          ""
        );
        let employeeData = await employee.findOne({ where: { userId } });

        if (!employeeData) {
          console.log("No employee found for userId:", userId);
        } else {
          employeeData.profileStatus = 4;
          await employeeData.save();
          console.log("Profile status updated to 3 for employee:", employeeData.id);
        }
      }


    } else if (roleId === 3) {
      // Update for employee
      userData = await employee.findOne({
        where: { id: userId }, attributes: ["fcmToken", "firstName", "lastName", "email"], include: [{
          as: "users",
          model: users,
          attributes: ["id", "fcmToken"]
        }]
      })

      userName = `${userData.firstName} ${userData.lastName}`

      const notificationbodyEmp = isApproved ? "Uw account is succesvol goedgekeurd." : `Employee ( ${userData.firstName} ${userData.lastName} ) wordt afgewezen vanwege ${rejectionReason}.`;


      await employee.update(
        { profileStatus, rejectionReason: reason, isApproved: isApprovedValue, rejectedBy: adminId },
        { where: { id: userId } }
      );
      if (isApprovedValue) {
        await userLog.create(
          {
            employeeId: userId,
            isApproved: profileStatus == 3 ? true : false,
            rejectedReason: rejectionReason ? rejectionReason : "",
            approvedBy: adminId,
            approvedOn: new Date(),
          },
        );

        const pushRes: any = await sendPushNotification(
          userData.fcmToken,
          notificationStatus || "Test Notification",
          notificationbodyEmp || "This is a test message, Take care.",
          ""
        );

        // if (pushRes) {
        // await pushNotification.create({
        //   sendBy: adminId,
        //   title: notificationStatus,
        //   body: notificationbodyEmp,
        //   sendTo: empCompanyId,
        //   isSendToAll: false,
        //   // image: null,
        // });

      } else {
        await userLog.create(
          {
            employeeId: userId,
            isApproved: profileStatus == 3 ? true : false,
            rejectedReason: rejectionReason ? rejectionReason : "",
            rejectedBy: adminId,
            rejectedOn: new Date(),
          },
        );

        const pushRes: any = await sendPushNotification(
          userData.users.fcmToken,
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
      }
    } else {
      throw new Error("Ongeldige rol-ID.");
    }

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
  };

  public viewProfileUpdatingRequest = async (data: any): Promise<any> => {
    const { roleId } = data;

    // Define include conditionally based on roleId
    const includeCondition: any =
      roleId === 3
        ? [
          {
            as: "employee",
            model: employee,
            attributes: [
              "id",
              "firstName",
              "lastName",
              "currentSituationId",
              "currentSituationName",
              "currentSituationValue",
              "profile",
              "phone",
              [Sequelize.literal("3"), "roleId"], // Set roleId explicitly for employees
            ],
          },
        ]
        : [
          {
            as: "users",
            model: users,
            where: { roleId }, // Fetch based on roleId 1 or 2
            attributes: ["id", "name", "roleId", "phone"],
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
                  "chamberCommerceNumber",
                  "industryId",
                  "currentSituationId",
                  "CurrentSituationValue",
                  "streetName",
                  "houseName",
                  "postalCode",
                  "province",
                  "website",
                  "industryId",
                  "about",
                  "city"
                ],
              },
            ],
          },
        ];

    // Add where clause to filter records based on roleId and userId/empId
    const whereClause =
      roleId === 3
        ? { employeeId: { [Op.not]: null } } // Fetch employee data
        : { userId: { [Op.not]: null } }; // Fetch user data for roleId 1 or 2

    const res = await duplicateData.findAndCountAll({
      attributes: ["id", "userId", "employeeId", "createdAt"], // Include both userId and empId
      where: whereClause,
      order: [["createdAt", "DESC"]], // Ensure only relevant records are fetched
      include: includeCondition,
    });

    // Enhance rows with warnings and additional fields
    const enhancedRows = await Promise.all(
      res.rows.map(async (request: any) => {
        let warnings = { total: 0, mute: 0, suspend: 0 };
        let phone = null;
        let chamberCommerceNumber = null;

        if (request.users) {
          // For freelancers and companies
          const warningCounts = await userLog.findAll({
            where: { userId: request.users.id },
            attributes: [
              [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
              [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
            ],
            raw: true
          });

          const warningData: any = warningCounts[0] || { muteCount: 0, suspendCount: 0 };
          const muteCount = parseInt(warningData.muteCount) || 0;
          const suspendCount = parseInt(warningData.suspendCount) || 0;

          warnings = {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount
          };

          phone = request.users.phone;
          chamberCommerceNumber = request.users.roleData?.chamberCommerceNumber || null;
        } else if (request.employee) {
          // For employees
          const warningCounts = await userLog.findAll({
            where: { employeeId: request.employee.id },
            attributes: [
              [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isMuted = true THEN 1 END')), 'muteCount'],
              [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN isSuspend = true THEN 1 END')), 'suspendCount']
            ],
            raw: true
          });

          const warningData: any = warningCounts[0] || { muteCount: 0, suspendCount: 0 };
          const muteCount = parseInt(warningData.muteCount) || 0;
          const suspendCount = parseInt(warningData.suspendCount) || 0;

          warnings = {
            total: muteCount + suspendCount,
            mute: muteCount,
            suspend: suspendCount
          };

          phone = request.employee.phone;
        }

        return {
          ...request.toJSON(),
          submittedAt: request.createdAt,
          phone,
          chamberCommerceNumber,
          warnings
        };
      })
    );

    return {
      count: res.count,
      rows: enhancedRows
    };
  };

  public getUpdateReqInfo = async (data: any): Promise<any> => {
  const { id, roleId, userId } = data;

  // Define attributes based on roleId
  let attributeData: any;
  const includeCondition: any = [];

  switch (roleId) {
    case 1:
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
        "chamberCommerceNumber",
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
        "hourlyRate",
        "currentSituationId",
        "firstName",
        "lastName",
        "dob",
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
      attributeData = [
        "id",
        "profile",
        "firstName",
        "lastName",
        "currentSituationId",
        "currentSituationName",
        "phone",
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

  // Build where clause based on whether id and userId are provided
  const whereClause: any = {};
  if (id) {
    whereClause.id = id;
  }
  if (userId) {
    if (roleId === 3) {
      whereClause.employeeId = userId; // fix applied for roleId 3
    } else {
      whereClause.userId = userId;
    }
  }

  const res: any = await duplicateData.findOne({
    where: whereClause,
    attributes: attributeData,
    include: includeCondition,
  });

  if (!res) {
    throw new Error("Opname niet gevonden");
  }

  // For roleId 3, fetch previous data from employee table, updated from duplicateData
  let previousData: any;
  let updatedData: any;

  if (roleId === 3) {
    // Get the current employee data (previousData)
    previousData = res.employee ? res.employee.get() : null;
    
    // Get the updated data from duplicateData (updatedData)
    // Filter out metadata fields and only include the actual data fields
    const duplicateDataValues = res.get();
    updatedData = {} as any;
    
    // Only include the fields that are in attributeData (the fields we care about)
    attributeData.forEach((field: string) => {
      if (duplicateDataValues[field] !== undefined) {
        updatedData[field] = duplicateDataValues[field];
      }
    });
  } else {
    previousData = res?.users?.get() || null;

    updatedData = {
      id: res.id,
      name: res?.users?.name || null,
      email: res?.users?.email || null,
      roleData: res.get(),
    };
  }

  return {
    previousData,
    updatedData,
  };
};


  public updateProfileUpdateReq = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { adminId, id, userId, roleId, statusId, rejectionReason } = data;

    // Auto-fetch duplicateData ID if not provided
    let duplicateDataId = id;
    if (!duplicateDataId) {
      const whereClause: any = {};
      if (roleId === 3) {
        whereClause.employeeId = userId;
      } else {
        whereClause.userId = userId;
      }
      
      const duplicateRecord = await duplicateData.findOne({
        where: whereClause,
        attributes: ['id'],
        order: [['createdAt', 'DESC']] // Get the most recent request
      });
      
      if (!duplicateRecord) {
        throw new Error("No profile update request found for this user");
      }
      
      duplicateDataId = duplicateRecord.id;
    }

    // Attribute selection based on roleId
    const attributeMap: Record<number, string[]> = {
      1: [
        "profile",
        "industryId",
        "industryName",
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
      ],
      2: [
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
        "industryName",
        "about",
        "currentSituationId",
        "hourlyRate"
      ],
      3: ["profile", "firstName", "lastName", "currentSituationId", "currentSituationName"],
    };

    const attributeData = attributeMap[roleId];
    if (!attributeData) throw new Error("Ongeldige rol-ID");

    // Fetch duplicate data and filter out null values
    const allDupData: any = await duplicateData.findOne({
      where: { id: duplicateDataId },
      attributes: attributeData,
    });
    if (!allDupData) {
      throw new Error("Ongeldige identiteitskaart.");
    }

    const filteredData: any = Object.fromEntries(
      Object.entries(allDupData.dataValues).filter(
        ([_, value]) => value != null
      )
    );

    if (
      filteredData.languageId &&
      typeof filteredData.languageId === "string"
    ) {
      filteredData.languageId = JSON.parse(filteredData.languageId);
    }

    if (
      filteredData.industryId &&
      typeof filteredData.industryId === "string"
    ) {
      filteredData.industryId = JSON.parse(filteredData.industryId);
      filteredData.industryName = JSON.parse(filteredData.industryName);
    }

    console.log("allDupData", allDupData);

    console.log("filterData", filteredData);

    if (statusId === 1) {
      // Select model and where clause dynamically
      const modelToUpdate: any = roleId === 3 ? employee : roleData;
      const whereClause: any = roleId === 3 ? { id: userId } : { userId };

      // Update data
      await modelToUpdate.update(filteredData, {
        where: whereClause,
        transaction,
      });
    }
    const userNotificationTypeId = statusId == 1 ? 1 : 2;
    const titleValue =
      statusId == 1
        ? "Verzoek goedgekeurd"
        : "Verzoek afgewezen";
    const contentValue =
      statusId == 1
        ? "Uw verzoek tot profielupdate is goedgekeurd"
        : `Uw verzoek om profielupdate is afgewezen${rejectionReason ? ` - Reden: ${rejectionReason}` : ''}`;
    const roleType = roleId == 3 ? "employeeId" : "userId";

    await userNotification.create(
      {
        adminId,
        [roleType]: userId,
        seen: false,
        typeId: userNotificationTypeId,
        content: contentValue,
      },
      { transaction }
    );

    await notifications.update(
      { seen: true },
      {
        where: { seen: false, [roleType]: userId },
        transaction,
      }
    );
    var userData: any;

    // Update profileStatus based on approval/rejection
    // Set profileStatus to 3 for both approved (statusId === 1) and rejected (statusId === 2) requests
    const newProfileStatus = statusId === 1 || statusId === 2 ? 3 : null; // 3 = Approved/Rejected, null = don't change
    
    if (roleId == 1 || roleId == 2) {
      const updateData: any = {};
      if (newProfileStatus !== null) {
        updateData.profileStatus = newProfileStatus;
      }
      if (statusId === 2 && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      // Only update if there's data to update
      if (Object.keys(updateData).length > 0) {
        await users.update(updateData, { where: { id: userId }, transaction })
      }
      userData = await users.findOne({ where: { id: userId, roleId: roleId }, attributes: ["fcmToken"] })
    } else {
      const updateData: any = {};
      if (newProfileStatus !== null) {
        updateData.profileStatus = newProfileStatus;
      }
      if (statusId === 2 && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      // Only update if there's data to update
      if (Object.keys(updateData).length > 0) {
        await employee.update(updateData, { where: { id: userId }, transaction })
      }
      userData = await employee.findOne({ where: { id: userId }, attributes: ["fcmToken"] })
    }

    // Log admin activity
    const activityDescription = statusId === 1 
      ? `Approved profile update request for user ID ${userId}` 
      : `Rejected profile update request for user ID ${userId}${rejectionReason ? ` - Reason: ${rejectionReason}` : ''}`;
    
    await adminLog.create({
      adminId,
      suspendReason: activityDescription,
      isSuspend: false, // This is not a suspension, just activity logging
    }, { transaction });

    const pushRes: any = await sendPushNotification(
      userData.fcmToken,
      titleValue || "Test Notification",
      contentValue || "This is a test message, Take care.",
      ''
    );

    // await pushNotification.create({
    //   sendBy: adminId,
    //   title: titleValue,
    //   body: contentValue,
    //   sendTo: userId,
    //   isSendToAll: false,
    //   // image: null,
    // });
    // Remove the entry from duplicateData after updating
    await duplicateData.destroy({ where: { id: duplicateDataId }, transaction });
  };
}
