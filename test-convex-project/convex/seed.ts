import { mutation } from "./_generated/server";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingUsers = await ctx.db.query("users").take(1);
    if (existingUsers.length > 0) {
      return { message: "Data already seeded", seeded: false };
    }

    const now = Date.now();

    // Create users
    const user1 = await ctx.db.insert("users", {
      name: "Alice Johnson",
      email: "alice@example.com",
      createdAt: now - 86400000 * 30, // 30 days ago
    });

    const user2 = await ctx.db.insert("users", {
      name: "Bob Smith",
      email: "bob@example.com",
      createdAt: now - 86400000 * 25, // 25 days ago
    });

    const user3 = await ctx.db.insert("users", {
      name: "Carol Williams",
      email: "carol@example.com",
      createdAt: now - 86400000 * 20, // 20 days ago
    });

    // Create posts
    const post1 = await ctx.db.insert("posts", {
      title: "Getting Started with Convex",
      content:
        "Convex is a powerful backend platform that makes building real-time applications easy. In this post, we'll explore the basics.",
      authorId: user1,
      createdAt: now - 86400000 * 15, // 15 days ago
    });

    const post2 = await ctx.db.insert("posts", {
      title: "Building Real-time Apps",
      content:
        "Real-time functionality is at the core of modern web applications. Here's how to leverage Convex for instant updates.",
      authorId: user2,
      createdAt: now - 86400000 * 10, // 10 days ago
    });

    const post3 = await ctx.db.insert("posts", {
      title: "Schema Design Best Practices",
      content:
        "Good schema design is crucial for application performance. Let's discuss some best practices for Convex schemas.",
      authorId: user1,
      createdAt: now - 86400000 * 5, // 5 days ago
    });

    const post4 = await ctx.db.insert("posts", {
      title: "Authentication Patterns",
      content:
        "Implementing authentication in Convex is straightforward. This guide covers common patterns and best practices.",
      authorId: user3,
      createdAt: now - 86400000 * 2, // 2 days ago
    });

    // Create comments
    await ctx.db.insert("comments", {
      postId: post1,
      authorId: user2,
      text: "Great introduction! This helped me get started quickly.",
      createdAt: now - 86400000 * 14,
    });

    await ctx.db.insert("comments", {
      postId: post1,
      authorId: user3,
      text: "Very clear explanations. Looking forward to more content!",
      createdAt: now - 86400000 * 13,
    });

    await ctx.db.insert("comments", {
      postId: post2,
      authorId: user1,
      text: "Real-time features are so smooth with Convex!",
      createdAt: now - 86400000 * 9,
    });

    await ctx.db.insert("comments", {
      postId: post2,
      authorId: user3,
      text: "I implemented this in my project. Works perfectly.",
      createdAt: now - 86400000 * 8,
    });

    await ctx.db.insert("comments", {
      postId: post3,
      authorId: user2,
      text: "Schema design tips are exactly what I needed.",
      createdAt: now - 86400000 * 4,
    });

    await ctx.db.insert("comments", {
      postId: post4,
      authorId: user1,
      text: "Auth is always tricky. Thanks for the clear guide!",
      createdAt: now - 86400000 * 1,
    });

    await ctx.db.insert("comments", {
      postId: post4,
      authorId: user2,
      text: "This saved me hours of debugging.",
      createdAt: now - 3600000, // 1 hour ago
    });

    return {
      message: "Data seeded successfully",
      seeded: true,
      counts: {
        users: 3,
        posts: 4,
        comments: 7,
      },
    };
  },
});

export const clearData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all comments
    const comments = await ctx.db.query("comments").collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete all posts
    const posts = await ctx.db.query("posts").collect();
    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      message: "All data cleared",
      deleted: {
        users: users.length,
        posts: posts.length,
        comments: comments.length,
      },
    };
  },
});
