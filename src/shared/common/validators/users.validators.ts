import * as Joi from "joi";

export default {
  type: "object",
  properties: {},
} as const;

export const createAccountSchema = Joi.object({
  name: Joi.string().allow("", null).optional(),
  email: Joi.string().required(),
  phone: Joi.string().optional(),
  roleId: Joi.number().integer().required(),
  password: Joi.string().required(),
  confirmPassword: Joi.string().required(),

  //   filters: Joi.object({
  //     sortBy: Joi.string().allow(""),
  //   })
  //     .allow("")
  //     .optional(),
});
export const addVideoSchema = Joi.object({
  videoKey: Joi.string().required(),
  video: Joi.string().required(),
  roleId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
});

export const resendOtpSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  atLogin: Joi.boolean().required(),
});

export const validateOtpSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  OTP: Joi.string().required(),
  atLogin: Joi.boolean().required(),
  fcmToken: Joi.string().allow("", null).optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  id: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  password: Joi.string().required(),
  confirmPassword: Joi.string().required(),
});

export const loginUserSchema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string().required(),
  fcmToken: Joi.string().allow("", null).optional(),
});

export const createProfileSchema = Joi.object({
  id: Joi.number().integer().required(),
  profile: Joi.string().optional(),
  companyName: Joi.string().optional(),
  streetName: Joi.string().optional(),
  houseName: Joi.string().optional(),
  city: Joi.string().optional(),
  province: Joi.string().optional(),
  postalCode: Joi.string().optional(),
  chamberCommerceNumber: Joi.string().allow("", null).optional(),
  industryId: Joi.array().optional(),
  industryName: Joi.array().optional(),
  website: Joi.string().optional(),
  about: Joi.string().optional(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  title: Joi.string().optional(),
  dob: Joi.string().optional(),
  hourlyRate: Joi.string().optional(),
  address: Joi.string().optional(),
  languageId: Joi.array().optional(),
  genderId: Joi.number().integer().optional(),
  age: Joi.number().integer().optional(),
  educationalAttainmentId: Joi.number().integer().optional(),
  currentSituationId: Joi.number().integer().optional(),
  currentSituationName: Joi.string().allow("", null).optional(),
});

export const addEmployeeSchema = Joi.object({
  userId: Joi.number().integer().required(),
  profile: Joi.string().optional(),
  firstName: Joi.string().required(),
  lastName: Joi.string().optional(),
  currentSituationId: Joi.number().integer().allow("", null).optional(),
  currentSituationName: Joi.string().allow("", null).optional(),
  email: Joi.string().required(),
  phone: Joi.string().required(),
  password: Joi.string().required(),
});

export const deleteAccountSchema = Joi.object({
  id: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});

export const defaultSchema = Joi.object({
  id: Joi.number().integer().required(),
});

export const userDefaultSchema = Joi.object({
  userId: Joi.number().integer().required(),
});

export const getAppStatusSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});

export const profileDefaultSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});

export const getProfileSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
});
export const UserSchema = Joi.object({
  userId: Joi.number().integer().required(),
});

export const getUserByIdSchema = Joi.object({
  userId: Joi.number().integer().required(),
  typeId: Joi.number().integer().required(),
  employeeId: Joi.number().integer().optional(),
});

export const updatePasswordSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  currentPass: Joi.string().required(),
  newPass: Joi.string().required(),
  confirmPass: Joi.string().required(),
});

export const saveTokenSchema = Joi.object({
  userId: Joi.number().integer().required(),
  roleId: Joi.number().integer().required(),
  token: Joi.string().required(),
});

export const sendPushNotificationsSchema = Joi.object({
  sendBy: Joi.number().integer().required(),
  title: Joi.string().required().messages({
    "string.empty": "Title is required",
  }),
  body: Joi.string().required().messages({
    "string.empty": "Body is required",
  }),
  sendTo: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().required().messages({
          "number.base": "ID must be a number",
          "any.required": "ID is required in each sendTo object",
        }),
        roleId: Joi.number().required().messages({
          "number.base": "Role ID must be a number",
          "any.required": "Role ID is required in each sendTo object",
        }),
        name: Joi.string().required().messages({
          "string.empty": "Name is required",
        }),
      })
    )
    .allow(null) // This allows `sendTo` to be `null`
    .optional() // `sendTo` is optional
    .messages({
      "array.base": "sendTo must be an array or null",
    }),
  isSendToAll: Joi.boolean().optional().messages({
    "boolean.base": "isSendToAll must be a boolean",
  }),
  image: Joi.string().allow(null, "").optional().messages({
    "string.base": "Image must be a string",
  }),
});

export const getAllCombineUsersSchema = Joi.object({
  name: Joi.string().optional(),
  filters: Joi.object({
    roleId: Joi.string().optional(), // "1,2,3" for multiple selections
    accountStatus: Joi.string().optional(), // "1,2,3,4" for multiple selections
    profileStatus: Joi.string().optional(), // "2,3" for multiple selections
    currentMonth: Joi.boolean().optional(), // Filter by current month registration
    lastLogin: Joi.string().optional(), // "today,week,month,quarter"
    industryId: Joi.string().optional(), // "1,2,3" for multiple industries
    userName: Joi.string().optional(), // Search by display name
  }).optional(),
});
