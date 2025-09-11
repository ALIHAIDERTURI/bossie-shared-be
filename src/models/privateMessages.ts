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
import { privateThreads } from "./privateThreads";
import { employee } from "./employee";

export interface privateMessagesI {
  id?: number;
  empId?: number;
  userId?: number;
  roomId?: number;
  roleId?: number;
  message?: string;
  img?: string;
  createdAt?: Date;
  updatedAt?: Date;
  seen?: boolean;
  deletedAt?: Date | null;
}

@Table({
  modelName: "privateMessages",
  tableName: "privateMessages",
  timestamps: true,
})
export class privateMessages extends Model<privateMessagesI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

  @BelongsTo((): typeof privateThreads => privateThreads)
  public privateThreads: typeof privateThreads;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public empId: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number;

  @ForeignKey((): typeof privateThreads => privateThreads)
  @Column(DataType.INTEGER)
  public roomId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.STRING)
  public message: string;

  @Column(DataType.STRING)
  public img: string;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  public seen: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
