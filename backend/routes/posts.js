const express = require("express");
const auth = require("../middleware/auth");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const posts = await Post.find()
      .populate("author", "name username profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    const postIds = posts.map((post) => post._id);
    const comments = await Comment.find({ post: { $in: postIds } })
      .populate("author", "name username profilePicture")
      .sort({ createdAt: 1 })
      .lean();
    const commentsByPost = {};
    for (const comment of comments) {
      const key = comment.post.toString();
      (commentsByPost[key] ||= []).push(comment);
    }
    res.json(posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
      isLiked: post.likes.some((id) => id.toString() === req.user._id.toString()),
      comments: commentsByPost[post._id.toString()] || []
    })));
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, async (req, res, next) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ message: "Post content is required" });
    if (content.length > 500) return res.status(400).json({ message: "Post must be 500 characters or fewer" });
    const post = await Post.create({ author: req.user._id, content });
    await post.populate("author", "name username profilePicture");
    res.status(201).json({ ...post.toObject(), likesCount: 0, isLiked: false, comments: [] });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/like", auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.likes.some((id) => id.equals(req.user._id))) {
      return res.status(409).json({ message: "Post already liked" });
    }
    post.likes.push(req.user._id);
    await post.save();
    res.json({ likesCount: post.likes.length, isLiked: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/like", auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.likes = post.likes.filter((id) => !id.equals(req.user._id));
    await post.save();
    res.json({ likesCount: post.likes.length, isLiked: false });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: "Post not found or cannot be deleted" });
    await Comment.deleteMany({ post: post._id });
    res.json({ message: "Post deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
