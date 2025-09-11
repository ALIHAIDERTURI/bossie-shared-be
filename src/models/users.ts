import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { roleData } from "./roleData";
import { notifications } from "./notifications";
import { threads } from "./threads";
import { like } from "./like";
import { privateThreads } from "./privateThreads";
import { privateMessages } from "./privateMessages";
import { userLog } from "./userLog";
import { employee } from "./employee";
import { admin } from "./admin";

export interface userI {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  roleId?: number;
  rejectedBy?: number;
  OTP?: string;
  forgotPassOTP?: string;
  phone?: string;
  emailVerified?: boolean;
  isOtpUsed?: boolean;
  isForgotPassOtpUsed?: boolean;
  otpCreatedAt?: Date;
  forgotPassOtpCreatedAt?: Date;
  firstTimeLogin?: boolean;
  profileStatus?: number;
  rejectionReason?: string;
  fcmToken?: string;
  appealMessage?: string;
  hasAppeal?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  // mutedOn?: Date;
  // suspendedOn?: Date;
  // mutedDays?: number;
  // suspendedDays?: number;
}

@Table({
  modelName: "users",
  tableName: "users",
  timestamps: true,
})
export class users extends Model<userI> {
  @HasMany((): typeof notifications => notifications)
  public notifications: typeof notifications;

  @HasMany((): typeof userLog => userLog)
  public userLog: typeof userLog;

  @HasMany((): typeof employee => employee)
  public employee: typeof employee;

  @HasMany((): typeof threads => threads)
  public threads: typeof threads;

  @HasMany((): typeof privateThreads => privateThreads)
  public privateThreads: typeof privateThreads;

  @HasMany((): typeof privateMessages => privateMessages)
  public privateMessages: typeof privateMessages;

  @HasMany((): typeof like => like)
  public like: typeof like;

  @HasOne((): typeof roleData => roleData)
  public roleData: typeof roleData;

  @BelongsTo((): typeof admin => admin)
  public admin: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.STRING)
  public name: string;

  @Column(DataType.STRING)
  public email: string;

  @Column(DataType.STRING)
  public password: string;

  @Column(DataType.STRING)
  public phone: string;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.STRING)
  public OTP: string;

  @Column(DataType.STRING)
  public forgotPassOTP: string;

  @Column(DataType.TINYINT)
  public emailVerified: boolean;

  @Column(DataType.TINYINT)
  public isOtpUsed: boolean;

  @Column(DataType.TINYINT)
  public isForgotPassOtpUsed: boolean;

  @Column(DataType.DATE)
  public otpCreatedAt: Date;

  @Column(DataType.DATE)
  public forgotPassOtpCreatedAt: Date;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 1, // Represents true in TINYINT
  })
  public firstTimeLogin: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getRoleValue(this.getDataValue("roleId"));
    },
  })
  public roleName: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public profileStatus: number;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getProfileStatusValue(this.getDataValue("profileStatus"));
    },
  })
  public profileStatusValue: string;

  @Column(DataType.STRING)
  public rejectionReason: string;

  @Column(DataType.STRING)
  public fcmToken: string;

  @Column(DataType.TEXT('long'))
  public appealMessage: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public hasAppeal: boolean;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public rejectedBy: number;

  // @Column(DataType.INTEGER)
  // public mutedDays: number;

  // @Column(DataType.INTEGER)
  // public suspendedDays: number;

  // @Column(DataType.DATE)
  // public suspendedOn: Date;

  // @Column(DataType.DATE)
  // public mutedOn: Date;
}

// const getRoleValue = (type: any) => {
//   if (type === 1) return "Freelancer";
//   if (type === 2) return "Company";
//   // if (type === 3) return "Employee";
//   if (type === 4) return "Hobbyist/Student";
//   if (type === 5) return "Other";
//   return "";
// };


const getRoleValue = (type: any) => {
  if (type === 1) return "Freelancer";
  if (type === 2) return "Company";
  // if (type === 3) return "Employee";
  if (type === 4) return "Hobbyist/Student";
  if (type === 5) return "Other";
  return "";
};

const getProfileStatusValue = (type: any) => {
  if (type === 1) return "Not-Submitted";
  if (type === 2) return "Pending";
  if (type === 3) return "Approved";
  if (type === 4) return "Rejected";
  if (type === 5) return "Partial Deleted";
  if (type === 6) return "Video not submitted";
  if (type === 7) return "Edit";
  return "";
};
