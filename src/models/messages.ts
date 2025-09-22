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
import { threads } from "./threads";
import { admin } from "./admin";
import { employee } from "./employee";

export interface messagesI {
  id?: number;
  empId?: number;
  userId?: number | null;
  roomId?: number;
  roleId?: number;
  message?: string;
  img?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "messages",
  tableName: "messages",
  timestamps: true,
})
export class messages extends Model<messagesI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

  @BelongsTo((): typeof threads => threads)
  public threads: typeof threads;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number | null;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public empId: number;

  @ForeignKey((): typeof threads => threads)
  @Column(DataType.INTEGER)
  public roomId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.STRING)
  public message: string;

  @Column(DataType.STRING)
  public img: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
