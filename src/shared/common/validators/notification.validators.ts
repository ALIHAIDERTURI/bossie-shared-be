import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const updateNotificationSchema = Joi.object({
  notificationId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  typeId: Joi.number().integer().required(),
  profileStatus: Joi.number().integer().required(),
  adminId: Joi.number().integer().required(),
  rejectionReason: Joi.string().allow(null, "").optional(),
  empCompanyId: Joi.number().integer().allow("", null).optional(),
});

export const getDuplicateDataByUserIdSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});
