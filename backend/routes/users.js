const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Post = require("../models/Post");
const Follower = require("../models/Follower");

const router = express.Router();

router.get("/search", auth, async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } }
      ]
    }).select("name username profilePicture").limit(10);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

async function profileData(viewerId, targetId) {
  const [user, followersCount, followingCount, posts, isFollowing] = await Promise.all([
    User.findById(targetId),
    Follower.countDocuments({ following: targetId }),
    Follower.countDocuments({ follower: targetId }),
    Post.find({ author: targetId }).populate("author", "name username profilePicture").sort({ createdAt: -1 }),
    viewerId ? Follower.exists({ follower: viewerId, following: targetId }) : null
  ]);
  if (!user) return null;
  return {
    user,
    followersCount,
    followingCount,
    isFollowing: Boolean(isFollowing),
    posts
  };
}

router.get("/:username", auth, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const data = await profileData(req.user._id, user._id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.put("/me/profile", auth, async (req, res, next) => {
  try {
    const allowed = {};
    if (typeof req.body.name === "string") allowed.name = req.body.name.trim();
    if (typeof req.body.bio === "string") allowed.bio = req.body.bio.trim();
    if (typeof req.body.profilePicture === "string") allowed.profilePicture = req.body.profilePicture.trim();

    if (allowed.name !== undefined && (allowed.name.length < 1 || allowed.name.length > 50)) {
      return res.status(400).json({ message: "Name must be 1-50 characters" });
    }
    if (allowed.bio !== undefined && allowed.bio.length > 160) {
      return res.status(400).json({ message: "Bio must be 160 characters or fewer" });
    }
    const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true, runValidators: true });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/:username/follow", auth, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target._id.equals(req.user._id)) return res.status(400).json({ message: "You cannot follow yourself" });

    const existing = await Follower.findOne({ follower: req.user._id, following: target._id });
    if (existing) return res.status(409).json({ message: "Already following this user" });
    await Follower.create({ follower: req.user._id, following: target._id });
    res.status(201).json({ isFollowing: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:username/follow", auth, async (req, res, next) => {
  try {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).json({ message: "User not found" });
    await Follower.deleteOne({ follower: req.user._id, following: target._id });
    res.json({ isFollowing: false });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
