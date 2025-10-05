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

export interface notificationsI {
  id?: number;
  userId?: number; //Company or freelancer
  employeeId?: number; //company Employee ID
  reportId?: number;
  Status?: string;
  StatusKey?: number;
  content?: string;
  contentDE?: string;
  seen?: boolean;
  typeId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  updatedBy?: number;
  deletedBy?: number;
}

@Table({
  modelName: "notifications",
  tableName: "notifications",
  timestamps: true,
})
export class notifications extends Model<notificationsI> {
  @BelongsTo((): typeof users => users, { foreignKey: 'userId' })
  public users: typeof users;

  @BelongsTo((): typeof employee => employee, { foreignKey: 'employeeId' })
  public employee: typeof employee;

  @BelongsTo((): typeof report => report, { foreignKey: 'reportId' })
  public report: typeof report;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.INTEGER)
  public userId: Number;

  @Column(DataType.INTEGER)
  public employeeId: Number;

  @Column(DataType.INTEGER)
  public reportId: Number;

  @Column(DataType.BIGINT)
  public StatusKey: Number;

  @Column(DataType.TEXT)
  public Status: string;

  @Column(DataType.TEXT)
  public content: string;

  @Column(DataType.TEXT)
  public contentDE: string;

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

  @Column(DataType.INTEGER)
  public deletedBy: number;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.INTEGER)
  public updatedBy: number;
}

const getTypeValue = (type: any) => {
  if (type === 1) return "Company Join App";
  if (type === 2) return "Employee Join App";
  if (type === 3) return "Freelancer Join App";
  if (type === 4) return "Information Update";
  if (type === 5) return "User Report";
  if (type === 6) return "Forum Report";
  if (type === 7) return "Personal Chat Report";
  return "";
};

const getStatusValue = (type: any) => {
  if (type === 1) return "approved";
  if (type === 2) return "decline";
  if (type === 3) return "pending";
  return "";
};
