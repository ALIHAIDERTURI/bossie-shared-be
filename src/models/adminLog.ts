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
import { admin } from "./admin";

export interface adminLogI {
  id?: number;
  adminId?: number; // jis ka account suspend kya ja rha ha
  isSuspend?: boolean;
  days?: boolean;
  suspendedBy?: number; // jo kr rha ha
  unSuspendedBy?: number;
  suspendUntil?: Date;
  suspendedOn?: Date;
  unSuspendedOn?: Date;
  suspendReason?: string; // for custom activity logs
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "adminLog",
  tableName: "adminLog",
  timestamps: true,
})
export class adminLog extends Model<adminLogI> {
  @BelongsTo((): typeof admin => admin, "adminId")
  public info: typeof admin;

  @BelongsTo((): typeof admin => admin, "suspendedBy")
  public suspend: typeof admin;

  @BelongsTo((): typeof admin => admin, "unSuspendedBy")
  public unSuspend: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public adminId: number;

  @Column(DataType.INTEGER)
  public days: number;

  @Column(DataType.TINYINT)
  public isSuspend: boolean;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public suspendedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public unSuspendedBy: number;

  @Column(DataType.DATE)
  public suspendUntil: Date;

  @Column(DataType.DATE)
  public suspendedOn: Date;

  @Column(DataType.DATE)
  public unSuspendedOn: Date;

  @Column(DataType.STRING)
  public suspendReason: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}