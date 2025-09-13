import { Router, Request, Response } from "express";
import { adminControler } from "../controllers";
export const adminRouter: Router = Router();

adminRouter.post("/adminLogin", (...args: [Request, Response]) =>
  adminControler.adminLogin(...args)
);

adminRouter.post("/verifyAdminLoginOtp", (...args: [Request, Response]) =>
  adminControler.verifyAdminLoginOtp(...args)
);

adminRouter.post("/forgetPassword", (...args: [Request, Response]) =>
  adminControler.forgetPassword(...args)
);

adminRouter.put("/changeAdminPassword", (...args: [Request, Response]) =>
  adminControler.changeAdminPassword(...args)
);

adminRouter.post("/resendAdminOtp", (...args: [Request, Response]) =>
  adminControler.resendAdminOtp(...args)
);

adminRouter.post("/validateAdminOtp", (...args: [Request, Response]) =>
  adminControler.validateAdminOtp(...args)
);

adminRouter.post("/createModerators", (...args: [Request, Response]) =>
  adminControler.createModerators(...args)
);
adminRouter.delete("/deleteModerator", (...args: [Request, Response]) =>
  adminControler.deleteModerators(...args)
);

adminRouter.get("/getAllModerator", (...args: [Request, Response]) =>
  adminControler.getAllModerator(...args)
);

adminRouter.get("/getModeratorPermissions/:moderatorId", (...args: [Request, Response]) =>
  adminControler.getModeratorPermissions(...args)
);

adminRouter.put("/updateModeratorPermissions/:moderatorId", (...args: [Request, Response]) =>
  adminControler.updateModeratorPermissions(...args)
);

adminRouter.get("/getModeratorById/:id", (...args: [Request, Response]) =>
  adminControler.getModeratorById(...args)
);

adminRouter.get("/getAllUsers", (...args: [Request, Response]) =>
  adminControler.getAllUsers(...args)
);

adminRouter.get("/getAllCompanies", (...args: [Request, Response]) =>
  adminControler.getAllCompanies(...args)
);

adminRouter.get("/getUserInfoById", (...args: [Request, Response]) =>
  adminControler.getUserInfoById(...args)
);

adminRouter.post("/updateUserStatus", (...args: [Request, Response]) =>
  adminControler.updateUserStatus(...args)
);

adminRouter.delete("/delUser", (...args: [Request, Response]) =>
  adminControler.delUser(...args)
);

adminRouter.get("/getUserLogInfo", (...args: [Request, Response]) =>
  adminControler.getUserLogInfo(...args)
);

// adminRouter.get("/getAllCompanyInfo", (...args: [Request, Response]) =>
//   adminControler.getAllCompanyInfo(...args)
// );

adminRouter.get("/getCompanyInfoById", (...args: [Request, Response]) =>
  adminControler.getCompanyInfoById(...args)
);

adminRouter.get("/getCompanyEmpInfoById", (...args: [Request, Response]) =>
  adminControler.getCompanyEmpInfoById(...args)
);

adminRouter.get("/getEmployeeDetails/:id", (...args: [Request, Response]) =>
  adminControler.getEmployeeDetails(...args)
);

adminRouter.post("/updateModeratorStatus", (...args: [Request, Response]) =>
  adminControler.updateModeratorStatus(...args)
);

adminRouter.get("/getReportedThread", (...args: [Request, Response]) =>
  adminControler.getReportedThread(...args)
);

adminRouter.get("/getReportedThreadChatById", (...args: [Request, Response]) =>
  adminControler.getReportedThreadChatById(...args)
);

adminRouter.post("/updateThreadStatus", (...args: [Request, Response]) =>
  adminControler.updateThreadStatus(...args)
);

adminRouter.get("/getThreadLogInfo", (...args: [Request, Response]) =>
  adminControler.getThreadLogInfo(...args)
);

adminRouter.post("/updateAdminPassword", (...args: [Request, Response]) =>
  adminControler.updateAdminPassword(...args)
);

adminRouter.post("/saveAppInfo", (...args: [Request, Response]) =>
  adminControler.saveAppInfo(...args)
);

