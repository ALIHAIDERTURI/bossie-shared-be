import { sequelize } from "@src/config/database";
import { SocketService } from "@src/services/socket.service";
import {
  isP_RoomExistSchema,
  joinRoomSchema,
  leavePrivateRoomSchema,
  roomLockedSchema,
  sendMessageSchema,
  sendPMessageSchema,
} from "@src/shared/common/validators/forum.validator";

export class SocketController {
  /**
   * @param __service
   */

  public constructor(public __service: SocketService) { }
  /**
   *
   * @param req
   * @param res
   * @param next
   */

  public joinRoom = async (socket: any, io: any, data: any) => {
    try {
      let message = "Joined Room successfully.";
      const body = await joinRoomSchema.validateAsync(data);
      await this.__service.joinRoom(io, socket, body);
      return;
    } catch (error: any) {
      socket.emit("joinRoomError", error.message);
    }
  };

  public leaveRoom = async (io: any, socket: any, data: any) => {
    try {
      let message = "Room leave successfully.";
      const body = await joinRoomSchema.validateAsync(data);
      await this.__service.leaveRoom(io, socket, body);
      return;
    } catch (error: any) {
      socket.emit("leaveRoomError", error.message);
    }
  };

  public sendMessage = async (socket: any, io: any, data: any) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        let message = "Message send successfully.";
        const body = await sendMessageSchema.validateAsync(data);
        const response: any = await this.__service.sendMessage(
          socket,
          io,
          body,
          transaction
        );
        await transaction.commit();
      } catch (error: any) {
        console.log("error ", error.message);

        if (transaction) {
          transaction.rollback();
        }

        socket.emit("sendMessageError", error.message);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  public lockRoom = async (socket: any, io: any, data: any) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        let message = "Room locked successfully.";
        const body = await roomLockedSchema.validateAsync(data);
        await this.__service.lockRoom(io, socket, body, transaction);
        await transaction.commit();
        return;
      } catch (error: any) {
        if (transaction) {
          transaction.rollback();
        }

        socket.emit("lockRoomError", error.message);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  public unLockRoom = async (socket: any, io: any, data: any) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        let message = "Room unLocked successfully.";
        const body = await roomLockedSchema.validateAsync(data);
        await this.__service.unLockRoom(io, socket, body, transaction);
        await transaction.commit();

        return;
      } catch (error: any) {
        if (transaction) {
          transaction.rollback();
        }
        socket.emit("unLockRoomError", error.message);
        return;
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  // ******************** Private Messages ******************

  public isP_RoomExist = async (socket: any, io: any, data: any) => {
    try {
      let message = "Joined Private Room successfully.";
      const body = await isP_RoomExistSchema.validateAsync(data);
      await this.__service.isP_RoomExist(io, socket, body);
      return;
    } catch (error: any) {
      socket.emit("joinP_RoomError", error.message);
    }
  };

  public sendPMessage = async (socket: any, io: any, data: any) => {
    try {
      const transaction = await sequelize.transaction();
      try {
        let message = "Message send successfully.";
        const body = await sendPMessageSchema.validateAsync(data);
        const response: any = await this.__service.sendPMessage(
          socket,
          io,
          body,
          transaction
        );
        await transaction.commit();
      } catch (error: any) {
        console.log("error ", error.message);

        if (transaction) {
          transaction.rollback();
        }

        socket.emit("sendPMessageError", error.message);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  public leavePrivateRoom = async (io: any, socket: any, data: any) => {
    try {
      let message = "Room leave successfully.";
      const body = await leavePrivateRoomSchema.validateAsync(data);
      await this.__service.leavePrivateRoom(io, socket, body);
      return;
    } catch (error: any) {
      socket.emit("leavePrivateRoomError", error.message);
    }
  };
}
