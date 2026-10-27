const { createCipheriv, createDecipheriv, randomBytes } = require("crypto");

const algorithm = "aes-256-gcm";

const getKey = () => {
  const encodedKey = process.env.PROJECT_CREDENTIALS_KEY;
  if (!encodedKey) {
    throw new Error("PROJECT_CREDENTIALS_KEY must be configured to use API credentials");
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("PROJECT_CREDENTIALS_KEY must be a base64-encoded 32-byte key");
  }
  return key;
};

const encryptCredential = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encryptedValue = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    iv: iv.toString("base64"),
    encryptedValue: encryptedValue.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
};

const decryptCredential = ({ iv, encryptedValue, authTag }) => {
  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

module.exports = { encryptCredential, decryptCredential };
