import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_author", ["authorId"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),
});
