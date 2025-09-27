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
import { forumCategory } from "./forumCategory";

export interface forumSubCategoryI {
  id?: number;
  categoryId?: number;
  name?: string;
  description?: string;
  typeId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  priority?: number;
}

@Table({
  modelName: "forumSubCategory",
  tableName: "forumSubCategory",
  timestamps: true,
})
export class forumSubCategory extends Model<forumSubCategoryI> {
  @BelongsTo((): typeof forumCategory => forumCategory)
  public forumCategory: typeof forumCategory;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof forumCategory => forumCategory)
  @Column(DataType.INTEGER)
  public categoryId: number;

  @Column(DataType.STRING)
  public name: string;

  @Column(DataType.STRING)
  public description: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 999,
  })
  public priority: number;


  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public typeId: number;

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