import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  icon: Joi.string().optional(),
});

export const createSubCategorySchema = Joi.object({
  categoryId: Joi.number().integer().required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
});

export const createDicsussionSchema = Joi.object({
  ownerId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  categoryId: Joi.number().integer().required(),
  subCategoryId: Joi.number().integer().required(),
  title: Joi.string().required(),
  description: Joi.string().optional(),
  logo: Joi.string().allow("").optional(),
});

export const getThreadByIdSchema = Joi.object({
  subCategoryId: Joi.number().integer().required(),

});

export const deleteThreadSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  roomId: Joi.number().integer().required(),
});

export const updateCategorySchema = Joi.object({
  isMainCategory: Joi.boolean().required(),
  isDelete: Joi.boolean().required(),
  isResume: Joi.boolean().required(),
  id: Joi.number().integer().required(),
  name: Joi.string().allow("", null).optional(),
  description: Joi.string().allow("", null).optional(),
  icon: Joi.string().allow("", null).optional(),
});

export const getAllPrivateThreadsSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  filters: Joi.object({
    name: Joi.string().optional(),
  })
    .allow("")
    .optional(),
});

export const getUserDiscussionSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  filters: Joi.object({
    sortBy: Joi.string().allow(""),
  })
    .allow("")
    .optional(),
});

export const readMessageSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  lastMessageId: Joi.number().integer().required(),
});

export const sendMessageSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roomId: Joi.number().integer().required(),
  message: Joi.string().allow("", null).optional(),
  img: Joi.string().allow("", null).optional(),
  roleId: Joi.number().integer().required(),
});

export const joinRoomSchema = Joi.object({
  id: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  userName: Joi.string().optional(),
});

export const roomLockedSchema = Joi.object({
  userId: Joi.number().integer().allow("", null).optional(),
  roomId: Joi.number().integer().required(),
  roleId: Joi.number().integer().allow("", null).optional(),
  adminId: Joi.number().integer().allow("", null).optional(),
});

export const leavePrivateRoomSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roomId: Joi.number().integer().required(),
});

export const getForumSubCategory = Joi.object({
  categoryId: Joi.number().integer().required(),
});

export const isP_RoomExistSchema = Joi.object({
  userId: Joi.number().integer().required(),
  toUserId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  toRoleId: Joi.number().integer().required(),
});

export const sendPMessageSchema = Joi.object({
  userId: Joi.number().integer().required(),
  toUserId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  toRoleId: Joi.number().integer().required(),
  roomId: Joi.number().integer().optional(),
  img: Joi.string().allow("", null).optional(),
  message: Joi.string().allow("", null).optional(),
});

export const reportSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  reportedUserId: Joi.number().integer().optional(),
  reportedRoleId: Joi.number().integer().optional(),
  reportedP_ThreadId: Joi.number().integer().optional(),
  reportedThreadId: Joi.number().integer().optional(),
  statusId: Joi.number().integer().required(),
  problem: Joi.string().optional(),
  messageDetail: Joi.object().optional().allow(null, {}),
});



export const addBannedKeywordSchema = Joi.object({
  keyword: Joi.string().trim().min(1).required(),
});

export const removeBannedKeywordSchema = Joi.object({
  id: Joi.number().integer().required(),
});


export const createReportValidator = Joi.object({
  userId: Joi.number().required(),
  reportedUserId: Joi.number().required(),
  roleId: Joi.number().required(),
  reportedRoleId: Joi.number().required(),
  reportedThreadId: Joi.number().optional(),
  reportedP_ThreadId: Joi.number().allow(null).optional(),
  problem: Joi.string().min(5).max(255).required(),
  messageDetail: Joi.object().optional()
});


export const getAllDiscussionsValidator = Joi.object({}).optional();