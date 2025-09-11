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
import { admin } from "./admin";
import { employee } from "./employee";

export interface userLogI {
  id?: number;
  userId?: number;
  employeeId?: number;
  isProfileCreated?: boolean;
  profileCreatedOn?: Date;
  isVideoSubmitted?: boolean;
  videoSubmittedOn?: Date;
  isSuspend?: boolean;
  days?: number;
  isMuted?: boolean;
  isApproved?: boolean;
  suspendedBy?: number;
  mutedBy?: number;
  approvedBy?: number;
  unSuspendedBy?: number;
  rejectedBy?: number;
  unMutedBy?: number;
  suspendUntil?: Date;
  muteUntil?: Date;
  mutedOn?: Date;
  unMutedOn?: Date;
  suspendedOn?: Date;
  suspendReason?: string;
  muteReason?: string;
  rejectedReason?: string;
  unSuspendedOn?: Date;
  approvedOn?: Date;
  rejectedOn?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "userLog",
  tableName: "userLog",
  timestamps: true,
})
export class userLog extends Model<userLogI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

  @BelongsTo((): typeof admin => admin, "approvedBy")
  public approved: typeof admin;

  @BelongsTo((): typeof admin => admin, "suspendedBy")
  public suspend: typeof admin;

  @BelongsTo((): typeof admin => admin, "mutedBy")
  public mute: typeof admin;

  @BelongsTo((): typeof admin => admin, "unSuspendedBy")
  public unSuspend: typeof admin;

  @BelongsTo((): typeof admin => admin, "unMutedBy")
  public unMute: typeof admin;

  @BelongsTo((): typeof admin => admin, "rejectedBy")
  public reject: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public employeeId: number;

  @Column(DataType.INTEGER)
  public days: number;

  @Column(DataType.TINYINT)
  public isSuspend: boolean;

  @Column(DataType.TINYINT)
  public isMuted: boolean;

  @Column(DataType.TINYINT)
  public isApproved: boolean;

  @Column(DataType.TINYINT)
  public isProfileCreated: boolean;

  @Column(DataType.TINYINT)
  public isVideoSubmitted: boolean;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public suspendedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public mutedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public approvedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public unSuspendedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public unMutedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public rejectedBy: number;

  @Column(DataType.DATE)
  public suspendUntil: Date;

  @Column(DataType.DATE)
  public muteUntil: Date;

  @Column(DataType.DATE)
  public approvedOn: Date;

  @Column(DataType.DATE)
  public suspendedOn: Date;

  @Column(DataType.DATE)
  public unSuspendedOn: Date;

  @Column(DataType.DATE)
  public profileCreatedOn: Date;

  @Column(DataType.DATE)
  public videoSubmittedOn: Date;

  @Column(DataType.DATE)
  public rejectedOn: Date;

  @Column(DataType.DATE)
  public mutedOn: Date;

  @Column(DataType.STRING)
  public muteReason: string;

  @Column(DataType.STRING)
  public suspendReason: string;

  @Column(DataType.STRING)
  public rejectedReason: string;

  @Column(DataType.DATE)
  public unMutedOn: Date;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
