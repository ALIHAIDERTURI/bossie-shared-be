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

export interface pushNotificationI {
  id?: number;
  sendBy?: number;
  title?: string;
  body?: string;
  sendTo?: JSON;
  isSendToAll?: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "pushNotification",
  tableName: "pushNotification",
  timestamps: true,
})
export class pushNotification extends Model<pushNotificationI> {
  @BelongsTo((): typeof admin => admin)
  public admin: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public sendBy: number;

  @Column(DataType.STRING)
  public title: string;

  @Column(DataType.STRING)
  public body: string;

  @Column(DataType.JSON)
  public sendTo: JSON;

  @Column(DataType.TINYINT)
  public isSendToAll: boolean;

  @Column(DataType.STRING)
  public image: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
