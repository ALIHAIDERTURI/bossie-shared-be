import {
  admin,
  employee,
  messages,
  privateMessages,
  privateThreads,
  roleData,
  threadLog,
  threads,
  userNotification,
  users,
} from "@src/models";
import { sendPushNotification } from "@src/utils/pushNotification";
import { Op, Sequelize, Transaction } from "sequelize";

export class SocketService {
  public joinRoom = async (io: any, socket: any, data: any): Promise<any> => {
    const { id, userId, userName } = data;
    console.log("in join room");
    const isRoom: any = await threads.findOne({ where: { id } });
    if (!isRoom) {
      throw new Error("Er is geen kamer beschikbaar.");
    }
    const allMessage: any = await messages.findAll({
      where: { 
        roomId: id,
        isDeleted: false // Exclude deleted messages
      },
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
      ],
    });

    socket.join(id);
    io.to(id).emit("userJoined", {
      userId: userId,
      userName: userName,
      userSocketId: socket.id,
    });

    const filteredMessages = await Promise.all(
      allMessage.map(async (msg: any) => {
        let employeeInfo: any;
        // if (msg.roleId === 3) {
        //   employeeInfo = await employee.findOne({
        //     where: { id: msg.userId },
        //     attributes: ["firstName", "lastName", "profile", "id"],
        //   });
        // }
        
        // Check if this message is from an admin
        const isAdminMessage = await admin.findOne({
          where: { id: msg.userId, deletedAt: null },
          attributes: ["id", "name", "adminRoleId"],
          raw: true
        });

        let name: any;
        let isAdmin = false;
        let adminId = null;
        let adminName = null;
        let adminRoleId = null;

        if (isAdminMessage) {
          // This is an admin message
          name = isAdminMessage.name;
          isAdmin = true;
          adminId = isAdminMessage.id;
          adminName = isAdminMessage.name;
          adminRoleId = isAdminMessage.adminRoleId;
        } else if (msg.roleId == 2) {
          name = msg.users?.roleData?.companyName;
        } else if (msg.roleId == 1) {
          name = `${msg.users?.roleData?.firstName} ${msg.users?.roleData?.lastName}`;
        } else {
          name = `${msg.employee?.firstName} ${msg.employee?.lastName}`;
        }

        return {
          messageId: msg.id,
          userId: isAdminMessage ? isAdminMessage.id : (msg.roleId !== 3 ? msg.users?.id : msg.employee?.id),
          roleId: isAdminMessage ? 999 : msg.roleId, // Keep original logic
          name: name,
          userLogo: isAdminMessage ? null : (msg.roleId !== 3 ? msg.users?.roleData?.profile : msg.employee?.profile),
          roomId: msg.roomId,
          roomName: isRoom.title,
          message: msg.message,
          img: msg.img,
          timeStamp: msg.createdAt,
          isHidden: msg.isHidden || false,
          isDeleted: msg.isDeleted || false,
          isAdmin: isAdmin,
          adminId: adminId,
          adminName: adminName,
        };
      })
    );
    const reversedMessages = filteredMessages.reverse();
    console.log("rendering joinRoom ");
    socket.emit("initialMessages", reversedMessages);
    console.log("after msg send joinRoom ");
    return;
  };

  public sendMessage = async (
    socket: any,
    io: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, roomId, message, roleId, img, adminId, isAdmin } = data;
    let messageCreate: any
    console.log("in sending msg service");
    const roomExist: any = await threads.findOne({
      where: {
        id: roomId,
      },
    });
    if (!roomExist) {
      throw new Error("Er is geen kamer beschikbaar.");
    }
    if (!roomExist.locked) {
      // First, check if the user is an admin
      const isUserAdmin = await admin.findOne({
        where: { id: userId, deletedAt: null },
        attributes: ["id", "name", "adminRoleId"],
        raw: true
      });

      const userColName = roleId == 3 ? "empId" : "userId";

      messageCreate = await messages.create(
        { [userColName]: userId, roomId, message, roleId, img },
        { transaction }
      );

      if (!messageCreate) {
        throw new Error("Bericht kan niet worden gemaakt.");
      }

      // Handle admin messages (either explicitly marked as admin or detected as admin)
      if ((isAdmin && adminId) || isUserAdmin) {
        console.log("in send msg , admin condition");
        
        const adminResponse = isUserAdmin || await admin.findOne({
          where: { id: adminId || userId }, 
          attributes: ["id", "name", "adminRoleId"],
          raw: true
        });

        if (!adminResponse) {
          throw new Error("Admin not found.");
        }

        io.to(roomId).emit("message", {
          messageId: messageCreate.id,
          userId: adminResponse.id,
          roleId: 999, // Keep original special roleId for admin
          name: adminResponse.name,
          userLogo: null, // Admins don't have profile images
          roomId,
          roomName: roomExist.title,
          message,
          img,
          timeStamp: messageCreate.createdAt,
          isHidden: false,
          isDeleted: false,
          isAdmin: true,
          adminId: adminResponse.id,
          adminName: adminResponse.name,
        });

      } else if (roleId != 3) {
        // Handle regular users (freelancers and companies)
        const userResponse: any = await users.findOne({
          where: { id: userId },
          include: [
            {
              as: "roleData",
              model: roleData,
              attributes: ["companyName", "firstName", "lastName", "profile"],
            },
          ],
        });

        if (!userResponse) {
          throw new Error("Het is niet toegestaan ​​om berichten te versturen.")
        }

         io.to(roomId).emit("message", {
           messageId: messageCreate.id,
           userId,
           roleId: roleId,
           name:
             roleId == 2
               ? `${userResponse?.roleData?.companyName}`
               : `${userResponse?.roleData?.firstName} ${userResponse?.roleData?.lastName}`,
           userLogo: userResponse?.roleData?.profile,
           roomId,
           roomName: roomExist.title,
           message,
           img,
           timeStamp: messageCreate.createdAt,
           isHidden: false,
           isDeleted: false,
           isAdmin: false,
         });
      } else {
        // Handle employees
        console.log("in send msg , emp condition");

        const userResponse: any = await employee.findOne({
          where: { id: userId }, raw: true
        });
        console.log(
          "userResponse", userResponse
        );

        if (!userResponse) {
          throw new Error("Het is niet toegestaan ​​om berichten te versturen.")
        }

         io.to(roomId).emit("message", {
           messageId: messageCreate.id,
           userId,
           roleId: roleId,
           name: `${userResponse.firstName} ${userResponse.lastName}`,
           userLogo: userResponse.profile,
           roomId,
           roomName: roomExist.title,
           message,
           img,
           timeStamp: messageCreate.createdAt,
           isHidden: false,
           isDeleted: false,
           isAdmin: false,
         });
      }

      return;
    }
    throw new Error("Kamer is afgesloten.");
  };

  public hideMessage = async (
    socket: any,
    io: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { messageId, adminId } = data;

    const message = await messages.findOne({
      where: { id: messageId, isDeleted: false }
    });

    if (!message) {
      throw new Error("Message not found");
    }

    await message.update(
      { isHidden: true, hiddenBy: adminId },
      { transaction }
    );

    io.to(message.roomId.toString()).emit("messageHidden", {
      messageId: messageId,
      hiddenBy: adminId,
    });

    return { success: true, message: "Message hidden successfully" };
  };

  public unhideMessage = async (
    socket: any,
    io: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { messageId, adminId } = data;

    const message = await messages.findOne({
      where: { id: messageId, isDeleted: false }
    });

    if (!message) {
      throw new Error("Message not found");
    }

    await message.update(
      { isHidden: false, hiddenBy: null },
      { transaction }
    );

    io.to(message.roomId.toString()).emit("messageUnhidden", {
      messageId: messageId,
      unhiddenBy: adminId,
    });

    return { success: true, message: "Message unhidden successfully" };
  };

  public deleteMessage = async (
    socket: any,
    io: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { messageId, adminId } = data;

    const message = await messages.findOne({
      where: { id: messageId, isDeleted: false }
    });

    if (!message) {
      throw new Error("Message not found");
    }

    await message.update(
      { isDeleted: true, deletedBy: adminId },
      { transaction }
    );

    io.to(message.roomId.toString()).emit("messageDeleted", {
      messageId: messageId,
      deletedBy: adminId,
    });

    return { success: true, message: "Message deleted successfully" };
  };

  public leaveRoom = async (io: any, socket: any, data: any): Promise<any> => {
    const { id, userId, userName } = data;
    console.log("in leave room");

    const isRoom: any = await threads.findOne({ where: { id } });
    if (!isRoom) {
      throw new Error("Er is geen kamer beschikbaar.");
    }

    socket.leave(id);
    io.to(id).emit("userLeave", {
      userId: userId,
      userName: userName,
      userSocketId: socket.id,
    });
    return;
  };

  public lockRoom = async (
    io: any,
    socket: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { userId, roomId, roleId, adminId } = data;
    console.log("in lock room", data);

    const isRoomExist: any = await threads.findOne({ where: { id: roomId } });
    if (!isRoomExist) {
      throw new Error("Er is geen kamer beschikbaar.");
    }

    if (adminId) {
      const isAdminExist = await admin.findOne({ where: { id: adminId, accountStatus: 1 } })
      if (!isAdminExist) {
        throw new Error("Beheerders-ID is ongeldig.")
      }

      await threads.update(
        { locked: true },
        {
          where: {
            id: roomId,
          },
          transaction,
        }
      );
      await threadLog.create({ threadId: roomId, lockedBy: adminId, isLocked: true }, { transaction });
      return;
    }

    const ownerCol = roleId == 3 ? "ownerEmpId" : "ownerId";

    if (isRoomExist?.[ownerCol] !== userId || isRoomExist?.roleId !== roleId) {
      throw new Error("Ongeldige eigenaars-ID.");
    }

    await threads.update(
      { locked: true },
      {
        where: {
          id: roomId,
          [ownerCol]: userId,
          roleId: roleId,
        },
        transaction,
      }
    );
    await threadLog.create({ threadId: roomId, isLocked: true }, { transaction });

    let obj: any = {
      roomId: roomId,
      roomName: isRoomExist?.title,
      userSocketId: socket.id,
    };
    io.to(roomId).emit("roomLocked", obj);
    return;
  };

  public unLockRoom = async (
    io: any,
    socket: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    const { roomId, userId, roleId, adminId } = data;
    const isRoomExist: any = await threads.findOne({ where: { id: roomId } });
    if (!isRoomExist) {
      throw new Error("Er is geen kamer beschikbaar.");
    }

    if (adminId) {
      const isAdminExist = await admin.findOne({ where: { id: adminId, accountStatus: 1 } })
      if (!isAdminExist) {
        throw new Error("Beheerders-ID is ongeldig.")
      }

      await threads.update(
        { locked: false },
        {
          where: {
            id: roomId,
          },
          transaction,
        }
      );
      await threadLog.create({ threadId: roomId, unLockedBy: adminId, isLocked: false }, { transaction });
      return
    }

    const ownerCol = roleId == 3 ? "ownerEmpId" : "ownerId";

    if (isRoomExist?.[ownerCol] !== userId || isRoomExist.roleId !== roleId) {
      throw new Error("Ongeldige eigenaars-ID.");
    }

    await threads.update(
      { locked: false },
      { where: { id: roomId, [ownerCol]: userId, roleId: roleId }, transaction }
    );

    await threadLog.create({ threadId: roomId, isLocked: false }, { transaction });


    let obj: any = {
      roomId: roomId,
      roomName: isRoomExist?.title,
      userSocketId: socket.id,
    };

    io.to(roomId).emit("RoomUnlocked", obj);
    return;
  };

  // **************** Private Messages ********************

  public isP_RoomExist = async (
    io: any,
    socket: any,
    data: any
  ): Promise<any> => {
    const { userId, toUserId, roleId, toRoleId } = data;
    console.log("is private room exist.");
    // const roomName: any = await getRoomName(userId, toUserId);
    const isRoom: any = await privateThreads.findOne({
      // where: { title: { [Op.or]: [roomName.title1, roomName.title2] } },
      where: {
        [Op.or]: [
          {
            // Scenario A: userId & toUserId in original order
            [Op.and]: [
              {
                [Op.or]: [
                  { ownerUserId: userId },
                  { ownerEmpId: userId },
                ],
              },
              {
                [Op.or]: [
                  { toUserId: toUserId },
                  { toEmpId: toUserId },
                ],
              },
              { roleId },
              { toRoleId },
            ],
          },
          {
            // Scenario B: reverse
            [Op.and]: [
              {
                [Op.or]: [
                  { ownerUserId: toUserId },
                  { ownerEmpId: toUserId },
                ],
              },
              {
                [Op.or]: [
                  { toUserId: userId },
                  { toEmpId: userId },
                ],
              },
              { roleId: toRoleId },
              { toRoleId: roleId },
            ],
          },
        ],
      }

    });

    console.log("isRoom", isRoom);

    if (!isRoom) {
      throw new Error("Er is geen kamer beschikbaar.");
    }
    const allMessage: any = await privateMessages.findAll({
      where: { roomId: isRoom.id },
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

    socket.join(isRoom.id);
    io.to(isRoom.id).emit("privateUserJoined", {
      userId: userId,
      roomId: isRoom.id,
      userSocketId: socket.id,
    });

    // Extract the necessary details
    const filteredMessages = await Promise.all(
      allMessage.map(async (msg: any) => {
        // let employeeInfo: any;
        // if (msg.roleId === 3) {
        //   employeeInfo = await employee.findOne({
        //     where: { id: msg.userId },
        //     attributes: ["firstName", "lastName", "profile", "id"],
        //   });
        // }

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
          roomName: isRoom.title,
          message: msg.message,
          img: msg.img,
          timeStamp: msg.createdAt,
        };
      })
    );
    const reversedMessages = filteredMessages.reverse();

    io.to(isRoom.id).emit("initialMessages", reversedMessages);
    return;
  };

  public sendPMessage = async (
    socket: any,
    io: any,
    data: any,
    transaction: Transaction
  ): Promise<any> => {
    //RoomId -< In case, when room is already created
    const { userId, toUserId, message, img, roomId, roleId, toRoleId } = data;
    var userRes: any;
    var senderProfileRes: any;
    var receiverProfileRes: any;
    var senderName: any;

    if (roleId == 2 || toRoleId == 2) {
      throw new Error("Het is niet toegestaan ​​om een ​​bericht naar Bedrijf te sturen.");
    }

    if (roleId != 3) {
      senderProfileRes = await users.findOne({ where: { id: userId }, attributes: ["fcmToken", "name"] });
      userRes = await roleData.findOne({ where: { userId: userId, accountStatus: 1 } });

      if (!userRes) {
        throw new Error("Het is niet toegestaan ​​om berichten te versturen.")
      }
      senderName = roleId == 2 ? `${userRes.companyName}` : `${userRes.firstName} ${userRes.lastName}`;


    } else {
      senderProfileRes = await employee.findOne({ where: { id: userId }, attributes: ["fcmToken", "firstName", "lastName"] });
      senderName = `${senderProfileRes.firstName} ${senderProfileRes.lastName} `;

      userRes = await employee.findOne({
        where: { id: userId },
        include: [
          {
            as: "users",
            model: users,
            attributes: ["id"],
            include: [
              {
                as: "roleData",
                model: roleData,
                attributes: ["id", "companyName"],
              },
            ],
          },
        ],
      });

      if (!userRes) {
        throw new Error("Het is niet toegestaan ​​om berichten te versturen.")
      }
    }

    if (toRoleId != 3) {
      receiverProfileRes = await users.findOne({ where: { id: toUserId }, attributes: ["fcmToken"] });
    } else {
      receiverProfileRes = await employee.findOne({ where: { id: toUserId }, attributes: ["fcmToken"] });
    }

    //In case, when room already exist.
    if (roomId) {
      const isThread: any = await privateThreads.findOne({
        where: { id: roomId },
      });
      if (!isThread) {
        throw new Error("Thread bestaat niet.");
      }

      socket.join(roomId);
      let colName: any = roleId == 3 ? "empId" : "userId";
      const msgCreate: any = await privateMessages.create(
        { [colName]: userId, roomId, message, img, roleId },
        { transaction }
      );

      const roleType = toRoleId == 3 ? "employeeId" : "userId";
      await userNotification.create(
        {
          pMessageSenderId: userId,
          pMessageRoleId: roleId,
          [roleType]: toUserId,
          seen: false,
          typeId: 3,
          content: `${userRes.firstName} ${userRes.lastName} messaged you.`,
          message: message,
          privateThreadId: roomId
        },
        { transaction }
      );

      io.to(roomId).emit("P_Message", {
        userId,
        roleId,
        name: `${userRes.firstName} ${userRes.lastName}`,
        companyName: roleId === 3 ? userRes.users?.roleData?.companyName : "",
        userLogo: userRes.profile,
        roomId: roomId,
        roomName: isThread.title,
        message,
        img,
        timeStamp: msgCreate?.createdAt,
      });
      const body = `${senderName} heeft je een bericht verstuurd.`
      const pushRes: any = await sendPushNotification(
        receiverProfileRes.fcmToken,
        "Nieuw bericht",
        body || "This is a test message, Take care.",
        ''
      );


      return;
    }

    const roomName: any = await getRoomName(userId, roleId, toUserId, toRoleId);
    console.log("roomName", roomName);

    // const isThread: any = await privateThreads.findOne({
    //   where: { title: { [Op.or]: [roomName.title1, roomName.title2] } },
    // });

    const isThread: any = await privateThreads.findOne({
      // where: { title: { [Op.or]: [roomName.title1, roomName.title2] } },
      where: {
        [Op.or]: [
          {
            // Scenario A: userId & toUserId in original order
            [Op.and]: [
              {
                [Op.or]: [
                  { ownerUserId: userId },
                  { ownerEmpId: userId },
                ],
              },
              {
                [Op.or]: [
                  { toUserId: toUserId },
                  { toEmpId: toUserId },
                ],
              },
              { roleId },
              { toRoleId },
            ],
          },
          {
            // Scenario B: reverse
            [Op.and]: [
              {
                [Op.or]: [
                  { ownerUserId: toUserId },
                  { ownerEmpId: toUserId },
                ],
              },
              {
                [Op.or]: [
                  { toUserId: userId },
                  { toEmpId: userId },
                ],
              },
              { roleId: toRoleId },
              { toRoleId: roleId },
            ],
          },
        ],
      }

    });

    if (isThread) {
      throw new Error("Er bestaat al een kamer.");
    }

    let userCol: any = roleId === 3 ? "ownerEmpId" : "ownerUserId";
    let toUserCol: any = toRoleId === 3 ? "toEmpId" : "toUserId";

    const createRes: any = await privateThreads.create(
      {
        title: roomName.title1,
        [userCol]: userId,
        [toUserCol]: toUserId,
        roleId,
        toRoleId,
      },
      { transaction }
    );

    if (createRes) {
      let colName: any = roleId == 3 ? "empId" : "userId";
      const msgCreate: any = await privateMessages.create(
        {
          [colName]: userId,
          roomId: createRes.id,
          message,
          img,
          roleId,
        },
        { transaction }
      );
      socket.join(createRes.id);

      const roleType = toRoleId == 3 ? "employeeId" : "userId";

      await userNotification.create(
        {
          pMessageSenderId: userId,
          pMessageRoleId: roleId,
          [roleType]: toUserId,
          seen: false,
          typeId: 3,
          content: `${userRes.firstName} ${userRes.lastName} messaged you.`,
          message: message,
          privateThreadId: createRes.id

        },
        { transaction }
      );

      io.to(createRes.id).emit("P_Message", {
        userId,
        roleId,
        name: `${userRes.firstName} ${userRes.lastName}`,
        companyName: roleId === 3 ? userRes.users?.roleData?.companyName : "",
        userLogo: userRes.profile,
        roomId: createRes.id,
        roomName: createRes.title,
        message,
        img,
        timeStamp: msgCreate?.createdAt,
      });

      const body = `${senderName} heeft je een bericht verstuurd.`
      const pushRes: any = await sendPushNotification(
        receiverProfileRes.fcmToken,
        "Nieuw bericht",
        body || "This is a test message, Take care.",
        ''
      );
    }

    return;
  };

  public leavePrivateRoom = async (
    io: any,
    socket: any,
    data: any
  ): Promise<any> => {
    const { roomId, userId } = data;

    const isRoom: any = await privateThreads.findOne({ where: { id: roomId } });
    if (!isRoom) {
      throw new Error("Er is geen kamer beschikbaar.");
    }

    socket.leave(roomId);
    // io.to(roomId).emit("userLeave", {
    //   userId: userId,
    //   userName: userName,
    //   userSocketId: socket.id,
    // });
    return;
  };
}

