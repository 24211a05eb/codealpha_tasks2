const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  const authorization = req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const token = authorization.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || "development-secret");
    const user = await User.findById(payload.userId).select("-password");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = auth;
