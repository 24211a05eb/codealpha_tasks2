const express = require("express");
const auth = require("../middleware/auth");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const router = express.Router();

router.post("/:postId", auth, async (req, res, next) => {
  try {
    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ message: "Comment content is required" });
    if (content.length > 300) return res.status(400).json({ message: "Comment must be 300 characters or fewer" });
    if (!(await Post.exists({ _id: req.params.postId }))) {
      return res.status(404).json({ message: "Post not found" });
    }
    const comment = await Comment.create({ post: req.params.postId, author: req.user._id, content });
    await comment.populate("author", "name username profilePicture");
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!comment) return res.status(404).json({ message: "Comment not found or cannot be deleted" });
    res.json({ message: "Comment deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
