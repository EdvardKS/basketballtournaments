// SMTP mailer pointing at the shared local relay (host "smtp" on mail_net).
// No auth, From must be *@mail.iaeks.com. When SMTP_HOST is empty the transport
// is null and sendMail is a no-op, so the app keeps working unconfigured.
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 25);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
export const SMTP_FROM = process.env.SMTP_FROM ?? "basket@mail.iaeks.com";

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      ignoreTLS: !SMTP_USER,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
    })
  : null;

export interface MailArgs { to: string; subject: string; html: string; text: string }

export const sendMail = async (args: MailArgs): Promise<{ ok?: boolean; skipped?: boolean }> => {
  if (!transporter) {
    console.warn("[mail] disabled (no SMTP_HOST), skipping:", args.subject);
    return { skipped: true };
  }
  if (!args.to) return { skipped: true };
  try {
    await transporter.sendMail({ from: SMTP_FROM, to: args.to, subject: args.subject, html: args.html, text: args.text });
    console.log("[mail] sent", args.subject, "→", args.to);
    return { ok: true };
  } catch (err) {
    console.error("[mail] send failed:", (err as Error).message);
    return { ok: false };
  }
};
