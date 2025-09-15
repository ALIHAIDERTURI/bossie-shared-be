import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { users } from "./users";
import { userLog } from "./userLog";
import { duplicateData } from "./duplicateData";
import { admin } from "./admin";

export interface employeeI {
  id?: number;
  userId?: number;
  profile?: string;
  firstName?: string;
  lastName?: string;
  currentSituationName?: string;
  currentSituationId?: number;
  email?: string;
  phone?: string;
  password?: string;
  isApproved?: boolean;
  forgotPassOTP?: string;
  isForgotPassOtpUsed?: boolean;
  forgotPassOtpCreatedAt?: Date;
  firstTimeLogin?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  accountStatus?: number;
  profileStatus?: number;
  rejectionReason?: string;
  mutedOn?: Date;
  suspendedOn?: Date;
  mutedDays?: number;
  suspendedDays?: number;
  suspendReason?: string;
  fcmToken?: string;
  muteReason?: string;
  rejectedBy?: number;
  appealMessage?: string;
  hasAppeal?: boolean;

}

@Table({
  modelName: "employee",
  tableName: "employee",
  timestamps: true,
})
export class employee extends Model<employeeI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @HasMany((): typeof userLog => userLog)
  public userLog: typeof userLog;

  @BelongsTo((): typeof admin => admin)
  public admin: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number;

  @Column(DataType.STRING)
  public profile: string;

  @Column(DataType.STRING)
  public firstName: string;

  @Column(DataType.STRING)
  public lastName: string;

  @Column(DataType.INTEGER)
  public currentSituationId: number;

  @Column(DataType.STRING)
  public email: string;

  @Column(DataType.STRING)
  public phone: string;

  @Column(DataType.STRING)
  public password: string;

  @Column(DataType.STRING)
  public forgotPassOTP: string;

  @Column(DataType.TINYINT)
  public isForgotPassOtpUsed: boolean;

  @Column(DataType.DATE)
  public forgotPassOtpCreatedAt: Date;

  @Column(DataType.TINYINT)
  public firstTimeLogin: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public rejectedBy: number;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getRoleValue(this.getDataValue("currentSituationId"));
    },
  })
  public currentSituationValue: string;

  @Column(DataType.TINYINT)
  public isApproved: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public accountStatus: number;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getAccountStatusValue(this.getDataValue("accountStatus"));
    },
  })
  public accountStatusValue: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 2,
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
  public currentSituationName: string;

  @Column(DataType.INTEGER)
  public mutedDays: number;

  @Column(DataType.INTEGER)
  public suspendedDays: number;

  @Column(DataType.DATE)
  public suspendedOn: Date;

  @Column(DataType.DATE)
  public mutedOn: Date;

  @Column(DataType.STRING)
  public fcmToken: string;

  @Column(DataType.STRING)
  public suspendReason: string;

  @Column(DataType.STRING)
  public muteReason: string;

  @Column(DataType.TEXT('long'))
  public appealMessage: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public hasAppeal: boolean;
}

const getRoleValue = (type: any) => {
  if (type === 1) return "Freelancer";
  if (type === 2) return "Company";
  if (type === 3) return "Employee";
  if (type === 4) return "Hobbyist/Student";
  if (type === 5) return "Other";
  return "";
};

const getAccountStatusValue = (type: any) => {
  if (type === 1) return "available";
  if (type === 2) return "unavailable";
  if (type === 3) return "suspended";
  if (type === 4) return "muted";
  return "";
};

const getProfileStatusValue = (type: any) => {
  if (type === 1) return "Not-Submitted";
  if (type === 2) return "Pending";
  if (type === 3) return "Approved";
  if (type === 4) return "Rejected";
  if (type === 7) return "Edit";
  return "";
};
