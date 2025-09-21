import {
  forumCategory,
  forumSubCategory,
  privateThreads,
  privateMessages,
  roleData,
  threads,
  users,
  like,
  messages,
  employee,
  report,
  notifications,
  userNotification,
  threadLog,
  bannedKeywords
} from "@src/models";
import { globalIo } from "..";
import { Op, Sequelize, Transaction } from "sequelize";
import { sequelize } from "@src/config/database";
const io = require("socket.io");

export class ForumService {
  public createCategory = async (data: any): Promise<any> => {
    const { name } = data;

    const isCategoryExist: any = await forumCategory.findOne({
      where: { name },
    });
    if (isCategoryExist) {
      throw new Error("Categorienaam bestaat al.");
    }
    return await forumCategory.create({ ...data });
  };

  public updateCategory = async (data: any): Promise<any> => {
    const { isMainCategory, id, isDelete, isResume } = data;

    if (isMainCategory) {
      const isCategoryExist: any = await forumCategory.findOne({
        where: { id: id },
      });
      if (!isCategoryExist) {
        throw new Error("Categorie bestaat niet.");
      }

      if (isDelete) {
        isCategoryExist.typeId = 2;
        await isCategoryExist.save();
        await threads.update({ typeId: 2 }, { where: { categoryId: id } })
        await forumSubCategory.update({ typeId: 2 }, { where: { categoryId: id } })
        return;
      }

      if (isResume) {
        isCategoryExist.typeId = 1;
        await isCategoryExist.save();
        await threads.update({ typeId: 1 }, { where: { categoryId: id } })
        await forumSubCategory.update({ typeId: 1 }, { where: { categoryId: id } })
        return;
      }

      isCategoryExist.name = data.name;
      isCategoryExist.description = data.description;
      isCategoryExist.icon = data.icon;
      isCategoryExist.updatedAt = new Date();
      await isCategoryExist.save();

      return await forumCategory.findOne({
        where: { id: id },
      });
    } else {
      const isCategoryExist: any = await forumSubCategory.findOne({
        where: { id: id },
      });
      if (!isCategoryExist) {
        throw new Error("Categorie bestaat niet.");
      }

      if (isDelete) {
        isCategoryExist.typeId = 2;
        await isCategoryExist.save();
        await threads.update({ typeId: 2 }, { where: { subCategoryId: id } })
        return;
      }

      if (isResume) {
        isCategoryExist.typeId = 1;
        await isCategoryExist.save();
        await threads.update({ typeId: 1 }, { where: { subCategoryId: id } })
        return;
      }

      isCategoryExist.name = data.name;
      isCategoryExist.description = data.description;
      isCategoryExist.updatedAt = new Date();
      await isCategoryExist.save();

      return await forumSubCategory.findOne({
        where: { id: id },
      });
    }
  };

  public createSubCategory = async (data: any): Promise<any> => {
    const { categoryId, name } = data;

    const isMainCategoryExist: any = await forumCategory.findOne({
      where: { id: categoryId },
    });
    if (!isMainCategoryExist) {
      throw new Error("Hoofdcategorie-ID is ongeldig.");
    }
    const isCategoryExist: any = await forumSubCategory.findOne({
      where: { name },
    });
    if (isCategoryExist) {
      throw new Error("Categorienaam bestaat al.");
    }
    return await forumSubCategory.create({ ...data });
  };

  public getForumCategoryList = async (): Promise<any> => {
    const forumData: any = await forumCategory.findAndCountAll({
      where: { deletedAt: null },
      attributes: { exclude: ["deletedAt", "updatedAt"] },
      include: [
        {
          as: "forumSubCategory",
          model: forumSubCategory,
          attributes: { exclude: ["deletedAt", "updatedAt"] },
        },
      ],
      distinct: true,
    });
    return forumData;
  };

  public getForumMainCategory = async (): Promise<any> => {
    const forumData: any = await forumCategory.findAndCountAll({
      where: { deletedAt: null },
      attributes: {
        exclude: ["deletedAt", "updatedAt", "createdAt", "description"],
      },
    });
    return forumData;
  };

  public getForumSubCategory = async (data: any): Promise<any> => {
    const { categoryId } = data;
    const forumData: any = await forumSubCategory.findAndCountAll({
      where: { categoryId: categoryId, deletedAt: null },
      attributes: {
        exclude: ["deletedAt", "updatedAt", "description", "createdAt"],
      },
    });
    return forumData;
  };

