// import "module-alias/register";
import express from "express";
import "./utils/scheduleJobs";
import cors from "cors";
import path from "path";
import * as dotenv from "dotenv";
import { sequelize } from "../src/config/database";
import { routes } from "./routes/routes";
dotenv.config({ path: ".env" });
import { authenticateUser } from "./shared/middleware/authMiddleware";
import * as http from "http";
import { socketRouter } from "./routes/socket.routes";
const { Server } = require("socket.io");


const app = express();
app.use(express.urlencoded({ extended: true }));

app.set("host", process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");
app.set("port", process.env.PORT || 8081);
app.set("env", process.env.NODE_ENVR || "development");
app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.use("/api", routes);
// app.use("/api", routes);

export const server: http.Server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.resolve("./public")));

app.get("/socketTest", (req, res) => {
  return res.sendFile("../public/index.html");
});

export const globalIo = io;

(async () => {
  try {
    await sequelize.sync({ force: false, alter: true });
    console.log("Database connection established and synchronized.");

    // const server = http.createServer(app); // Create HTTP server
    // var io = new Server(server); // Create Socket.io server instance

    socketRouter(io);

    server.listen(app.get("port"), (): void => {
      console.log(
        " App is running at http://localhost:%d in %s mode",
        app.get("port"),
        app.get("env")
      );
      console.log(" Press CTRL-C to stop\n");
    });

    // const mockFCMToken =
    //   "eV1-ifYzRrWHI6OZkH2q1l:APA91bHb1F8OTJvE2i319P5_EQtqrp-NOR3rEICTAvdI5HXzssXwx4PTB51Ujk9PKw4vTCiIqqJJ1V2SEXNwnZSlIhVGUPISOVzrb89r8TVOy-kO9_5NhGTK5ImDM35FWrAuHxSg3CzB"; // Use a mock token for testing

    // sendPushNotification(
    //   mockFCMToken,
    //   "Bossie Notification",
    //   "This is a test Bossie message, Take care."
    // );
  } catch (error) {
    console.error("Error synchronizing database or starting server:", error);
  }
})();
