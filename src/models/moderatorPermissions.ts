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

export interface moderatorPermissionsI {
  id?: number;
  moderatorId?: number;
  userManagement?: boolean;
  companyManagement?: boolean;
  newRegistrationRequests?: boolean;
  profileUpdateRequests?: boolean;
  forums?: boolean;
  reportedChats?: boolean;
  moderatorManagement?: boolean;
  pushNotifications?: boolean;
  restoreOldData?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "moderatorPermissions",
  tableName: "moderatorPermissions",
  timestamps: true,
})
export class moderatorPermissions extends Model<moderatorPermissionsI> {
  @BelongsTo((): typeof admin => admin, "moderatorId")
  public moderator: typeof admin;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof admin => admin)
  @Column(DataType.INTEGER)
  public moderatorId: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public userManagement: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public companyManagement: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public newRegistrationRequests: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public profileUpdateRequests: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public forums: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public reportedChats: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public moderatorManagement: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public pushNotifications: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  public restoreOldData: boolean;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;
}
