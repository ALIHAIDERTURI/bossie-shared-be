import * as fs from "fs";
import * as path from "path";

// Function to replace placeholders in the email template
const replaceTemplateVariables = (template: string, variables: Record<string, string>) => {
    return template.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] || "");
};

// Function to load and process an HTML email template
export const getProcessedTemplate = (templateName: string, variables: Record<string, string>): string => {
    try {
        // Corrected path to match your folder structure
        const templatePath = path.join(__dirname, "..", "..", "public", "template", `${templateName}.html`);

        let template = fs.readFileSync(templatePath, "utf-8");
        return replaceTemplateVariables(template, variables);
    } catch (error) {
        console.error("Error loading email template:", error);
        throw new Error("E-mailsjabloon niet gevonden.");
    }
};
