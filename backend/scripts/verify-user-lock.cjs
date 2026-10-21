require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");

  const client = new Client({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(
        path.join(process.env.APPDATA, "postgresql", "root.crt"),
        "utf8"
      ),
      rejectUnauthorized: true
    }
  });

  try {
    await client.connect();
    const result = await client.query('SHOW CREATE TABLE "User"');
    console.log(result.rows);
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
