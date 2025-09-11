import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const alterLikeSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  toRoleId: Joi.number().integer().required(),
  toLikeId: Joi.number().integer().required(),
});

export const getExploreSchema = Joi.object({
  roleId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  limit: Joi.number().integer().required(),
  offset: Joi.number().integer().required(),
  filters: Joi.object({
    name: Joi.string().optional(),
    industryId: Joi.array().optional(),
    roleId: Joi.number().integer().optional(),
  })
    .allow("")
    .optional(),
});

export const getProfileByIdSchema = Joi.object({
  userId: Joi.number().integer().required(),
  profileId: Joi.number().integer().required(),
});

export const reportUserSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  reportedUserId: Joi.number().integer().required(),
  reportedRoleId: Joi.number().integer().required(),
  problem: Joi.string().required(),
});