adminRouter.get("/getAppInfo", (...args: [Request, Response]) =>
  adminControler.getAppInfo(...args)
);

adminRouter.get("/getThreadDetailsById", (...args: [Request, Response]) =>
  adminControler.getThreadDetailsById(...args)
);

adminRouter.get("/getDashboardOverview", (...args: [Request, Response]) =>
  adminControler.getDashboardOverview(...args)
);

adminRouter.delete("/solvePrivateReport", (...args: [Request, Response]) =>
  adminControler.solvePrivateReport(...args)
);

adminRouter.get("/getDashboardStats", (...args: [Request, Response]) =>
  adminControler.getAllDashboardStats(...args)
);

adminRouter.get("/getLoggedInUsersChartData", (...args: [Request, Response]) =>
  adminControler.getLoggedInUsersChartData(...args)
);

adminRouter.get("/getRegisteredUsersChartData", (...args: [Request, Response]) =>
  adminControler.getRegisteredUsersChartData(...args)
);

adminRouter.get("/getReportedUsers", (...args: [Request, Response]) =>
  adminControler.getReportedUsers(...args)
);

adminRouter.get("/getReportedUsersList", (...args: [Request, Response]) =>
  adminControler.getReportedUsersList(...args)
);

adminRouter.get("/getReportedCompaniesList", (...args: [Request, Response]) =>
  adminControler.getReportedCompaniesList(...args)
);

adminRouter.get("/getReportedUserDetails/:reportId", (...args: [Request, Response]) =>
  adminControler.getReportedUserDetails(...args)
);

adminRouter.get("/getReportedCompanyDetails/:reportId", (...args: [Request, Response]) =>
  adminControler.getReportedCompanyDetails(...args)
);

adminRouter.get("/getUserDetails/:id", (...args: [Request, Response]) =>
  adminControler.getUserDetails(...args)
);

adminRouter.get("/getCompanyDetails/:id", (...args: [Request, Response]) =>
  adminControler.getCompanyDetails(...args)
);

adminRouter.get("/getUserThreads/:userId", (...args: [Request, Response]) =>
  adminControler.getUserThreads(...args)
);

adminRouter.get("/getCompanyThreads/:companyId", (...args: [Request, Response]) =>
  adminControler.getCompanyThreads(...args)
);

adminRouter.post("/approveRejectUser/:userId", (...args: [Request, Response]) =>
  adminControler.approveRejectUser(...args)
);

adminRouter.post("/approveRejectCompany/:companyId", (...args: [Request, Response]) =>
  adminControler.approveRejectCompany(...args)
);

adminRouter.post("/reviewAppeal/:userId", (...args: [Request, Response]) =>
  adminControler.reviewAppeal(...args)
);

adminRouter.post("/markReportAsResolved/:reportId", (...args: [Request, Response]) =>
  adminControler.markReportAsResolved(...args)
);

adminRouter.post("/calculateToxicityScore", (...args: [Request, Response]) =>
  adminControler.calculateUserToxicityScore(...args)
);

// adminRouter.get("/getModeratorLogs/:moderatorId", (...args: [Request, Response]) =>
//   adminControler.getModeratorLogs(...args)
// );

adminRouter.post("/addCustomModeratorLog/:moderatorId", (...args: [Request, Response]) =>
  adminControler.addCustomModeratorLog(...args)
);

adminRouter.post("/addCustomUserLog", (...args: [Request, Response]) =>
  adminControler.addCustomUserLog(...args)
);

adminRouter.get("/getModeratorActivityLogs/:moderatorId", (...args: [Request, Response]) =>
  adminControler.getModeratorActivityLogs(...args)
);

adminRouter.get("/getModeratorPerformanceStats/:moderatorId", (...args: [Request, Response]) =>
  adminControler.getModeratorPerformanceStats(...args)
);

adminRouter.get("/getUsersAppeals", (...args: [Request, Response]) =>
  adminControler.getUsersAppeals(...args)
);

adminRouter.get("/getCompaniesAppeals", (...args: [Request, Response]) =>
  adminControler.getCompaniesAppeals(...args)
);
