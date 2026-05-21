import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export async function enviarCorreo(
  destinatario,
  asunto,
  mensaje
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,

    port: Number(process.env.SMTP_PORT),

    secure: false,

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Monitor Judicial" <${process.env.SMTP_USER}>`,

    to: destinatario,

    subject: asunto,

    text: mensaje,
  });

  console.log(
    "Correo enviado correctamente a:",
    destinatario
  );
}