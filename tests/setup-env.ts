process.env.DATABASE_URL ??= "file:./test.db";
Object.assign(process.env, { NODE_ENV: "test" });
