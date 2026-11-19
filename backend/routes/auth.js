const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

function tokenFor(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "development-secret", { expiresIn: "7d" });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Name, username, email and password are required" });
    }
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3-30 letters, numbers or underscores" });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { username: username.toLowerCase().trim() }] });
    if (existing) return res.status(409).json({ message: "Email or username is already registered" });

    const user = await User.create({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password: await bcrypt.hash(password, 12)
    });
    res.status(201).json({
      token: tokenFor(user),
      user: await User.findById(user._id)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Email/username and password are required" });
    const normalized = identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: normalized }, { username: normalized }]
    }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const publicUser = await User.findById(user._id);
    res.json({ token: tokenFor(user), user: publicUser });
  } catch (error) {
    next(error);
  }
});

router.get("/me", auth, (req, res) => res.json(req.user));

module.exports = router;
