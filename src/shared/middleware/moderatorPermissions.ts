import { Request, Response, NextFunction } from "express";
import { moderatorPermissions } from "@src/models";

interface AuthenticatedRequest extends Request {
  user: any;
}

export const checkModeratorPermission = (requiredPermission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is a moderator (adminRoleId: 2)
      if (!req.user || req.user.adminRoleId !== 2) {
        return res.status(403).json({
          statusCode: 403,
          message: "Access denied. Moderator privileges required.",
        });
      }

      // Get moderator permissions
      const permissions = await moderatorPermissions.findOne({
        where: { moderatorId: req.user.id, deletedAt: null },
      });

      if (!permissions) {
        return res.status(403).json({
          statusCode: 403,
          message: "No permissions found for this moderator.",
        });
      }

      // Check if moderator has the required permission
      const hasPermission = permissions[requiredPermission as keyof typeof permissions];
      
      if (!hasPermission) {
        return res.status(403).json({
          statusCode: 403,
          message: `Access denied. ${requiredPermission} permission required.`,
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        statusCode: 500,
        message: "Error checking moderator permissions.",
      });
    }
  };
};

// Specific permission checkers for all 9 permissions
export const requireUserManagement = checkModeratorPermission("userManagement");
export const requireCompanyManagement = checkModeratorPermission("companyManagement");
export const requireNewRegistrationRequests = checkModeratorPermission("newRegistrationRequests");
export const requireProfileUpdateRequests = checkModeratorPermission("profileUpdateRequests");
export const requireForums = checkModeratorPermission("forums");
export const requireReportedChats = checkModeratorPermission("reportedChats");
export const requireModeratorManagement = checkModeratorPermission("moderatorManagement");
export const requirePushNotifications = checkModeratorPermission("pushNotifications");
export const requireRestoreOldData = checkModeratorPermission("restoreOldData");
