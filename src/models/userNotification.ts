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
  privateThreadId?: number;
  threadId?: number;
  pMessageSenderId?: number;
  pMessageRoleId?: number;
  employeeId?: number; //company Employee ID
  content?: string;
  message?: string;
  seen?: boolean;
  typeId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

@Table({
  modelName: "userNotification",
  tableName: "userNotification",
  timestamps: true,
})
export class userNotification extends Model<userNotificationI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

  @BelongsTo((): typeof admin => admin)
  public admin: typeof admin;

  @BelongsTo((): typeof threads => threads)
  public threads: typeof threads;

  @BelongsTo((): typeof privateThreads => privateThreads)
  public privateThreads: typeof privateThreads;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public adminId: Number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: Number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public employeeId: Number;

  @Column(DataType.INTEGER)
  public pMessageSenderId: Number;

  @Column(DataType.INTEGER)
  public pMessageRoleId: Number;

  @ForeignKey((): typeof threads => threads)
  @Column(DataType.INTEGER)
  public threadId: Number;

  @ForeignKey((): typeof privateThreads => privateThreads)
  @Column(DataType.INTEGER)
  public privateThreadId: Number;

  @Column(DataType.TEXT)
  public content: string;

  @Column(DataType.TINYINT)
  public seen: Boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column(DataType.INTEGER)
  public typeId: number;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getTypeValue(this.getDataValue("typeId"));
    },
  })
  public typeValue: string;

  @Column(DataType.DATE)
  public updatedAt: Date;
}

const getTypeValue = (type: any) => {
  if (type === 1) return "Request Approved";
  if (type === 2) return "Request Declined";
  if (type === 3) return "New Message";
  if (type === 4) return "New Thread";
  return "";
};
