import * as nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Interface for mail options with type safety
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

// Function to send an email with error handling
export const sendEmail = async (options: MailOptions): Promise<any> => {
  try {
    dotenv.config({ path: ".env" });
    const user = process.env.EMAIL as string;
    const pass = process.env.EMAIL_PASSWORD as string;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });
    const { from, ...rest } = options

    const finalOptions = {
      ...rest,
      from: `"Bossie" <${options.from}>`
    };

    // Send the email
    const email = await transporter.sendMail(finalOptions);
    return email;
  } catch (error) {
    console.log("Error", error);

    throw new Error("Fout bij het verzenden van e-mail.");
  }
};
