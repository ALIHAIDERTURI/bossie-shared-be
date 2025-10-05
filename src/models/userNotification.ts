import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { users } from "./users";
import { employee } from "./employee";
import { report } from "./report";
import { admin } from "./admin";
import { threads } from "./threads";
import { privateThreads } from "./privateThreads";

export interface userNotificationI {
  id?: number;
  adminId?: number;
  userId?: number;
  employeeId?: number; //company Employee ID
  privateThreadId?: number;
  threadId?: number;
  pMessageSenderId?: number;
  pMessageRoleId?: number;
  reportId?: number | null; // From notifications table - for report-related notifications
  content?: string;
  message?: string;
  contentDE?: string | null; // From notifications table - German content
  title?: string | null; // For custom notifications and better UX
  seen?: boolean;
  typeId?: number;
  Status?: string | null; // From notifications table - pending, approved, etc.
  StatusKey?: number | null; // From notifications table - status key
  isCustom?: boolean | null; // Distinguish between custom admin notifications and auto-generated ones
  metadata?: JSON | null; // Additional data like rejection reasons, etc.
  updatedBy?: number | null; // From notifications table
  deletedBy?: number | null; // From notifications table
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({
  modelName: "userNotification",
  tableName: "userNotification",
  timestamps: true,
  paranoid: true,
})
export class userNotification extends Model<userNotificationI> {
  @BelongsTo((): typeof users => users, { foreignKey: 'userId' })
  public users: typeof users;

  @BelongsTo((): typeof employee => employee, { foreignKey: 'employeeId' })
  public employee: typeof employee;

  @BelongsTo((): typeof admin => admin, { foreignKey: 'adminId' })
  public admin: typeof admin;

  @BelongsTo((): typeof threads => threads, { foreignKey: 'threadId' })
  public threads: typeof threads;

  @BelongsTo((): typeof privateThreads => privateThreads, { foreignKey: 'privateThreadId' })
  public privateThreads: typeof privateThreads;

  @BelongsTo((): typeof report => report, { foreignKey: 'reportId' })
  public report: typeof report;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.INTEGER)
  public adminId: Number;

  @Column(DataType.INTEGER)
  public userId: Number;

  @Column(DataType.INTEGER)
  public employeeId: Number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  public reportId: Number;

  @Column(DataType.INTEGER)
  public pMessageSenderId: Number;

  @Column(DataType.INTEGER)
  public pMessageRoleId: Number;

  @Column(DataType.INTEGER)
  public threadId: Number;

  @Column(DataType.INTEGER)
  public privateThreadId: Number;

  @Column(DataType.TEXT)
  public content: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  public contentDE: string;

  @Column({ type: DataType.STRING, allowNull: true })
  public title: string;

  @Column(DataType.TEXT)
  public message: string;

  @Column(DataType.TINYINT)
  public seen: Boolean;

  @Column(DataType.INTEGER)
  public typeId: number;

  @Column({ type: DataType.TEXT, allowNull: true })
  public Status: string;

  @Column({ type: DataType.BIGINT, allowNull: true })
  public StatusKey: Number;

  @Column({ type: DataType.BOOLEAN, allowNull: true, defaultValue: false })
  public isCustom: Boolean;

  @Column({ type: DataType.JSON, allowNull: true })
  public metadata: JSON;

  @Column({ type: DataType.INTEGER, allowNull: true })
  public updatedBy: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  public deletedBy: number;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getTypeValue(this.getDataValue("typeId"));
    },
  })
  public typeValue: string;
}

const getTypeValue = (type: any) => {
  // User/Employee approval/rejection notifications
  if (type === 1) return "Request Approved";
  if (type === 2) return "Request Declined";
  
  // Message notifications
  if (type === 3) return "New Message";
  
  // Thread notifications
  if (type === 4) return "New Thread";
  
  // Report notifications (from notifications table)
  if (type === 5) return "User Report";
  if (type === 6) return "Forum Report";
  if (type === 7) return "Personal Chat Report";
  
  // Profile update notifications
  if (type === 8) return "Profile Update Approved";
  if (type === 9) return "Profile Update Rejected";
  
  // Account status notifications
  if (type === 10) return "Account Muted";
  if (type === 11) return "Account Unmuted";
  if (type === 12) return "Account Suspended";
  if (type === 13) return "Account Unsuspended";
  
  // Custom admin notifications
  if (type === 14) return "Custom Notification";
  
  return "Unknown Notification";
};
