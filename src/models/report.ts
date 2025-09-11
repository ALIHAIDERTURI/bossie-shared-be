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
import { privateThreads } from "./privateThreads";
import { threads } from "./threads";

export interface reportI {
  id?: number;
  userId?: number;
  reportedUserId?: number;
  roleId?: number;
  reportedRoleId?: number;
  reportedP_ThreadId?: number;
  reportedThreadId?: number;
  statusId?: number;
  problem?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "report",
  tableName: "report",
  timestamps: true,
})
export class report extends Model<reportI> {
  @BelongsTo((): typeof privateThreads => privateThreads)
  public privateThreads: typeof privateThreads;

  @BelongsTo((): typeof threads => threads)
  public threads: typeof threads;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.INTEGER)
  public userId: number;

  @Column(DataType.INTEGER)
  public reportedUserId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.INTEGER)
  public statusId: number;

  @Column(DataType.INTEGER)
  public reportedRoleId: number;

  @ForeignKey((): typeof privateThreads => privateThreads)
  @Column(DataType.INTEGER)
  public reportedP_ThreadId: number;

  @ForeignKey((): typeof threads => threads)
  @Column(DataType.INTEGER)
  public reportedThreadId: number;

  @Column(DataType.STRING)
  public problem: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column(DataType.JSON)
  public messageDetail: object;
}
