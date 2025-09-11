import {
  AutoIncrement,
  Column,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { forumSubCategory } from "./forumSubCategory";

export interface forumCategoryI {
  id?: number;
  name?: string;
  description?: string;
  icon?: string;
  typeId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "forumCategory",
  tableName: "forumCategory",
  timestamps: true,
})
export class forumCategory extends Model<forumCategoryI> {
  @HasMany((): typeof forumSubCategory => forumSubCategory)
  public forumSubCategory: typeof forumSubCategory;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @Column(DataType.STRING)
  public name: string;

  @Column(DataType.STRING)
  public description: string;

  @Column(DataType.STRING)
  public icon: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public typeId: number;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getTypeStatusValue(this.getDataValue("typeId"));
    },
  })
  public typeStatusValue: string;
}

const getTypeStatusValue = (type: any) => {
  if (type === 1) return "Active";
  if (type === 2) return "Archived";
  return "";
};
