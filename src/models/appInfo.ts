import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

export interface appInfoI {
  id?: number;
  aboutApp?: string;
  privacyPolicy?: string;
  termsOfServices?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "appInfo",
  tableName: "appInfo",
  timestamps: true,
})
export class appInfo extends Model<appInfoI> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.TEXT('long'))
  public aboutApp: string;

  @Column(DataType.TEXT('long'))
  public privacyPolicy: string;

  @Column(DataType.TEXT('long'))
  public termsOfServices: string;
}
