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
import { threads } from "./threads";

export interface threadLogI {
  id?: number;
  threadId?: number;
  isEdited?: boolean;
  editedBy?: number;
  isLocked?: boolean;
  lockedBy?: number;
  unLockedBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "threadLog",
  tableName: "threadLog",
  timestamps: true,
})
export class threadLog extends Model<threadLogI> {
  @BelongsTo((): typeof threads => threads)
  public threads: typeof threads;

  @BelongsTo((): typeof admin => admin, "unLockedBy")
  public unLocked: typeof admin;

  @BelongsTo((): typeof admin => admin, "lockedBy")
  public locked: typeof admin;

  @BelongsTo((): typeof admin => admin, "editedBy")
  public edited: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof threads => threads)
  @Column(DataType.INTEGER)
  public threadId: number;

  @Column(DataType.TINYINT)
  public isEdited: boolean;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public editedBy: number;

  @Column(DataType.TINYINT)
  public isLocked: boolean;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public lockedBy: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public unLockedBy: number;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}

//edit-1, locked-2, delete-3 , unlocked-4
