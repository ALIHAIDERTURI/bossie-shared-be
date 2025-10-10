import {
  employee,
  industry,
  like,
  userNotification,
  report,
  roleData,
  users,
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { Op, Sequelize, Transaction, where } from "sequelize";

export class ExploreService {
  public getExplore = async (data: any): Promise<any> => {
    const { filters, userId, limit, offset, roleId } = data;
    let results: any = {};
    let whereClause: any = {};
    let industryFilter: any;

    if (filters?.industryId) {
      const industryConditions = filters.industryId.map((id: number) =>
        Sequelize.literal(`JSON_CONTAINS(roleData.industryId, '${id}', '$')`)
      );
      industryFilter = { [Op.and]: industryConditions };
    }

    if (filters?.name) {
      whereClause = {
        [Op.or]: [
          { firstName: { [Op.like]: `%${filters.name}%` } },
          { lastName: { [Op.like]: `%${filters.name}%` } },
          { companyName: { [Op.like]: `%${filters.name}%` } },
          { title: { [Op.like]: `%${filters.name}%` } },
          { about: { [Op.like]: `%${filters.name}%` } },
          // { industryName: { [Op.contains]: `%${filters.name}%` } },
          Sequelize.literal(`JSON_SEARCH(industryName, 'one', '%${filters.name}%') IS NOT NULL`)

        ],
      };
    }
    const whoLikeCol = roleId === 3 ? "employeeWhoLikeId" : "userWhoLikeId";


    results.freelancer = await users.findAndCountAll({
      where: {
        roleId: 1,
        profileStatus: {
          [Op.ne]: 5, // "not equal" condition
        },
      },
      attributes: [
        "id",
        "name",
        "roleId",
        [
          Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.${whoLikeCol} = ${userId} AND \`like\`.toLikeId = users.id
              )`),
          "like",
        ],
        [
          Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.toLikeId = users.id
              )`),
          "profileLike",
        ],
      ],
      order: [["createdAt", "Desc"]],
      limit: limit,
      offset: limit * offset,
      include: [
        {
          as: "roleData",
          model: roleData,
          attributes: [
            "id",
            "profile",
            "firstName",
            "lastName",
            "title",
            "hourlyRate",
            "address",
            "age",
            "industryId",
            "industryName",
            "currentSituationId",
            "genderId",
            "languageId",
            "accountStatus",
            "about",
            "educationalAttainmentId",
            "chamberCommerceNumber"
            // "currentSituationId",
            // "educationalAttainmentValue",
            // "CurrentSituationValue",
          ],
          where: {
            isApproved: true, // Existing filter
            ...industryFilter, // Existing industry filter
            ...(filters?.name ? whereClause : {}), // Conditional name filter
          },
        },
      ],
    });
    results.company = await users.findAndCountAll({
      where: {
        roleId: 2,
        profileStatus: {
          [Op.ne]: 5, // "not equal" condition
        },
      },
      attributes: [
        "id",
        "name",
        "roleId",
        [
          Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.userWhoLikeId = ${userId} AND \`like\`.toLikeId = users.id
              )`),
          "like",
        ],
        [
          Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.toLikeId = users.id
              )`),
          "profileLike",
        ],
      ],
      order: [["createdAt", "Desc"]],
      limit: limit,
      offset: limit * offset,
      include: [
        {
          as: "roleData",
          model: roleData,
          attributes: [
            "id",
            "profile",
            "companyName",
            "streetName",
            "houseName",
            "city",
            "postalCode",
            "province",
            "industryId",
            "website",
            "educationalAttainmentId",
            "chamberCommerceNumber",
            "accountStatus",
            "about",
          ],
          where: {
            isApproved: true, // Existing filter
            ...industryFilter, // Existing industry filter
            ...(filters?.name ? whereClause : {}), // Conditional name filter
          },
        },
      ],
    });

    if (filters?.roleId) {
      if (filters.roleId == 1) {
        return {
          freelancer: results.freelancer,
          company: {
            count: 0,
            rows: [],
          },
        };
      }
      if (filters.roleId == 2) {
        return {
          freelancer: {
            count: 0,
            rows: [],
          },
          company: results.company,
        };
      }
    }

    return results;
  };

  // public alterLike = async (data: any): Promise<any> => {
  //   const { userId, toLikeId, roleId } = data;
  //   let userRes: any;
  //   if (roleId != 3) {
  //     userRes = await users.findOne({
  //       where: { id: userId, roleId: roleId },
  //     });
  //   } else {
  //     userRes = await employee.findOne({
  //       where: { id: userId },
  //     });
  //   }

  //   if (!userRes) {
  //     throw new Error("userId is invalid");
  //   }
  //   const userRes2: any = await users.findOne({ where: { id: toLikeId } });
  //   if (!userRes2) {
  //     throw new Error("toLikeId is invalid");
  //   }
  //   const isExist: any = await like.findOne({
  //     where: { userWhoLikeId: userId, toLikeId: toLikeId, roleId: roleId },
  //   });

  //   if (!isExist) {
  //     await like.create({
  //       userWhoLikeId: userId,
  //       toLikeId: toLikeId,
  //       roleId: roleId,
  //     });
  //   } else {
  //     await like.destroy({
  //       where: { userWhoLikeId: userId, toLikeId: toLikeId, roleId: roleId },
  //     });
  //   }
  //   return;
  // };

  public alterLike = async (data: any): Promise<any> => {

    const { userId, toLikeId, roleId, toRoleId } = data;
    var username: any;

    // Determine if userId belongs to a user or employee
    let userRes: any;
    if (roleId === 3) {
      userRes = await employee.findOne({ where: { id: userId } });
    } else {
      userRes = await users.findOne({
        where: { id: userId, roleId: roleId }, include: [
          {
            as: "roleData",
            model: roleData,
            attributes: ["id", "companyName", "firstName", "lastName"]
          }
        ]
      });


    }

    if (!userRes) {
      throw new Error("gebruikers-ID is ongeldig");
    }

    if (roleId == 3) {
      username = `${userRes.firstName}  ${userRes.lastName}`
    } else {
      username = roleId == 2 ? `${userRes.roleData?.companyName}` : `${userRes.roleData?.firstName}  ${userRes.roleData?.lastName}`
    }

    // Determine if toLikeId belongs to a user or employee
    let toLikeRes: any;
    if (toRoleId === 3) {
      toLikeRes = await employee.findOne({ where: { id: toLikeId } });
    } else {
      toLikeRes = await users.findOne({
        where: { id: toLikeId }
      });
    }

    if (!toLikeRes) {
      throw new Error("toLikeId is ongeldig");
    }

    console.log("before like condition");

    // Check if the like already exists
    const isExist: any = await like.findOne({
      where: {
        [Op.and]: [
          // Match based on the role of the person who likes
          roleId === 3
            ? { employeeWhoLikeId: userId }
            : { userWhoLikeId: userId },

          // Match based on the role of the person being liked
          toRoleId === 3
            ? { employeeToLikeId: toLikeId }
            : { toLikeId: toLikeId },

          // Match both roles
          { roleId },
          { toRoleId },
        ],
      },
    });

    if (!isExist) {
      console.log("here");

      await like.create({
        userWhoLikeId: roleId !== 3 ? userId : null,
        employeeWhoLikeId: roleId === 3 ? userId : null,
        toLikeId: toRoleId !== 3 ? toLikeId : null,
        employeeToLikeId: toRoleId === 3 ? toLikeId : null,
        roleId,
        toRoleId,
      });

      const pushRes: any = await sendPushNotification(
        toLikeRes.fcmToken,
        "Nieuw Vind ik leuk",
        `${username} heeft je profiel leuk gevonden`,
        ""
      );


    } else {
      await like.destroy({
        where: {
          [Op.and]: [
            roleId === 3
              ? { employeeWhoLikeId: userId }
              : { userWhoLikeId: userId },

            toRoleId === 3
              ? { employeeToLikeId: toLikeId }
              : { toLikeId: toLikeId },

            { roleId },
            { toRoleId },
          ],
        },
      });
    }

    return;
  };

  public getProfileById = async (data: any): Promise<any> => {
    const { userId, profileId } = data;
    let response: any;
    const res: any = await users.findOne({ where: { id: userId } });
    //freelancer
    if (res.roleId == 1) {
      response = await roleData.findOne({
        where: { userId: userId },
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.userWhoLikeId = ${userId} AND \`like\`.toLikeId = ${profileId}
              )`),
              "like",
            ],
            [Sequelize.literal(`'freelancer'`), "roleName"],
          ],
          exclude: [
            "companyName",
            "streetName",
            "houseName",
            "city",
            "province",
            "postalCode",
            "chamberCommerceNumber",
            "website",
            "updatedAt",
            "deletedAt",
          ],
        },
      });
    }
    //Company
    if (res.roleId == 2) {
      response = await roleData.findOne({
        where: { userId: userId },
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT CASE 
                  WHEN COUNT(*) > 0 THEN true 
                  ELSE false 
                END 
                FROM \`like\` 
                WHERE \`like\`.userWhoLikeId = ${userId} AND \`like\`.toLikeId = ${profileId}
              )`),
              "like",
            ],
            [Sequelize.literal(`'company'`), "roleName"],
          ],
          exclude: [
            "firstName",
            "lastName",
            "title",
            "genderId",
            "dob",
            "age",
            "address",
            "educationalAttainmentId",
            "currentSituationId",
            "hourlyRate",
            "languageId",
            "updatedAt",
            "deletedAt",
          ],
        },
      });
    }

    return response;
  };

  public reportUser = async (
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, roleId, reportedUserId, reportedRoleId, problem } = data;
    let userData: any;
    let userRecord: any;
    let reportUserRecord: any;

    const reportRes: any = await report.create({ ...data }, { transaction });

    if (roleId != 3) {
      userData = await users.findOne({
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
      userData = await employee.findByPk(userId);
    }

    if (!userData) {
      throw new Error("Gebruiker bestaat niet");
    }

    const reportUserData: any = await users.findOne({
      where: { id: reportedUserId },
      include: [
        {
          model: roleData,
          as: "roleData",
          attributes: ["companyName", "firstName", "lastName"],
        },
      ],
    });
    if (!reportUserData) {
      throw new Error("Gerapporteerde gebruiker bestaat niet");
    }

    if (roleId == 1) {
      userRecord = `${userData.roleData.firstName} ${userData.roleData.lastName}(Freelancer)`;
    } else if (roleId == 2) {
      userRecord = `${userData.roleData.companyName}(Company)`;
    } else {
      userRecord = `${userData.firstName} ${userData.lastName}(Employee)`;
    }

    if (reportUserData.roleId == 1) {
      reportUserRecord = `${reportUserData.roleData.firstName} ${userData.roleData.lastName}(Freelancer)`;
    } else {
      reportUserRecord = `${reportUserData.roleData.companyName}(Company)`;
    }

    let obj: any = {
      reportId: reportRes.id,
      Status: "pending",
      StatusKey: 3,
      content: `${userRecord} is Reporting ${reportUserRecord}`,
      seen: 0,
      typeId: 5, //report notification
    };
    await userNotification.create({ ...obj }, { transaction });
  };
}
