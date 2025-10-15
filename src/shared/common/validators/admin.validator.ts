import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const adminLoginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().required(),
  OTP: Joi.number().integer().required(),
});

export const emailDefaultSchema = Joi.object({
  email: Joi.string().required(),
});

export const idDefaultSchema = Joi.object({
  id: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string().custom((value, helpers) => {
      const num = parseInt(value);
      if (isNaN(num)) {
        return helpers.error('any.invalid');
      }
      return num;
    })
  ).required(),
});

export const suspendUserSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  suspendUntil: Joi.date().optional(),
  muteUntil: Joi.date().optional(),
  adminId: Joi.number().integer().required(),
  isSuspend: Joi.boolean().optional(),
  isMute: Joi.boolean().optional(),
  suspendReason: Joi.string().allow("", null).optional(),
  muteReason: Joi.string().allow("", null).optional(),
});


export const updateModeratorStatusSchema = Joi.object({
  adminId: Joi.number().integer().required(),
  isSuspend: Joi.boolean().required(),
  days: Joi.number().integer().optional(),
  suspendUntil: Joi.date().optional(),
  moderatorId: Joi.number().integer().required(),
});

export const limitDefaultSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().allow("", null).optional(),
});

export const getCompanyEmpInfoSchema = Joi.object({
  userId: Joi.number().integer().required(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().allow("", null).optional(),
});

export const updateModeratorPermissionsSchema = Joi.object({
  userManagement: Joi.boolean().default(false),
  companyManagement: Joi.boolean().default(false),
  newRegistrationRequests: Joi.boolean().default(false),
  profileUpdateRequests: Joi.boolean().default(false),
  forums: Joi.boolean().default(false),
  reportedChats: Joi.boolean().default(false),
  moderatorManagement: Joi.boolean().default(false),
  pushNotifications: Joi.boolean().default(false),
  restoreOldData: Joi.boolean().default(false),
});

export const moderatorIdParamSchema = Joi.object({
  moderatorId: Joi.number().integer().required(),
});

export const getModeratorPermissionsSchema = Joi.object({
  moderatorId: Joi.number().integer().required(),
});

export const changeAdminPasswordSchema = Joi.object({
  id: Joi.number().integer().required(),
  confirmPassword: Joi.string().required(),
  password: Joi.string().required(),
});

export const getUserLogInfoSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});

export const getAllUsersSchema = Joi.object({
  limit: Joi.number().integer().required(),
  offset: Joi.number().integer().required(),
  filters: Joi.object({
    type: Joi.string().optional(),
    industryId: Joi.string().optional(),
    search: Joi.string().optional(),
    chatAvailability: Joi.string().optional(),
    currentMonth: Joi.boolean().optional(),
  })
    .allow("")
    .optional(),
});

export const validateadminOTPSchema = Joi.object({
  email: Joi.string().required(),
  OTP: Joi.number().integer().required(),
});

export const createModeratorsSchema = Joi.object({
  email: Joi.string().required(),
  phone: Joi.string().required(),
  name: Joi.string().required(),
  password: Joi.string().required(),
  permissions: Joi.object({
    userManagement: Joi.boolean().default(false),
    companyManagement: Joi.boolean().default(false),
    newRegistrationRequests: Joi.boolean().default(false),
    profileUpdateRequests: Joi.boolean().default(false),
    forums: Joi.boolean().default(false),
    reportedChats: Joi.boolean().default(false),
    moderatorManagement: Joi.boolean().default(false),
    pushNotifications: Joi.boolean().default(false),
    restoreOldData: Joi.boolean().default(false),
  }).optional(),
});

export const solvePrivateReportSchema = Joi.object({
  reportId: Joi.number().integer().required(),
});
export const delUserSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});

export const restoreUserSchema = Joi.object({
  id: Joi.number().integer().optional(),
  roleId: Joi.number().integer().optional(),
  threadId: Joi.number().integer().optional()
}).custom((value, helpers) => {
  if (value.threadId) {
    return value;
  }

  if (value.id && value.roleId) {
    return value;
  }

  return helpers.error('custom.restoreValidation');
}).messages({
  'custom.restoreValidation': 'Either provide threadId OR provide both id and roleId'
});

