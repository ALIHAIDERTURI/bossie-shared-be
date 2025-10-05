import { socketController } from "../controllers";
import { Server } from "socket.io";

export const socketRouter = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("in socket connection");

    socket.on("joinRoom", (data) => {
      console.log("In joinRoom action");

      socketController.joinRoom(socket, io, data);
    });

    socket.on("leaveRoom", (data) => {
      console.log("In leaveRoom action");

      socketController.leaveRoom(io, socket, data);
    });

    socket.on("sendMessage", (data) => {
      console.log("In sendMsg action");

      socketController.sendMessage(socket, io, data);
    });

    socket.on("lockRoom", (data) => {
      console.log("In lockRoom action");

      socketController.lockRoom(socket, io, data);
    });

    socket.on("unLockRoom", (data) => {
      console.log("In unLockRoom action");

      socketController.unLockRoom(socket, io, data);
    });

    // *********** Private Messages ***************

    socket.on("isP_RoomExist", (data) => {
      console.log("In isP_RoomExist action");

      socketController.isP_RoomExist(socket, io, data);
    });

    socket.on("sendPMessage", (data) => {
      console.log("In send Private Message action");

      socketController.sendPMessage(socket, io, data);
    });

    socket.on("leavePrivateRoom", (data) => {
      console.log("In leavePrivateRoom action");

      socketController.leavePrivateRoom(io, socket, data);
    });

    socket.on("hideMessage", (data) => {
      console.log("In hideMessage action");
      socketController.hideMessage(socket, io, data);
    });

    socket.on("deleteMessage", (data) => {
      console.log("In deleteMessage action");
      socketController.deleteMessage(socket, io, data);
    });
  });
};
