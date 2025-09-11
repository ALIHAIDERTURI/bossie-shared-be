import { Op, Sequelize } from "sequelize";
import { users, employee, roleData, privateMessages, privateThreads, threads, messages, toxicityScores } from "@src/models";
const OpenAI = require("openai");

export class ToxicityService {
    private openai: any;

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } else {
            console.warn("OPENAI_API_KEY not found. Toxicity analysis will not be available.");
            this.openai = null;
        }
    }

    public getUserConversations = async (userId: number, roleId: number): Promise<any> => {
        let userConversations: any[] = [];

        try {
            const privateMessagesData = await privateMessages.findAll({
                where: {
                    [Op.or]: [
                        { userId: userId },
                        { empId: userId }
                    ]
                },
                include: [
                    {
                        model: privateThreads,
                        as: "privateThreads",
                        attributes: ["id", "userId", "employeeId"],
                        include: [
                            {
                                model: users,
                                as: "users",
                                attributes: ["id", "name", "roleId"],
                                include: [
                                    {
                                        model: roleData,
                                        as: "roleData",
                                        attributes: ["firstName", "lastName", "companyName"]
                                    }
                                ]
                            },
                            {
                                model: employee,
                                as: "employee",
                                attributes: ["id", "firstName", "lastName"]
                            }
                        ]
                    }
                ],
                order: [["createdAt", "DESC"]],
                limit: 100
            });

            const publicMessagesData = await messages.findAll({
                where: { userId: userId },
                include: [
                    {
                        model: threads,
                        as: "threads",
                        attributes: ["id", "title", "subCategoryId"],
                        include: [
                            {
                                model: users,
                                as: "users",
                                attributes: ["id", "name", "roleId"],
                                include: [
                                    {
                                        model: roleData,
                                        as: "roleData",
                                        attributes: ["firstName", "lastName", "companyName"]
                                    }
                                ]
                            }
                        ]
                    }
                ],
                order: [["createdAt", "DESC"]],
                limit: 100
            });

            const formattedPrivateMessages = privateMessagesData.map((msg: any) => ({
                type: "private",
                message: msg.message,
                userId: msg.userId,
                empId: msg.empId,
                createdAt: msg.createdAt,
                threadId: msg.privateThreads?.id,
                threadTitle: "Private Conversation"
            }));

            const formattedPublicMessages = publicMessagesData.map((msg: any) => ({
                type: "public",
                message: msg.message,
                userId: msg.userId,
                empId: msg.empId,
                createdAt: msg.createdAt,
                threadId: msg.threads?.id,
                threadTitle: msg.threads?.title || "Forum Post"
            }));

            userConversations = [...formattedPrivateMessages, ...formattedPublicMessages];

            return userConversations;
        } catch (error) {
            console.error("Error fetching user conversations:", error);
            throw new Error("Failed to fetch user conversations");
        }
    };

    public analyzeToxicity = async (conversations: any[]): Promise<{ toxicityScore: number; summary: string; analysis: string }> => {
        try {
            const conversationText = conversations
                .map(conv => `[${conv.type.toUpperCase()}] ${conv.message}`)
                .join('\n\n');

            if (!conversationText.trim()) {
                return {
                    toxicityScore: 0,
                    summary: "No conversations found for analysis.",
                    analysis: "User has no recent conversation history to analyze."
                };
            }

            const prompt = `
Analyze the following user conversations for toxicity and provide a comprehensive assessment.

Conversations:
${conversationText}

Please provide:
1. A toxicity score from 0-100 (where 0 = completely safe, 100 = extremely toxic)
2. A brief summary of the conversation content
3. A detailed analysis of any concerning patterns, language, or behavior

Respond in JSON format:
{
  "toxicityScore": <number>,
  "summary": "<brief summary>",
  "analysis": "<detailed analysis>"
}
`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert content moderator analyzing user conversations for toxicity, harassment, spam, and inappropriate behavior. Provide accurate, objective assessments."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const response = completion.choices[0]?.message?.content;

            if (!response) {
                throw new Error("No response from OpenAI");
            }
            const analysisResult = JSON.parse(response);

            return {
                toxicityScore: Math.min(Math.max(analysisResult.toxicityScore || 0, 0), 100),
                summary: analysisResult.summary || "Analysis completed",
                analysis: analysisResult.analysis || "No specific concerns identified"
            };

        } catch (error) {
            console.error("Error analyzing toxicity:", error);
            throw new Error("Failed to analyze toxicity");
        }
    };

    public calculateUserToxicityScore = async (userId: number, roleId: number): Promise<any> => {
        try {
            const recentAnalysis = await this.getRecentToxicityScore(userId, 24);
            if (recentAnalysis) {
                return {
                    userId,
                    roleId,
                    toxicityScore: recentAnalysis.toxicityScore,
                    summary: recentAnalysis.summary,
                    analysis: recentAnalysis.analysis,
                    conversationCount: recentAnalysis.conversationCount,
                    analyzedAt: recentAnalysis.analyzedAt,
                    cached: true
                };
            }

            const conversations = await this.getUserConversations(userId, roleId);

            if (!this.openai) {
                throw new Error("OpenAI API key not configured. Cannot perform toxicity analysis.");
            }

            const analysis = await this.analyzeToxicity(conversations);

            const storedAnalysis = await toxicityScores.create({
                userId,
                roleId,
                toxicityScore: analysis.toxicityScore,
                summary: analysis.summary,
                analysis: analysis.analysis,
                conversationCount: conversations.length,
                analyzedAt: new Date()
            });

            return {
                userId,
                roleId,
                toxicityScore: analysis.toxicityScore,
                summary: analysis.summary,
                analysis: analysis.analysis,
                conversationCount: conversations.length,
                analyzedAt: storedAnalysis.analyzedAt,
                cached: false
            };
        } catch (error) {
            console.error("Error calculating toxicity score:", error);
            throw new Error("Failed to calculate toxicity score");
        }
    };

    public getUserToxicityScore = async (userId: number, roleId: number): Promise<any> => {
        try {
            const latestScore = await toxicityScores.findOne({
                where: { userId, roleId },
                order: [['analyzedAt', 'DESC']],
                include: [
                    {
                        model: users,
                        as: "users",
                        attributes: ["id", "name", "roleId"]
                    }
                ]
            });

            return latestScore;
        } catch (error) {
            console.error("Error fetching user toxicity score:", error);
            return null;
        }
    };
    public getRecentToxicityScore = async (userId: number, hours: number = 24): Promise<any> => {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            const recentScore = await toxicityScores.findOne({
                where: {
                    userId,
                    analyzedAt: {
                        [Op.gte]: cutoffTime
                    }
                },
                order: [['analyzedAt', 'DESC']]
            });

            return recentScore;
        } catch (error) {
            console.error("Error fetching recent toxicity score:", error);
            return null;
        }
    };
    public getToxicityScoreHistory = async (userId: number, limit: number = 10): Promise<any> => {
        try {
            const history = await toxicityScores.findAll({
                where: { userId },
                order: [['analyzedAt', 'DESC']],
                limit,
                attributes: [
                    'id',
                    'toxicityScore',
                    'summary',
                    'conversationCount',
                    'analyzedAt',
                    'createdAt'
                ]
            });

            return history;
        } catch (error) {
            console.error("Error fetching toxicity score history:", error);
            return [];
        }
    };
}
