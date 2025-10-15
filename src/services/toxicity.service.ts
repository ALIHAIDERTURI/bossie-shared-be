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
                        attributes: ["id", "ownerUserId", "ownerEmpId"],
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
            console.log("ToxicityService - calculateUserToxicityScore - Starting analysis for userId:", userId, "roleId:", roleId);
            
            const recentAnalysis = await this.getRecentToxicityScore(userId, 24);
            if (recentAnalysis) {
                console.log("ToxicityService - Found recent analysis, returning cached result");
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

            console.log("ToxicityService - No recent analysis found, fetching conversations...");
            const conversations = await this.getUserConversations(userId, roleId);
            console.log("ToxicityService - Found conversations:", conversations.length);

            if (conversations.length === 0) {
                console.log("ToxicityService - No conversations found, returning default analysis");
                return {
                    userId,
                    roleId,
                    toxicityScore: 0,
                    summary: "No conversation history found",
                    analysis: "User has no recent conversation history to analyze",
                    conversationCount: 0,
                    analyzedAt: new Date(),
                    cached: false
                };
            }

            if (!this.openai) {
                console.error("ToxicityService - OpenAI API key not configured");
                throw new Error("OpenAI API key not configured. Cannot perform toxicity analysis.");
            }

            console.log("ToxicityService - Starting AI analysis...");
            const analysis = await this.analyzeToxicity(conversations);
            console.log("ToxicityService - AI analysis completed:", analysis);

            const storedAnalysis = await toxicityScores.create({
                userId,
                roleId,
                toxicityScore: analysis.toxicityScore,
                summary: analysis.summary,
                analysis: analysis.analysis,
                conversationCount: conversations.length,
                analyzedAt: new Date()
            });
            console.log("ToxicityService - Analysis stored in database");

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
        } catch (error: any) {
            console.error("ToxicityService - Error calculating toxicity score:", error);
            throw new Error(`Failed to calculate toxicity score: ${error.message}`);
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

    public generateThreadSummary = async (threadId: number, isPrivate: boolean = false): Promise<string> => {
        try {
            if (!this.openai) {
                throw new Error("OpenAI API key not configured. Cannot generate thread summary.");
            }

            let conversationMessages: any[] = [];
            
            if (isPrivate) {
                // Get all messages from private thread
                const privateMessagesData = await privateMessages.findAll({
                    where: { roomId: threadId },
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
                    ],
                    order: [["createdAt", "ASC"]]
                });

                conversationMessages = privateMessagesData.map((msg: any) => {
                    let senderName = "Unknown";
                    if (msg.users) {
                        if (msg.users.roleId === 2) {
                            senderName = msg.users.roleData?.companyName || msg.users.name;
                        } else {
                            senderName = `${msg.users.roleData?.firstName || ""} ${msg.users.roleData?.lastName || ""}`.trim() || msg.users.name;
                        }
                    } else if (msg.employee) {
                        senderName = `${msg.employee.firstName} ${msg.employee.lastName}`;
                    }
                    
                    return `[${msg.createdAt.toISOString()}] ${senderName}: ${msg.message}`;
                });
            } else {
                // Get all messages from public thread
                const publicMessagesData = await messages.findAll({
                    where: { roomId: threadId },
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
                    ],
                    order: [["createdAt", "ASC"]]
                });

                conversationMessages = publicMessagesData.map((msg: any) => {
                    let senderName = "Unknown";
                    if (msg.users) {
                        if (msg.users.roleId === 2) {
                            senderName = msg.users.roleData?.companyName || msg.users.name;
                        } else {
                            senderName = `${msg.users.roleData?.firstName || ""} ${msg.users.roleData?.lastName || ""}`.trim() || msg.users.name;
                        }
                    } else if (msg.employee) {
                        senderName = `${msg.employee.firstName} ${msg.employee.lastName}`;
                    }
                    
                    return `[${msg.createdAt.toISOString()}] ${senderName}: ${msg.message}`;
                });
            }

            if (conversationMessages.length === 0) {
                return "No messages found in this thread.";
            }

            const conversationText = conversationMessages.join('\n');

            const prompt = `
Analyze the following ${isPrivate ? 'private' : 'public'} conversation thread and provide a comprehensive summary.

Conversation:
${conversationText}

Please provide a detailed summary that includes:
1. Main topics discussed
2. Key decisions or outcomes
3. Important information shared
4. Any concerning behavior or content (if applicable)
5. Overall tone and nature of the conversation

Keep the summary concise but comprehensive, focusing on the most important aspects of the conversation.
`;

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert content analyst specializing in summarizing conversations for moderation and review purposes. Provide clear, objective, and comprehensive summaries."
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

            return response;

        } catch (error) {
            console.error("Error generating thread summary:", error);
            throw new Error("Failed to generate thread summary");
        }
    };

    public updateUserToxicityData = async (userId: number, roleId: number, toxicityPercentage: number, reasoning: string): Promise<any> => {
        try {
            console.log("ToxicityService - updateUserToxicityData - Input:", { userId, roleId, toxicityPercentage, reasoning });
            
            // First, check if the user/employee exists
            let userExists = false;
            if (roleId === 3) {
                const existingEmployee = await employee.findOne({
                    where: { id: userId, deletedAt: null },
                    attributes: ['id']
                });
                userExists = !!existingEmployee;
                console.log("ToxicityService - Employee exists:", userExists);
            } else {
                const existingUser = await users.findOne({
                    where: { id: userId, deletedAt: null },
                    attributes: ['id']
                });
                userExists = !!existingUser;
                console.log("ToxicityService - User exists:", userExists);
            }

            if (!userExists) {
                throw new Error(`User not found`);
            }
            
            const updateData = {
                toxicityPercentage,
                toxicityReasoning: reasoning,
                toxicityUpdatedAt: new Date()
            };
            console.log("ToxicityService - updateUserToxicityData - Update data:", updateData);

            let updateResult;
            if (roleId === 3) {
                // Update employee
                console.log("ToxicityService - Updating employee with ID:", userId);
                updateResult = await employee.update(updateData, { where: { id: userId } });
            } else {
                // Update user (roleId 1 or 2)
                console.log("ToxicityService - Updating user with ID:", userId);
                updateResult = await users.update(updateData, { where: { id: userId } });
            }
            
            console.log("ToxicityService - updateUserToxicityData - Update result:", updateResult);
            
            // Check if any rows were actually updated
            const rowsAffected = updateResult[0]; // Sequelize update returns [affectedCount, affectedRows]
            if (rowsAffected === 0) {
                throw new Error(`Update failed`);
            }

            console.log("ToxicityService - updateUserToxicityData - Update completed successfully, rows affected:", rowsAffected);

            return {
                success: true,
                userId,
                roleId,
                toxicityPercentage,
                reasoning,
                updatedAt: updateData.toxicityUpdatedAt,
                rowsAffected
            };
        } catch (error: any) {
            console.error("ToxicityService - Error updating user toxicity data:", error);
            throw new Error(error.message);
        }
    };
}
