import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  PrimaryKey,
} from "sequelize-typescript";
import { threads } from "./threads";
import { employee } from "./employee"; // Admins/moderators table

export interface postAuditTrailI {
  id?: number;
  threadId: number;
  adminId: number;
  action: string; // "delete" | "hide" | "edit"
  reason: string;
  createdAt?: Date;
}

@Table({
  modelName: "postAuditTrail",
  tableName: "postAuditTrail",
  timestamps: true,
  updatedAt: false, // We don’t need updatedAt, only createdAt
})
export class postAuditTrail extends Model<postAuditTrailI> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey(() => threads)
  @Column(DataType.INTEGER)
  public threadId: number;

  @BelongsTo(() => threads)
  public post: threads;

  @ForeignKey(() => employee) // Admin/moderator who did the action
  @Column(DataType.INTEGER)
  public adminId: number;

  @BelongsTo(() => employee)
  public admin: employee;

  @Column(DataType.STRING)
  public action: string; // delete | hide | edit

  @Column(DataType.TEXT)
  public reason: string;

  @Column(DataType.DATE)
  public createdAt: Date;
}
