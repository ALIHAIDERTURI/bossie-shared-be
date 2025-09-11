import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

export interface industryI {
  id?: number;
  categoryName?: string;
  serviceName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  modelName: "industry",
  tableName: "industry",
  timestamps: true,
})
export class industry extends Model<industryI> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.STRING)
  public categoryName: string;

  @Column(DataType.STRING)
  public serviceName: string;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;
}
