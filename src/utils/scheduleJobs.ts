import { adminLog, userLog, users, employee, roleData, threads, messages, privateThreads, privateMessages, userNotification, like, report, toxicityScores } from "@src/models";
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

// ============================================
// PERMANENT DELETION JOB (Runs Daily at 2 AM)
// Permanently deletes records soft-deleted for more than 90 days
// ============================================
schedule.scheduleJob("0 2 * * *", async () => {
  console.log("🗑️  Running permanent deletion job for records older than 90 days...");

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    // Find users deleted more than 90 days ago
    const usersToDelete = await users.findAll({
      where: {
        deletedAt: {
          [Op.lte]: ninetyDaysAgo,
        },
      },
      attributes: ['id', 'roleId', 'deletionType'],
      paranoid: false,
    });

    console.log(`Found ${usersToDelete.length} users to permanently delete`);

    for (const user of usersToDelete) {
      // CASCADE PERMANENT DELETE for all users (regardless of admin or self delete)
      const userId = user.id;
      const roleId = user.roleId;

      // Delete related data
      await roleData.destroy({ where: { userId }, force: true });
      await userLog.destroy({ where: { userId }, force: true });
      await threads.destroy({ where: { ownerId: userId, roleId }, force: true });
      await messages.destroy({ where: { userId }, force: true });
      await privateThreads.destroy({ 
        where: { 
          [Op.or]: [
            { ownerUserId: userId },
            { toUserId: userId }
          ]
        }, 
        force: true 
      });
      await privateMessages.destroy({ where: { userId }, force: true });
      await userNotification.destroy({ where: { userId }, force: true });
      await like.destroy({ 
        where: { 
          [Op.or]: [
            { userWhoLikeId: userId },
            { toLikeId: userId }
          ]
        }, 
        force: true 
      });
      await toxicityScores.destroy({ where: { userId }, force: true });
      await report.destroy({ 
        where: { 
          [Op.or]: [
            { userId: userId },
            { reportedUserId: userId }
          ]
        }, 
        force: true 
      });

      // For companies, delete all employees
      if (roleId === 2) {
        const companyEmployees = await employee.findAll({
          where: { userId },
          attributes: ['id'],
          paranoid: false,
          raw: true
        });

        for (const emp of companyEmployees) {
          await userLog.destroy({ where: { employeeId: emp.id }, force: true });
          await threads.destroy({ where: { ownerEmpId: emp.id, roleId: 3 }, force: true });
          await messages.destroy({ where: { empId: emp.id }, force: true });
          await privateMessages.destroy({ where: { empId: emp.id }, force: true });
          await userNotification.destroy({ where: { employeeId: emp.id }, force: true });
          await employee.destroy({ where: { id: emp.id }, force: true });
        }
      }

      // Finally delete the user
      await users.destroy({ where: { id: userId }, force: true });
      console.log(`✅ Permanently deleted user ${userId}`);
    }

    // Find employees deleted more than 90 days ago
    const employeesToDelete = await employee.findAll({
      where: {
        deletedAt: {
          [Op.lte]: ninetyDaysAgo,
        },
      },
      attributes: ['id', 'deletionType'],
      paranoid: false,
    });

    console.log(`Found ${employeesToDelete.length} employees to permanently delete`);

    for (const emp of employeesToDelete) {
      const employeeId = emp.id;

      // CASCADE PERMANENT DELETE for employees
      await userLog.destroy({ where: { employeeId }, force: true });
      await threads.destroy({ where: { ownerEmpId: employeeId, roleId: 3 }, force: true });
      await messages.destroy({ where: { empId: employeeId }, force: true });
      await privateThreads.destroy({ 
        where: { 
          [Op.or]: [
            { ownerEmpId: employeeId },
            { toEmpId: employeeId }
          ]
        }, 
        force: true 
      });
      await privateMessages.destroy({ where: { empId: employeeId }, force: true });
      await userNotification.destroy({ where: { employeeId }, force: true });
      await like.destroy({ 
        where: { 
          [Op.or]: [
            { employeeWhoLikeId: employeeId },
            { employeeToLikeId: employeeId }
          ]
        }, 
        force: true 
      });
      await report.destroy({ 
        where: { 
          [Op.or]: [
            { userId: employeeId, roleId: 3 },
            { reportedUserId: employeeId, reportedRoleId: 3 }
          ]
        }, 
        force: true 
      });

      // Finally delete the employee
      await employee.destroy({ where: { id: employeeId }, force: true });
      console.log(`✅ Permanently deleted employee ${employeeId}`);
    }

    // Find forum threads deleted more than 90 days ago
    const threadsToDelete = await threads.findAll({
      where: {
        deletedAt: {
          [Op.lte]: ninetyDaysAgo,
        },
      },
      attributes: ['id'],
      paranoid: false,
    });

    console.log(`Found ${threadsToDelete.length} forum threads to permanently delete`);

    for (const thread of threadsToDelete) {
      const threadId = thread.id;

      // Delete all messages in the thread
      await messages.destroy({ where: { roomId: threadId }, force: true });

      // Delete the thread
      await threads.destroy({ where: { id: threadId }, force: true });
      console.log(`✅ Permanently deleted thread ${threadId}`);
    }

    console.log("✅ Permanent deletion job completed successfully");
  } catch (error) {
    console.error("❌ Error in permanent deletion job:", error);
  }
});
