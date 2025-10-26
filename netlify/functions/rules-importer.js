import { Client } from "pg";
import rules from "../../rules_seed.json" assert { type: "json" };

export async function handler() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS rule_scopes(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      state TEXT, category TEXT, year_min INT, year_max INT
    );
    CREATE TABLE IF NOT EXISTS rules(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_id UUID REFERENCES rule_scopes(id) ON DELETE CASCADE,
      name TEXT, description TEXT, doc_type TEXT, conditions JSONB, created_at TIMESTAMP DEFAULT now()
    );
  `);

  for (const r of rules) {
    const { state, category, name, description, docType, yearMin, yearMax, conditions } = r;
    const scope = await client.query(
      `INSERT INTO rule_scopes (state, category, year_min, year_max)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [state, category, yearMin ?? null, yearMax ?? null]
    );
    const scopeId = scope.rows[0]?.id
      ?? (await client.query(
           `SELECT id FROM rule_scopes WHERE state=$1 AND category=$2 AND
              COALESCE(year_min,-1)=COALESCE($3,-1) AND COALESCE(year_max,-1)=COALESCE($4,-1)`,
           [state, category, yearMin ?? null, yearMax ?? null]
         )).rows[0].id;

    await client.query(
      `INSERT INTO rules(scope_id,name,description,doc_type,conditions)
       VALUES ($1,$2,$3,$4,$5)`,
      [scopeId, name, description ?? null, docType ?? null, conditions ?? {}]
    );
  }

  await client.query("COMMIT");
  await client.end();
  return { statusCode: 200, body: JSON.stringify({ ok: true, count: rules.length }) };
}
