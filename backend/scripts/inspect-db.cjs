require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from backend/.env");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");

  const caPath = path.join(
    process.env.APPDATA || "",
    "postgresql",
    "root.crt"
  );

  const client = new Client({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(caPath, "utf8"),
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log("Database connection: successful");

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("\nTables currently in public schema:");
    console.log(tables.rows.map(r => r.table_name).join("\n") || "(none)");

    const migrationTable = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS exists
    `);

    if (migrationTable.rows[0].exists) {
      const migrations = await client.query(`
        SELECT migration_name, started_at, finished_at, rolled_back_at
        FROM public."_prisma_migrations"
        ORDER BY started_at DESC
      `);

      console.log("\nPrisma migration records:");
      console.table(migrations.rows);
    } else {
      console.log("\nPrisma migration table does not exist.");
    }

    const constraints = await client.query(`
  SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_schema = 'public'
    AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'PRIMARY KEY')
  ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
`);

console.log("\nExisting constraints:");
console.table(constraints.rows);

  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error("Inspection failed:", error.message);
  process.exitCode = 1;
});
