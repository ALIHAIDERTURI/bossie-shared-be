import { adminLog, userLog, users } from "@src/models";
import schedule from "node-schedule";
import { Op } from "sequelize";

// schedule.scheduleJob("0 0 * * *", async () => {
// schedule.scheduleJob("*/5 * * * *", async () => {
  schedule.scheduleJob("0 */12 * * *", async () => {
  console.log("in job");

  const suspendUsers = await userLog.findAll({
    where: {
      isSuspend: true,
      suspendUntil: {
        [Op.lte]: new Date(),
      },
    },
  });

  const muteUsers = await userLog.findAll({
    where: {
      isMuted: true,
      muteUntil: {
        [Op.lte]: new Date(),
      },
    },
  });

  const suspendAdmin = await adminLog.findAll({
    where: {
      isSuspend: true,
      suspendUntil: {
        [Op.lte]: new Date(),
      },
    },
  });

  for (const user of suspendUsers) {
    await userLog.update({ isSuspend: false }, { where: { id: user.id } });
  }

  for (const user of muteUsers) {
    await userLog.update({ isMuted: false }, { where: { id: user.id } });
  }

  for (const admin of suspendAdmin) {
    await adminLog.update({ isSuspend: false }, { where: { id: admin.id } });
  }
});
