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

export interface likeI {
  id?: number;
  userWhoLikeId?: number;
  employeeWhoLikeId?: number;
  toLikeId?: number;
  employeeToLikeId?: number;
  roleId?: number;
  toRoleId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "like",
  tableName: "like",
  timestamps: true,
})
export class like extends Model<likeI> {
  @BelongsTo((): typeof users => users, "userWhoLikeId")
  public users: typeof users;

  @BelongsTo((): typeof users => users, "toLikeId")
  public toLikeUser: typeof users;

  @BelongsTo((): typeof employee => employee, "employeeWhoLikeId")
  public employee: typeof employee;

  @BelongsTo((): typeof employee => employee, "employeeToLikeId")
  public toLikeEmp: typeof employee;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userWhoLikeId: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public employeeWhoLikeId: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public toLikeId: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public employeeToLikeId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.INTEGER)
  public toRoleId: number;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;
}
