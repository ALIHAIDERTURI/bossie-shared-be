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

export interface toxicityScoresI {
  id?: number;
  userId?: number;
  roleId?: number;
  toxicityScore?: number;
  summary?: string;
  analysis?: string;
  conversationCount?: number;
  analyzedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Table({
  modelName: "toxicityScores",
  tableName: "toxicity_scores",
  timestamps: true,
})
export class toxicityScores extends Model<toxicityScoresI> {
  @BelongsTo((): typeof users => users)
  public users: typeof users;

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id: number;

  @ForeignKey((): typeof users => users)
  @Column(DataType.INTEGER)
  public userId: number;

  @Column(DataType.INTEGER)
  public roleId: number;

  @Column(DataType.INTEGER)
  public toxicityScore: number;

  @Column(DataType.TEXT)
  public summary: string;

  @Column(DataType.TEXT('long'))
  public analysis: string;

  @Column(DataType.INTEGER)
  public conversationCount: number;

  @Column(DataType.DATE)
  public analyzedAt: Date;

  @Column(DataType.DATE)
  public createdAt: Date;

  @Column(DataType.DATE)
  public updatedAt: Date;

  @Column(DataType.DATE)
  public deletedAt: Date;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      const score = this.getDataValue('toxicityScore');
      if (score >= 80) return 'Extremely High';
      if (score >= 60) return 'High';
      if (score >= 40) return 'Medium';
      if (score >= 20) return 'Low';
      return 'Very Low';
    },
  })
  public toxicityLevel: string;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      const score = this.getDataValue('toxicityScore');
      if (score >= 70) return 'High Risk';
      if (score >= 40) return 'Medium Risk';
      if (score >= 20) return 'Low Risk';
      return 'Safe';
    },
  })
  public riskLevel: string;
}
