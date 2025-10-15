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
import { privateMessages } from "./privateMessages";
import { employee } from "./employee";

export interface privateThreadsI {
  id?: number;
  ownerEmpId?: number;
  ownerUserId?: number;
  roleId?: number;
  toRoleId?: number;
  title?: string;
  toUserId?: number;
  toEmpId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  aiSummary?: string | null;
  aiSummaryUpdatedAt?: Date | null;
}

@Table({
  modelName: "privateThreads",
  tableName: "privateThreads",
  timestamps: true,
})
export class privateThreads extends Model<privateThreadsI> {
  @HasMany((): typeof privateMessages => privateMessages)
  public privateMessages: typeof privateMessages;

  @BelongsTo((): typeof users => users, "ownerUserId")
  public users: typeof users;

  @BelongsTo((): typeof users => users, "toUserId")
  public toUsers: typeof users;

  @BelongsTo((): typeof employee => employee, "ownerEmpId")
  public employee: typeof employee;

  @BelongsTo((): typeof employee => employee, "toEmpId")
  public toEmployee: typeof employee;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public ownerUserId: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public ownerEmpId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.INTEGER)
  public toRoleId: number;

  @Column(DataType.STRING)
  public title: string;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public toEmpId: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public toUserId: number;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column(DataType.TEXT('long'))
  public aiSummary: string | null;

  @Column(DataType.DATE)
  public aiSummaryUpdatedAt: Date | null;
}