const getRoomName = async (
  userId: any,
  roleId: any,
  toUserId: any,
  toRoleId: any
) => {
  let userRes: any;
  let toUserRes: any;

  if (roleId != 3) {
    userRes = await roleData.findOne({
      where: { userId: userId },
    });
  } else {
    userRes = await employee.findOne({
      where: { id: userId },
    });
  }

  if (toRoleId != 3) {
    toUserRes = await roleData.findOne({
      where: { userId: toUserId },
    });
  } else {
    toUserRes = await employee.findOne({
      where: { id: toUserId },
    });
  }

  let title1: any;
  let title2: any;

  if (userRes?.companyName) {
    if (toUserRes.companyName) {
      title1 = `${userRes.companyName} & ${toUserRes.companyName}`;
      title2 = `${toUserRes.companyName} & ${userRes.companyName}`;
    } else {
      title1 = `${userRes.companyName} & ${toUserRes.firstName} ${toUserRes.lastName}`;
      title2 = `${toUserRes.companyName} & ${userRes.firstName} ${userRes.lastName}`;
    }
  }
  if (userRes?.firstName) {
    if (toUserRes.firstName) {
      title1 = `${userRes.firstName} ${userRes.lastName} & ${toUserRes.firstName} ${toUserRes.lastName}`;
      title2 = `${toUserRes.firstName} ${toUserRes.lastName} & ${userRes.firstName} ${userRes.lastName}`;
    } else {
      title1 = `${userRes.firstName} ${userRes.lastName} & ${toUserRes.companyName}`;
      title2 = `${toUserRes.firstName} ${toUserRes.lastName} & ${userRes.companyName}`;
    }
  }

  return { title1, title2 };
};
