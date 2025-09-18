import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const getAllPendingRequestSchema = Joi.object({
  limit: Joi.number().integer().allow("", null).optional(),
  offset: Joi.number().integer().allow("", null).optional(),
  roleId: Joi.number().integer().required(),
  filters: Joi.object({
    name: Joi.string().allow(""),
  })
    .allow("")
    .optional(),
  isActive: Joi.boolean().required(),
});

export const getUserInfoSchema = Joi.object({
  roleId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
});

export const updateRequestStatusSchema = Joi.object({
  roleId: Joi.number().integer().required(),
  adminId: Joi.number().integer().allow("", null).optional(),
  userId: Joi.number().integer().required(),
  empCompanyId: Joi.number().integer().allow("", null).optional(),
  profileStatus: Joi.number().integer().required(),
  rejectionReason: Joi.string().allow(""),
});

export const viewProfileUpdatingRequestSchema = Joi.object({
  roleId: Joi.number().integer().required(),
});

export const getUpdateReqInfoSchema = Joi.object({
  id: Joi.number().integer().optional(),
  roleId: Joi.number().integer().required(),
  userId: Joi.number().integer().optional(),
});

export const updateProfileUpdateReqSchema = Joi.object({
  id: Joi.number().integer().optional(),
  adminId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  statusId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  rejectionReason: Joi.string().allow("").optional(),
});
