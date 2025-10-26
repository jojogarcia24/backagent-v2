import { withCors } from "./_cors.js";
import { Client } from "pg";

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT,
  category TEXT,
  year_built INT,
  status TEXT DEFAULT 'intake',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS required_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  rule_id UUID,
  name TEXT,
  is_required BOOLEAN DEFAULT true,
  is_uploaded BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rule_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT,
  category TEXT,
  year_min INT,
  year_max INT
);

CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID REFERENCES rule_scopes(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  doc_type TEXT,
  conditions JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  required_item_id UUID REFERENCES required_items(id),
  file_name TEXT,
  file_url TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending_validation'
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  ai_model TEXT,
  findings JSONB
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  approved_by TEXT,
  approved_at TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS cda_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL,
  status TEXT,
  qb_invoice_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT,
  entity_id UUID,
  action TEXT,
  user_email TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);
`;

export const handler = withCors(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(schemaSql);
    await client.query("COMMIT");
    return { statusCode: 200, body: JSON.stringify({ ok: true, message: "DB schema applied" }) };
  } catch (e) {
    await client.query("ROLLBACK");
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  } finally {
    await client.end();
  }
});
