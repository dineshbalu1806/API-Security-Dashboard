const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const ask = (prompt) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

const askHidden = (prompt) =>
  new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal so passwords are not echoed."));
      return;
    }

    let value = "";
    const onData = (key) => {
      if (key === "\u0003") {
        input.setRawMode(false);
        input.pause();
        input.removeListener("data", onData);
        reject(new Error("Password reset cancelled."));
        return;
      }
      if (key === "\r" || key === "\n") {
        input.setRawMode(false);
        input.pause();
        input.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (key >= " " && key !== "\u007f") value += key;
    };

    process.stdout.write(prompt);
    input.setEncoding("utf8");
    input.resume();
    input.setRawMode(true);
    input.on("data", onData);
  });

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env.");
  }

  const uri = new URL(process.env.MONGO_URI);
  const database =
    decodeURIComponent(uri.pathname.replace(/^\/+/, "")) ||
    uri.searchParams.get("dbName") ||
    "test";
  console.log(`Database target: ${uri.hostname} / ${database}`);
  const confirmation = await ask("Type RESET to change a password in this database: ");
  if (confirmation !== "RESET") {
    console.log("Password reset cancelled.");
    return;
  }

  const email = (await ask("Account email: ")).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error("Enter a valid account email.");
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("No account with that email exists in the selected database.");
  }

  const password = await askHidden("New Sentinel password (input hidden): ");
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const confirmationPassword = await askHidden("Confirm new password (input hidden): ");
  if (password !== confirmationPassword) {
    throw new Error("Passwords do not match.");
  }

  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const result = await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash },
      $unset: {
        passwordResetTokenHash: 1,
        passwordResetExpiresAt: 1,
        passwordResetRequestedAt: 1,
      },
    }
  );
  if (result.modifiedCount !== 1) {
    throw new Error("Password was not updated. Retry the command or use password recovery.");
  }

  console.log("Password updated. You can now sign in with the new Sentinel password.");
};

run()
  .catch((error) => {
    console.error(error.message || "Password reset failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
