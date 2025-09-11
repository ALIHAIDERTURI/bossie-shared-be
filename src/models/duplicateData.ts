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
import { employee } from "./employee";

export interface duplicateDataI {
  id?: number;
  userId?: number;
  employeeId?: number;
  profile?: string;
  companyName?: string;
  streetName?: string;
  houseName?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  chamberCommerceNumber?: string;
  website?: string;
  industryId?: JSON;
  industryName?: JSON;
  about?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  genderId?: number;
  dob?: string;
  age?: number;
  address?: string;
  currentSituationName?: string;
  educationalAttainmentId?: number;
  currentSituationId?: number;
  hourlyRate?: string;
  languageId?: JSON;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  phone?: string;

}

@Table({
  modelName: "duplicateData",
  tableName: "duplicateData",
  timestamps: true,
})
export class duplicateData extends Model<duplicateDataI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @BelongsTo((): typeof employee => employee)
  public employee: typeof employee;

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

  @Column(DataType.STRING)
  public profile: string;

  @Column(DataType.STRING)
  public companyName: string;

  @Column(DataType.STRING)
  public streetName: string;

  @Column(DataType.STRING)
  public houseName: string;

  @Column(DataType.STRING)
  public city: string;

  @Column(DataType.STRING)
  public province: string;

  @Column(DataType.STRING)
  public postalCode: string;

  @Column(DataType.STRING)
  public phone: string;

  @Column(DataType.STRING)
  public currentSituationName: string;

  @Column(DataType.STRING)
  public chamberCommerceNumber: string;

  @Column(DataType.STRING)
  public website: string;

  @Column(DataType.JSON)
  public industryId: JSON;

  @Column(DataType.JSON)
  public industryName: JSON;

  @Column(DataType.TEXT('long'))
  public about: string;

  @Column(DataType.STRING)
  public firstName: string;

  @Column(DataType.STRING)
  public lastName: string;

  @Column(DataType.STRING)
  public title: string;

  @Column(DataType.INTEGER)
  public genderId: number;

  @Column(DataType.STRING)
  public dob: string;

  @Column(DataType.INTEGER)
  public age: number;

  @Column(DataType.STRING)
  public address: string;

  @Column(DataType.INTEGER)
  public educationalAttainmentId: number;

  @Column(DataType.INTEGER)
  public currentSituationId: number;

  @Column(DataType.STRING)
  public hourlyRate: string;

  @Column(DataType.JSON)
  public languageId: JSON;

  @Column(DataType.TINYINT)
  public isApproved: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getCurrentSituationValue(this.getDataValue("currentSituationId"));
    },
  })
  public CurrentSituationValue: string;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getEucationalAttainmentValue(
        this.getDataValue("educationalAttainmentId")
      );
    },
  })
  public educationalAttainmentValue: string;
}

const getCurrentSituationValue = (type: any) => {
  if (type === 1) return "Freelance/ZZP";
  if (type === 2) return "Company";
  if (type === 3) return "Employee";
  if (type === 4) return "Hobbyist/Student";
  if (type === 5) return "Other";
  return "";
};

const getEucationalAttainmentValue = (type: any) => {
  if (type === 1) return "High School";
  if (type === 2) return "Company";
  if (type === 3) return "Employee";
  if (type === 4) return "Hobbyist/Student";
  if (type === 5) return "Other";
  return "";
};
