import {
  AutoIncrement,
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { adminLog } from "./adminLog";
import { moderatorPermissions } from "./moderatorPermissions";

export interface adminI {
  id?: number;
  name?: string;
  email?: string;
  password?: string;
  adminRoleId?: number;
  phone?: string;
  forgotPassOTP?: number;
  isForgotPassOtpUsed?: boolean;
  forgotPassOtpCreatedAt?: Date;
  loginOTP?: number;
  loginOtpUsed?: boolean;
  loginOtpCreatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  accountStatus?: number;
  mutedOn?: Date;
  suspendedOn?: Date;
  mutedDays?: number;
  suspendedDays?: number;
}

@Table({
  modelName: "admin",
  tableName: "admin",
  timestamps: true,
})
export class admin extends Model<adminI> {
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

  @Column(DataType.INTEGER)
  public adminRoleId: number;

  @Column(DataType.STRING)
  public phone: string;

  @Column(DataType.INTEGER)
  public forgotPassOTP: number;

  @Column(DataType.TINYINT)
  public isForgotPassOtpUsed: boolean;

  @Column(DataType.DATE)
  public forgotPassOtpCreatedAt: Date;
  @Column(DataType.INTEGER)
  public loginOTP: number;

  @Column(DataType.TINYINT)
  public loginOtpUsed: boolean;

  @Column(DataType.DATE)
  public loginOtpCreatedAt: Date;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

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

  @Column(DataType.INTEGER)
  public mutedDays: number;

  @Column(DataType.INTEGER)
  public suspendedDays: number;

  @Column(DataType.DATE)
  public suspendedOn: Date;

  @Column(DataType.DATE)
  public mutedOn: Date;

  @HasMany(() => adminLog, { foreignKey: "adminId", as: "adminLogs" })
  public adminLogs: adminLog[];

  @HasMany(() => moderatorPermissions, { foreignKey: "moderatorId", as: "permissions" })
  public permissions: moderatorPermissions[];

}

const getAccountStatusValue = (type: any) => {
  if (type === 1) return "available";
  if (type === 2) return "unavailable";
  if (type === 3) return "suspended";
  if (type === 4) return "muted";
  if (type === 5) return "archived";
  return "";
};