require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");

  const certPath = path.join(
    process.env.APPDATA,
    "postgresql",
    "root.crt"
  );

  const client = new Client({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(certPath, "utf8"),
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 15000
  });

  await client.connect();

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "..", "prisma", "diff-check.sql"),
      "utf8"
    );

    const statements = sql
      .split(";")
      .map(statement => statement.trim())
      .filter(Boolean);

    console.log(`Found ${statements.length} schema statements.`);

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
        console.log(`Applied statement ${i + 1}/${statements.length}`);
      } catch (error) {
        console.error(`Failed at statement ${i + 1}:`, error.message);
        console.error("Stop here; do not rerun the script blindly.");
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error("Schema update failed:", error.message);
  process.exitCode = 1;
});