  public createDiscussion = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { ownerId, title, categoryId, subCategoryId, roleId } = data;

    const isCategoryExist: any = await forumCategory.findOne({
      where: { id: categoryId },
    });
    if (!isCategoryExist) {
      throw new Error("Categorie-ID is ongeldig.");
    }

    const isSubCategoryExist: any = await forumSubCategory.findOne({
      where: { id: subCategoryId, categoryId },
    });
    if (!isSubCategoryExist) {
      throw new Error("Subcategorie-ID is ongeldig.");
    }

    const isExist: any = await threads.findOne({
      where: { title, categoryId, subCategoryId },
    });
    // if (isExist) {
    //   throw new Error("Thread already exist.");
    // }

    const colName = roleId == 3 ? "employeeToLikeId" : "toLikeId";
    var userRes: any, content: any;
    if (roleId !== 3) {
      userRes = await users.findOne({
        where: { id: ownerId },
        attributes: ["id"],
        include: [
          {
            as: "roleData",
            model: roleData,
            attributes: ["id", "firstName", "lastName", "companyName"],
          },
        ],
      });
      if (!userRes) {
        throw new Error("Het is niet toegestaan ​​om discussies aan te maken.")
      }

      const userData = userRes?.roleData?.get();
      console.log("userData", userData);

      content =
        roleId == 1
          ? `${userData?.firstName} ${userData?.lastName} added a new Thread.`
          : `${userData?.companyName} added a new Thread.`;

      console.log("contentIs", content);
    } else {
      userRes = await employee.findOne({
        where: { id: ownerId, accountStatus: 1 },
        attributes: ["id", "firstName", "lastName"],
      });
      if (!userRes) {
        throw new Error("Het is niet toegestaan ​​om discussies aan te maken.")
      }
      const userData = userRes?.get();
      console.log("userData", userData);

      content = `${userData?.firstName} ${userData?.lastName} added a new Thread.`;
    }

    const ownerCol = roleId == 3 ? "ownerEmpId" : "ownerId";
    delete data.ownerId;

    const res: any = await threads.create(
      { ...data, [ownerCol]: ownerId },
      { transaction }
    );

    const allLike: any = await like.findAll({ where: { [colName]: ownerId } });

    await Promise.all(
      allLike.map(async (likeData: any) => {
        // Determine the column name based on whether userWhoLikeId or employeeWhoLikeId is present
        const userId = likeData.userWhoLikeId
          ? likeData.userWhoLikeId
          : likeData.employeeWhoLikeId;
        const notificationCol = likeData.userWhoLikeId
          ? "userId"
          : "employeeId";

        // Create notification for each like
        await userNotification.create(
          {
            threadId: res.id,
            [notificationCol]: userId, // Dynamically set userId or employeeId
            seen: false,
            typeId: 4,
            content: content,
          },
          { transaction }
        );
      })
    );

    globalIo.emit("roomCreated", {
      ownerId: ownerId,
      roomId: res.id,
      roomName: title,
    });

