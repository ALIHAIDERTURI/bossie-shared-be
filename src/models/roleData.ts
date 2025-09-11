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

export interface roleDataI {
  id?: number;
  userId?: number;
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
  video?: string;
  videoKey?: string;
  educationalAttainmentId?: number;
  currentSituationId?: number;
  hourlyRate?: string;
  suspendReason?: string;
  muteReason?: string;
  languageId?: JSON;
  isApproved?: boolean;
  // available?: boolean;
  accountStatus?: number;

  isVideoSubmitted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
  mutedOn?: Date;
  suspendedOn?: Date;
  mutedDays?: number;
  suspendedDays?: number;
}

@Table({
  modelName: "roleData",
  tableName: "roleData",
  timestamps: true,
})
export class roleData extends Model<roleDataI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number;

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

  @Column(DataType.STRING)
  public suspendReason: string;

  @Column(DataType.INTEGER)
  public educationalAttainmentId: number;

  @Column(DataType.INTEGER)
  public currentSituationId: number;

  @Column(DataType.STRING)
  public hourlyRate: string;

  @Column(DataType.STRING)
  public video: string;

  @Column(DataType.STRING)
  public videoKey: string;

  @Column(DataType.STRING)
  public muteReason: string;

  @Column(DataType.JSON)
  public languageId: JSON;

  @Column(DataType.TINYINT)
  public isApproved: boolean;

  @Column(DataType.TINYINT)
  public isVideoSubmitted: boolean;

  // @Column(DataType.TINYINT)
  // public available: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  public accountStatus: number;

  @Column(DataType.INTEGER)
  public mutedDays: number;

  @Column(DataType.INTEGER)
  public suspendedDays: number;

  @Column(DataType.DATE)
  public suspendedOn: Date;

  @Column(DataType.DATE)
  public mutedOn: Date;

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

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return getAccountStatusValue(this.getDataValue("accountStatus"));
    },
  })
  public accountStatusValue: string;
}

const getCurrentSituationValue = (type: any) => {
  if (type === 1) return "entrepreneur";
  if (type === 2) return "freelancer-zzp";
  if (type === 3) return "retired";
  if (type === 4) return "employed";
  if (type === 5) return "student";
  if (type === 6) return "other";
  return "";
};

const getEucationalAttainmentValue = (type: any) => {
  if (type === 1) return "high-school";
  if (type === 2) return "mbo";
  if (type === 3) return "hbo";
  if (type === 4) return "university";
  return "";
};

const getAccountStatusValue = (type: any) => {
  if (type === 1) return "available";
  if (type === 2) return "unavailable";
  if (type === 3) return "suspended";
  if (type === 4) return "muted";
  return "";
};
