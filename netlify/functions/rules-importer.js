import { withCors } from "./_cors.js";
import { Client } from "pg";
import fs from "fs/promises";
import path from "path";

export const handler = withCors(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const seedPath = path.join(process.cwd(), "rules_seed.json");
    const raw = await fs.readFile(seedPath, "utf-8");
    const rules = JSON.parse(raw); // expect array of items with { state, category, yearMin, yearMax, name, description, docType, conditions }

    let inserted = 0;
    await client.query("BEGIN");
    for (const r of rules) {
      const scope = await client.query(
        `INSERT INTO rule_scopes (state, category, year_min, year_max)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [r.state || null, r.category || null, r.yearMin || null, r.yearMax || null]
      );
      await client.query(
        `INSERT INTO rules (scope_id, name, description, doc_type, conditions)
         VALUES ($1,$2,$3,$4,$5)`,
        [scope.rows[0].id, r.name, r.description || null, r.docType || null, r.conditions || {}]
      );
      inserted++;
    }
    await client.query("COMMIT");
    return { statusCode: 200, body: JSON.stringify({ ok: true, count: inserted }) };
  } catch (e) {
    await client.query("ROLLBACK");
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  } finally {
    await client.end();
  }
});
