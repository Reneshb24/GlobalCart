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

  try {
    await client.connect();

    // Execute as a single standalone statement.
    await client.query('ALTER TABLE "User" SET (schema_locked = true)');
    console.log('User table schema lock disabled successfully.');
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error("Schema unlock failed:", error.message);
  process.exitCode = 1;
});