export const getReportedThreadChatByIdSchema = Joi.object({
  threadId: Joi.number().integer().required(),
});

export const updateThreadStatusSchema = Joi.object({
  threadId: Joi.number().integer().required(),
  unLockedBy: Joi.number().integer().optional(),
  lockedBy: Joi.number().integer().optional(),
  statusId: Joi.number().integer().required(),
  editedBy: Joi.number().integer().optional(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
});

export const updateAdminPasswordSchema = Joi.object({
  id: Joi.number().integer().required(),
  confirmPass: Joi.string().optional(),
  newPass: Joi.string().optional(),
  currentPass: Joi.string().optional(),
});

export const getAppInfoSchema = Joi.object({
  typeId: Joi.number().integer().required(),
});

export const saveAppInfoSchema = Joi.object({
  termsOfServices: Joi.string().optional(),
  privacyPolicy: Joi.string().optional(),
  aboutApp: Joi.string().optional(),
});
export const getThreadDetailsByIdSchema = Joi.object({
  threadId: Joi.number().integer().required(),
});
export const deleteModeratorsSchema = Joi.object({
  adminId: Joi.number().integer().required(),
});

export const getModeratorLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  moderatorId: Joi.number().integer().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

export const addCustomModeratorLogSchema = Joi.object({
  activity: Joi.string().required().min(1).max(500),
  adminId: Joi.number().integer().required(),
});

export const addCustomUserLogSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().valid(1, 2, 3, 4, 5).required(),
  activity: Joi.string().required(),
  adminId: Joi.number().integer().required()
});

export const addCustomForumThreadLogSchema = Joi.object({
  forumId: Joi.number().integer().required(),
  adminId: Joi.number().integer().required(),
  customActivity: Joi.string().required().min(1).max(500)
});

export const getReportedUsersSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().optional()
});

export const markReportAsResolvedSchema = Joi.object({
  reportId: Joi.number().integer().required()
});

export const calculateToxicityScoreSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().valid(1, 2, 3).required()
});

export const generateThreadSummarySchema = Joi.object({
  threadId: Joi.number().integer().required(),
  isPrivate: Joi.boolean().default(false)
});

export const updateUserToxicityPercentageSchema = Joi.object({
  toxicityPercentage: Joi.number().integer().min(0).max(100).required(),
  reasoning: Joi.string().optional()
});

export const calculateUserToxicityWithReasoningSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().valid(1, 2, 3).required()
});

export const getAllCompanyInfoSchema = Joi.object({
  limit: Joi.number().integer().required(),
  offset: Joi.number().integer().required(),
  filters: Joi.object({
    type: Joi.string().valid('approved', 'unVerified', 'mute', 'suspend').optional(),
    search: Joi.string().optional(),
    industryId: Joi.string().optional(),
    currentMonth: Joi.boolean().optional(),
  })
    .allow("")
    .optional(),
});

export const getUsersAppealsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().allow("").optional(),
  status: Joi.alternatives().try(
    Joi.string().valid('active', 'suspended', 'muted'),
    Joi.array().items(Joi.string().valid('active', 'suspended', 'muted'))
  ).optional(),
  hasAppeal: Joi.boolean().optional(),
});


export const getRegistrationRequestsSchema = Joi.object({
  limit: Joi.number().integer().required(),
  offset: Joi.number().integer().required(),
  filters: Joi.object({
    role: Joi.string().valid("freelancer", "company", "employee").optional(),
    status: Joi.string().valid("active", "declined").optional(),
    search: Joi.string().optional(),
  })
    .allow("")
    .optional(),
});


export const getProfileUpdateRequestsSchema = Joi.object({
  limit: Joi.number().integer().min(1).default(10),
  offset: Joi.number().integer().min(0).default(0),
  filters: Joi.object({
    role: Joi.string().valid("freelancer", "company", "employee").optional(),
    search: Joi.string().optional(),
    industryId: Joi.alternatives().try(
      Joi.array().items(Joi.number()),
      Joi.string()
    ).optional(),
  }).optional(),
});
