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
  title?: string | null;
  body?: string | null;
  sendTo?: JSON | null;
  isSendToAll?: boolean | null;
  image?: string | null;
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

  @ForeignKey(() => admin)
  @Column(DataType.INTEGER)
  public sendBy: number;

  @Column({ type: DataType.STRING, allowNull: true })
  public title: string;

  @Column({ type: DataType.STRING, allowNull: true })
  public body: string;

  @Column({ type: DataType.JSON, allowNull: true })
  public sendTo: JSON;

  @Column({ type: DataType.TINYINT, allowNull: true, defaultValue: false })
  public isSendToAll: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  public image: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
