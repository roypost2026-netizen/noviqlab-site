import { Resend } from "resend";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, subject, message, website } = body;

  // Honeypot: if this field is filled, silently discard
  if (website) {
    return Response.json({ ok: true });
  }

  // Basic validation
  if (!name || !email || !subject || !message) {
    return Response.json({ error: "必須項目を入力してください。" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;
  if (!apiKey || !contactEmail) {
    return Response.json({ error: "サーバー設定エラーが発生しました。" }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "NoviqLab Contact <noreply@noviqlab.com>",
    to: [contactEmail],
    replyTo: email,
    subject: `[NoviqLab お問い合わせ] ${subject}`,
    text: `お名前: ${name}\nメールアドレス: ${email}\n\n${message}`,
  });

  if (error) {
    return Response.json({ error: "メール送信に失敗しました。" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
