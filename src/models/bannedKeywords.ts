import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";

export interface bannedKeywordsI {
  id?: number;
  keyword: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  modelName: "bannedKeywords",
  tableName: "bannedkeywords",
  timestamps: true,
})
export class bannedKeywords extends Model<bannedKeywordsI> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  public keyword: string;

  @CreatedAt
  @Column(DataType.DATE)
  public createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  public updatedAt: Date;
}
