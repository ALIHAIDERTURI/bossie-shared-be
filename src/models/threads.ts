import {
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { forumSubCategory } from "./forumSubCategory";
import { forumCategory } from "./forumCategory";
import { users } from "./users";
import { messages } from "./messages";
import { employee } from "./employee";

export interface threadsI {
  id?: number;
  ownerEmpId?: number;
  ownerId?: number;
  roleId?: number;
  title?: string;
  typeId?: number;
  categoryId?: number;
  subCategoryId?: number;
  description?: string;
  logo?: string;
  locked?: boolean | null;
  suggested?: boolean;
  pinned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  hidden?: boolean | null;
  aiSummary?: string | null;
  aiSummaryUpdatedAt?: Date | null;
}

@Table({
  modelName: "threads",
  tableName: "threads",
  timestamps: true,
})
export class threads extends Model<threadsI> {
  @BelongsTo((): typeof forumCategory => forumCategory)
  public forumCategory: typeof forumCategory;

  @BelongsTo((): typeof forumSubCategory => forumSubCategory)
  public forumSubCategory: typeof forumSubCategory;

  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

  @HasMany((): typeof messages => messages)
  public messages: typeof messages;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public ownerId: number;

  @ForeignKey((): typeof employee => employee)
  @Column(DataType.INTEGER)
  public ownerEmpId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.STRING)
  public title: string;

  @ForeignKey((): typeof forumCategory => forumCategory)
  @Column(DataType.INTEGER)
  public categoryId: number;

  @ForeignKey((): typeof forumSubCategory => forumSubCategory)
  @Column(DataType.INTEGER)
  public subCategoryId: number;

  @Column(DataType.TEXT('long'))
  public description: string;

  @Column(DataType.STRING)
  public logo: string;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  public locked: boolean | null;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  public hidden: boolean | null;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  public suggested: boolean;

  @Column({
    type: DataType.TINYINT,
    defaultValue: 0,
  })
  public pinned: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date | null;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public typeId: number;

  @Column(DataType.TEXT('long'))
  public aiSummary: string | null;

  @Column(DataType.DATE)
  public aiSummaryUpdatedAt: Date | null;

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
