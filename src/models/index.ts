import {
  users,
  roleData,
  employee,
  notifications,
  forumCategory,
  forumSubCategory,
  threads,
  messages,
  like,
  industry,
  privateThreads,
  privateMessages,
  duplicateData,
  report,
  admin,
  userLog,
  adminLog,
  threadLog,
  pushNotification,
  userNotification,
  appInfo,
  moderatorPermissions,
  toxicityScores,
} from ".";

type ModelType = any;

export * from "./users";
export * from "./roleData";
export * from "./employee";
export * from "./notifications";
export * from "./forumCategory";
export * from "./forumSubCategory";
export * from "./threads";
export * from "./messages";
export * from "./like";
export * from "./industry";
export * from "./privateThreads";
export * from "./privateMessages";
export * from "./duplicateData";
export * from "./report";
export * from "./admin";
export * from "./userLog";
export * from "./adminLog";
export * from "./threadLog";
export * from "./pushNotification";
export * from "./userNotification";
export * from "./appInfo";
export * from "./moderatorPermissions";
export * from "./toxicityScores";

export const models: ModelType = [
  users,
  roleData,
  employee,
  notifications,
  forumCategory,
  forumSubCategory,
  threads,
  messages,
  like,
  industry,
  privateThreads,
  privateMessages,
  duplicateData,
  report,
  admin,
  userLog,
  adminLog,
  threadLog,
  pushNotification,
  userNotification,
  appInfo,
  moderatorPermissions,
  toxicityScores,
];
