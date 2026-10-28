const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [to],
        subject: "Reset your Sentinel password",
        text: `Use this link to reset your Sentinel password. It expires in one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Use the link below to reset your Sentinel password. It expires in one hour.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("Password reset email provider rejected the request", response.status);
      const error = new Error("Unable to deliver password reset email. Please try again later.");
      error.statusCode = 502;
      throw error;
    }
  } catch (error) {
    if (error.statusCode) throw error;

    console.error("Password reset email delivery failed", error.name || "UnknownError");
    const deliveryError = new Error("Unable to deliver password reset email. Please try again later.");
    deliveryError.statusCode = 502;
    throw deliveryError;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { sendPasswordResetEmail };
