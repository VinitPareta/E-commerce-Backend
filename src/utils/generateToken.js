const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "ds_store_default_secret_change_me";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