    return;
  };

  public getThreadById = async (data: any): Promise<any> => {
    const { filters, subCategoryId } = data;

    // ******* Sort by *************************

    let orderClause: any = [];
    let whereClause: any = {};

    if (filters?.locked == true || filters?.locked == false) {
      whereClause.locked = filters.locked;
    }

    switch (filters?.sortBy) {
      case "newest":
        orderClause = [["createdAt", "desc"]];
        break;
      case "oldest":
        orderClause = [["createdAt", "asc"]];
        break;
      case "mostPopular":
        orderClause = [
          [
            Sequelize.literal(
              "(SELECT COUNT(*) FROM messages WHERE messages.roomId = threads.id)"
            ),
            "DESC",
          ],
        ];
        break;
      default:
        orderClause = [["createdAt", "desc"]];
        break;
    }

    const allThreads: any = await threads.findAndCountAll({
      where: { subCategoryId, ...whereClause },
      order: orderClause.length ? orderClause : undefined,
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
    });
    return allThreads;
  };

  public deleteThread = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { roomId, userId, roleId } = data;
    const isThread: any = await threads.findOne({ where: { id: roomId } });
    if (!isThread) {
      throw new Error("Onderwerp bestaat niet.");
    }
    const ownerCol = roleId == 3 ? "ownerEmpId" : "ownerId";

    if (isThread?.[ownerCol] !== userId || isThread.roleId !== roleId) {
      throw new Error("Ongeldige Eigenaars-ID.");
    }

    await report.destroy({
      where: { reportedThreadId: roomId },
      transaction,
    });
    await threadLog.destroy({
      where: { threadId: roomId },
      transaction,
    });
    await userNotification.destroy({
      where: { threadId: roomId },
      transaction,
    });
    await threads.destroy({
      where: { id: roomId, [ownerCol]: userId, roleId: roleId },
      transaction,
    });

    await messages.destroy({
      where: { roomId: roomId },
      transaction,
    });
    return;
  };

  public getAllPrivateThreads = async (data: any): Promise<any> => {
    const { userId, filters, roleId } = data;
    let whereClause: any = {};
    let employeeIds: any[] = [];

    if (filters?.name) {
      whereClause.title = { [Op.like]: `%${filters.name}%` };
    }

    // Handle case when roleId is 2 (employees)
    if (roleId == 2) {
      const allEmp: any = await employee.findAll({ where: { userId: userId } });
      employeeIds = allEmp.map((emp: any) => emp.id);
    }
    console.log("Emp Id is", employeeIds);

    // Main query to fetch threads
    const allThreads: any = await privateThreads.findAndCountAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              // Condition for when the user is the sender (either from users or employee)
              {
                [Op.and]: [
                  {
                    [Op.or]: [
                      roleId == 2
                        ? { ownerUserId: { [Op.in]: employeeIds } } // If owner is a user and roleId is 2
                        : { ownerUserId: userId }, // If owner is a user and roleId is not 2
                      roleId == 2
                        ? { ownerEmpId: { [Op.in]: employeeIds } } // If owner is an employee and roleId is 2
                        : { ownerEmpId: userId }, // If owner is an employee and roleId is not 2
                    ],
                  },
                  { roleId: roleId == 2 ? 3 : roleId }, // Match the role of the sender
                ],
              },
              // Condition for when the user is the receiver (either to users or employee)
              {
                [Op.and]: [
                  {
                    [Op.or]: [
                      roleId == 2
                        ? { toUserId: { [Op.in]: employeeIds } } // If receiver is a user and roleId is 2
                        : { toUserId: userId }, // If receiver is a user and roleId is not 2
                      roleId == 2
                        ? { toEmpId: { [Op.in]: employeeIds } } // If receiver is an employee and roleId is 2
                        : { toEmpId: userId }, // If receiver is an employee and roleId is not 2
                    ],
                  },
                  { toRoleId: roleId == 2 ? 3 : roleId }, // Match the role of the receiver
                ],
              },
            ],
          },
          { ...whereClause }, // Additional filters
        ],
      },
      order: [["createdAt", "desc"]],
      attributes: {
        exclude: ["deletedAt", "updatedAt"],
        include: [
          // Subquery for counting unread messages
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM privateMessages AS pm
              WHERE pm.roomId = privateThreads.id
                -- For Employees: If the message is for an employee and the employee is not the sender
              AND (
              (pm.roleId = 3 AND pm.empId !=  :userId )
              -- For Regular Users: If the current user is a regular user and is not the sender
              OR (pm.roleId != 3 AND pm.userId !=  :userId )
            )
                -- Only count unread messages
                AND pm.seen = false
            )`),
            "unreadCount",
          ],
        ],
      },
      replacements: { userId },

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
    });

    return allThreads;
  };

  public readMessage = async (data: any): Promise<any> => {
    const { lastMessageId, userId, roleId } = data;

    const colName = roleId == 3 ? "empId" : "userId";
    const msgData: any = await privateMessages.findOne({
      where: { id: lastMessageId },
    });
    const resData = msgData.get({ plain: true });
    console.log("resDATA", resData);

    const isUpdate = await privateMessages.update(
      { seen: true },
      {
        where: {
          roomId: resData?.roomId, // Match roomId
          // userId: { [Op.ne]: userId },
          // empId: { [Op.ne]: userId },
          [colName]: {
            [Op.ne]: userId, // colName != userId
          },
          // roleId: {
          //   [Op.ne]: roleId, // roleId != roleId
          // },
          id: {
            [Op.lte]: lastMessageId, // id less than or equal to lastMessageId
          },
        },
      }
    );
    console.log("isUpdate", isUpdate);
    
  };

  public getUserDiscussion = async (data: any): Promise<any> => {
    const { filters, userId, roleId } = data;
    let orderClause: any = [];
    switch (filters?.sortBy) {
      case "newest":
        orderClause = [["createdAt", "desc"]];
        break;
      case "oldest":
        orderClause = [["createdAt", "asc"]];
        break;
      case "mostPopular":
        orderClause = [
          [
            Sequelize.literal(
              "(SELECT COUNT(*) FROM messages WHERE messages.roomId = threads.id)"
            ),
            "DESC",
          ],
        ];
        break;
      default:
        orderClause = [["createdAt", "desc"]];
        break;
    }

    const ownerCol = roleId == 3 ? "ownerEmpId" : "ownerId";

    const res: any = await threads.findAndCountAll({
      where: { [ownerCol]: userId, roleId },
      order: orderClause.length ? orderClause : undefined,
      include: [
        {
          as: "forumCategory",
          model: forumCategory,
          attributes: { exclude: ["deletedAt", "updatedAt"] },
        },
        {
          as: "forumSubCategory",
          model: forumSubCategory,
          attributes: { exclude: ["deletedAt", "updatedAt"] },
        },
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
                  attributes: ["companyName", "firstName", "lastName", "profile"],
                },
              ],
            },
          ],
        },
      ],
    });

    const formattedData: any = [];

    for (const discussion of res.rows) {
      const {

        forumCategory,
        forumSubCategory,
        title,
        createdAt,
        locked,
        logo,
        id,
        ownerId,
        ownerEmpId,
        roleId,
        categoryId,
        subCategoryId, description, typeId,
        users,
        employee,
      } = discussion;

      const existingCategory = formattedData.find(
        (item: any) => item.forumCategory.name === forumCategory.name
      );

      if (existingCategory) {
        const existingSubCategory = existingCategory.forumSubCategory.find(
          (subCat: any) => subCat.name === forumSubCategory.name
        );

        if (existingSubCategory) {
          existingSubCategory.threads.push({
            id,
            title,
            createdAt,
            locked,
            logo,
            ownerId,
            ownerEmpId,
            roleId,
            categoryId,
            subCategoryId,
            description,
            typeId,
            users: users
              ? { name: users.name, roleData: users.roleData }
              : null,
            employee: employee
              ? employee
              : null
          }); // Push thread to existing subcategory
        } else {
          console.log("user roleData", users);

          existingCategory.forumSubCategory.push({
            name: forumSubCategory.name,
            description: forumSubCategory.description,
            typeId: forumSubCategory.typeId,
            threads: [
              {
                id,
                title,
                createdAt,
                locked,
                logo,
                ownerId,
                ownerEmpId,
                roleId,
                categoryId,
                subCategoryId,
                description,
                typeId,
                users: users
                  ? { name: users.name, roleData: users.roleData }
                  : null,
                employee: employee
                  ? employee
                  : null
              },
            ], // Create new subcategory with threads array
          });
        }
      } else {
        formattedData.push({
          forumCategory: {
            id: forumCategory?.id,
            name: forumCategory?.name,
            icon: forumCategory?.icon,
            typeId: forumCategory?.typeId,
          },
          forumSubCategory: [
            {
              id: forumSubCategory.id,
              name: forumSubCategory.name,
              description: forumSubCategory.description,
              typeId: forumSubCategory?.typeId,
              threads: [
                {
                  id,
                  title,
                  createdAt,
                  locked,
                  logo,
                  ownerId,
                  ownerEmpId,
                  roleId,
                  categoryId,
                  subCategoryId,
                  description,
                  typeId,
                  users: users
                    ? { name: users.name, roleData: users.roleData }
                    : null,
                  employee: employee
                    ? employee
                    : null
                },
              ],
            },
          ],
        });
      }
    }

    return formattedData;
  };

  public report = async (data: any, transaction: Transaction): Promise<any> => {
    const {
      userId,
      roleId,
      reportedUserId,
      reportedRoleId,
      reportedP_ThreadId,
      reportedThreadId,
      problem,
      statusId,
      messageDetail,
    } = data;

    if (![1, 2, 3].includes(statusId)) {
      throw new Error("Ongeldige status-ID.");
    }

    if (statusId == 1) {
      const isData: any = await report.findOne({
        where: { statusId, userId, roleId, reportedThreadId },
      });
      if (isData) {
        throw new Error("Het rapport in behandeling bestaat al.");
      }
    } else if (statusId == 2) {
      const isData: any = await report.findOne({
        where: {
          statusId,
          userId,
          reportedUserId,
          roleId,
          reportedRoleId,
          reportedP_ThreadId,
        },
      });
      if (isData) {
        throw new Error("Het rapport in behandeling bestaat al.");
      }
    } else if (statusId == 3) {
      const isData: any = await report.findOne({
        where: {
          statusId,
          userId,
          reportedUserId,
          roleId,
          reportedRoleId,
        },
      });
      if (isData) {
        throw new Error("Het rapport in behandeling bestaat al.");
      }
    }

    const reportRes = await report.create({ ...data }, { transaction });

    const userData = await this.getUserData(userId, roleId);
    if (!userData) throw new Error("Gebruiker bestaat niet");

    let reportUserRecord: string;

    if (statusId === 1) {
      const threadData = await threads.findOne({
        where: { id: reportedThreadId },
        attributes: ["title"], // Only fetch the necessary attribute
      });
      reportUserRecord = `Thread (${threadData?.title || "Unknown"})`;
    } else {
      const reportUserData = await this.getUserData(
        reportedUserId,
        reportedRoleId
      );
      if (!reportUserData) throw new Error("Gerapporteerde gebruiker bestaat niet");
      reportUserRecord = this.formatUserRecord(reportUserData, reportedRoleId);
    }

    const userRecord = this.formatUserRecord(userData, roleId);
    const typeId = this.getTypeId(statusId);

    const notificationData: any = {
      reportId: reportRes.id,
      Status: "pending",
      StatusKey: 3,
      content: `${userRecord} is Reporting ${reportUserRecord}`,
      seen: 0,
      typeId, // report notification
    };

    await notifications.create({ ...notificationData }, { transaction });
  };


  // AutoSpam Filtering
  
  public async addBannedKeyword(data: { keyword: string }) {
    const exists = await bannedKeywords.findOne({ where: { keyword: data.keyword } });
    if (exists) {
      throw new Error("Keyword already exists in banned list.");
    }

    const keyword = await bannedKeywords.create({ keyword: data.keyword });
    return keyword;
  }

  public async removeBannedKeyword(data: { id: number }) {
    const deleted = await bannedKeywords.destroy({ where: { id: data.id } });
    if (!deleted) {
      throw new Error("Keyword not found.");
    }
    return { deleted: true };
  }

  public async listBannedKeywords() {
    const keywords = await bannedKeywords.findAll({ attributes: ["id", "keyword"] });
    return keywords;
  }

  public async filterMessages(roomId: number) {
    // Get banned keywords
    const banned = await bannedKeywords.findAll({ attributes: ["keyword"] });
    const bannedList = banned.map((b) => b.keyword.toLowerCase());

    // Fetch messages for the given room
    const allMessages = await messages.findAll({ where: { roomId } });

    // Filter out spammy ones
    const filtered = allMessages.map((msg: any) => {
      const text = msg.message?.toLowerCase() || "";
      const containsBanned = bannedList.some((word) => text.includes(word));

      if (containsBanned) {
        return {
          ...msg.toJSON(),
          message: "⚠️ This message is auto-hidden as it may contain spam or inappropriate content.",
        };
      }

      return msg;
    });

    return filtered;
  }





  public getReportedDiscussions = async (): Promise<any> => {
  const reports = await report.findAll({
    include: [
      {
        as: "threads",
        model: threads,
        attributes: ["id", "title", "description", "createdAt"]
      },
      {
        as: "privateThreads",
        model: privateThreads,
        attributes: ["id", "title", "createdAt"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return reports.map((r: any) => ({
    id: r.id,
    problem: r.problem,
    statusId: r.statusId,
    createdAt: r.createdAt,
    reportedThread: r.reportedThreadId ? r.threads : null,
    reportedPrivateThread: r.reportedP_ThreadId ? r.privateThreads : null,
    reporter: {
      userId: r.userId,
      roleId: r.roleId
    },
    reportedUser: {
      userId: r.reportedUserId,
      roleId: r.reportedRoleId
    },
    messageDetail: r.messageDetail
  }));
};



  public async getAllDiscussions(): Promise<any> {
    const res: any = await threads.findAll({
      include: [
        {
          as: "forumCategory",
          model: forumCategory,
          attributes: ["id", "name", "icon"],
        },
        {
          as: "forumSubCategory",
          model: forumSubCategory,
          attributes: ["id", "name", "description"],
        },
        {
          as: "users",
          model: users,
          attributes: ["id", "name"],
        },
        {
          as: "employee",
          model: employee,
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formattedData: any = [];

    for (const discussion of res) {
      const { forumCategory, forumSubCategory, id, title, createdAt, users, employee } = discussion;

      const existingCategory = formattedData.find(
        (item: any) => item.forumCategory.id === forumCategory.id
      );

      if (existingCategory) {
        const existingSubCategory = existingCategory.forumSubCategory.find(
          (sub: any) => sub.id === forumSubCategory.id
        );

        if (existingSubCategory) {
          existingSubCategory.threads.push({ id, title, createdAt, users, employee });
        } else {
          existingCategory.forumSubCategory.push({
            id: forumSubCategory.id,
            name: forumSubCategory.name,
            description: forumSubCategory.description,
            threads: [{ id, title, createdAt, users, employee }],
          });
        }
      } else {
        formattedData.push({
          forumCategory: { id: forumCategory.id, name: forumCategory.name, icon: forumCategory.icon },
          forumSubCategory: [
            {
              id: forumSubCategory.id,
              name: forumSubCategory.name,
              description: forumSubCategory.description,
              threads: [{ id, title, createdAt, users, employee }],
            },
          ],
        });
      }
    }

    return formattedData;
  }




// Create a new report
 public async createReport(data: any): Promise<any> {
    return await report.create(data);
  }


// Edit Thread Post


  public async editThreadPost(data: any, transaction?: Transaction): Promise<any> {
    const { threadId, title, description, categoryId, subCategoryId, locked, reason } = data;

    // Check if thread exists
    const thread = await threads.findByPk(threadId);
    if (!thread) {
      throw new Error("Thread not found.");
    }

    // Check if category exists
    const category = await forumCategory.findByPk(categoryId);
    if (!category) throw new Error("Category not found.");

    // Check if subcategory exists
    const subCategory = await forumSubCategory.findOne({
      where: { id: subCategoryId, categoryId }
    });
    if (!subCategory) throw new Error("Subcategory not found.");

    // Update thread
    await thread.update({ title, description, categoryId, subCategoryId, locked }, { transaction });

    // Fetch users who participated in messages
    const participantMessages = await messages.findAll({ where: { roomId: threadId } });

    const userIds: Set<number> = new Set();
    const empIds: Set<number> = new Set();

    participantMessages.forEach(msg => {
      if (msg.userId) userIds.add(msg.userId);
      if (msg.empId) empIds.add(msg.empId);
    });

    // TODO: Send notification to thread owner
    const ownerNotificationTargets = thread.roleId === 3 ? [thread.ownerEmpId] : [thread.ownerId];

    // TODO: Send notification to participants
    // Example structure:
    // for (const userId of userIds) sendNotification(userId, `Your thread was edited: ${reason}`);
    // for (const empId of empIds) sendNotification(empId, `A thread you participated in was edited: ${reason}`);

    // TODO: Log audit trail
    // Example: save into a "threadAuditTrail" table with threadId, action, reason, timestamp

    return {
      success: true,
      message: "Thread updated successfully",
      data: { threadId, title, description, categoryId, subCategoryId, locked, reason }
    };
  }







  // Helper functions

  private getUserData = async (userId: number, roleId: number) => {
    if (roleId !== 3) {
      return users.findOne({
        where: { id: userId },
        include: [
          {
            model: roleData,
            as: "roleData",
            attributes: ["companyName", "firstName", "lastName"],
          },
        ],
      });
    } else {
      return employee.findByPk(userId);
    }
  };

  private formatUserRecord = (userData: any, roleId: number) => {
    if (roleId === 1) {
      return `${userData.roleData.firstName} ${userData.roleData.lastName}(Freelancer)`;
    } else if (roleId === 2) {
      return `${userData.roleData.companyName}(Company)`;
    } else {
      return `${userData.firstName} ${userData.lastName}(Employee)`;
    }
  };

  private getTypeId = (statusId: number) => {
    switch (statusId) {
      case 2:
        return 7;
      case 3:
        return 5;
      case 1:
        return 6;
      default:
        return null;
    }
  };




}
