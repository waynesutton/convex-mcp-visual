import { query } from "./_generated/server";

// Return information about all tables and their structure
export const listTables = query({
  args: {},
  handler: async (ctx) => {
    const tables = [
      {
        name: "users",
        indexes: ["by_email"],
        fields: [
          { name: "_id", type: "Id<users>", optional: false },
          { name: "_creationTime", type: "number", optional: false },
          { name: "name", type: "string", optional: false },
          { name: "email", type: "string", optional: false },
          { name: "createdAt", type: "number", optional: false },
        ],
      },
      {
        name: "posts",
        indexes: ["by_author"],
        fields: [
          { name: "_id", type: "Id<posts>", optional: false },
          { name: "_creationTime", type: "number", optional: false },
          { name: "title", type: "string", optional: false },
          { name: "content", type: "string", optional: false },
          { name: "authorId", type: "Id<users>", optional: false },
          { name: "createdAt", type: "number", optional: false },
        ],
      },
      {
        name: "comments",
        indexes: ["by_post", "by_author"],
        fields: [
          { name: "_id", type: "Id<comments>", optional: false },
          { name: "_creationTime", type: "number", optional: false },
          { name: "postId", type: "Id<posts>", optional: false },
          { name: "authorId", type: "Id<users>", optional: false },
          { name: "text", type: "string", optional: false },
          { name: "createdAt", type: "number", optional: false },
        ],
      },
    ];

    // Get document counts for each table
    const results = await Promise.all(
      tables.map(async (table) => {
        const docs = await ctx.db.query(table.name as any).collect();
        return {
          ...table,
          documentCount: docs.length,
        };
      })
    );

    return results;
  },
});

// Get sample documents from a table
export const getDocuments = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(10);
    const posts = await ctx.db.query("posts").take(10);
    const comments = await ctx.db.query("comments").take(10);

    return {
      users,
      posts,
      comments,
    };
  },
});
