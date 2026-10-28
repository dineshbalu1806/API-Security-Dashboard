const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendPasswordResetEmail } = require("../services/passwordResetMailer");

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_MESSAGE =
  "If an account exists for that email, a password reset link will be sent.";

const getClientUrl = () => {
  const configuredOrigin = process.env.CLIENT_URL;
  const isLocalOrigin = !configuredOrigin || /^https?:\/\/localhost(?::\d+)?$/i.test(configuredOrigin);
  const origin = isLocalOrigin && process.env.VERCEL_ENV === "production"
    ? "https://api-security-dashboard.vercel.app"
    : configuredOrigin ||
      (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
      "http://localhost:5173";
  return origin.replace(/\/+$/, "");
};

// @route   POST /api/auth/signup
// @access  Public
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are all required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
});

// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash"
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
});

// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address" });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.error("Password reset email is not configured");
    return res.status(503).json({
      success: false,
      message: "Password reset is temporarily unavailable. Please contact the administrator.",
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({ success: true, message: PASSWORD_RESET_MESSAGE });
  }

  const now = new Date();
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const cooldownBefore = new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS);
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { passwordResetRequestedAt: { $exists: false } },
        { passwordResetRequestedAt: { $lte: cooldownBefore } },
      ],
    },
    {
      $set: {
        passwordResetTokenHash: resetTokenHash,
        passwordResetExpiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        passwordResetRequestedAt: now,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(200).json({ success: true, message: PASSWORD_RESET_MESSAGE });
  }

  const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}`;
  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch (error) {
    try {
      await User.updateOne(
        { _id: user._id, passwordResetTokenHash: resetTokenHash },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } }
      );
    } catch (cleanupError) {
      console.error("Unable to clear an undelivered password reset token", cleanupError.name);
    }
    throw error;
  }

  return res.status(200).json({ success: true, message: PASSWORD_RESET_MESSAGE });
});

// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  });
  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
  }

  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash },
      $unset: {
        passwordResetTokenHash: 1,
        passwordResetExpiresAt: 1,
        passwordResetRequestedAt: 1,
      },
    }
  );

  if (!updatedUser) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
  }

  return res.status(200).json({
    success: true,
    message: "Password updated. You can now sign in with your new password.",
  });
});

// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject(),
  });
});

module.exports = { signup, login, forgotPassword, resetPassword, getMe };
