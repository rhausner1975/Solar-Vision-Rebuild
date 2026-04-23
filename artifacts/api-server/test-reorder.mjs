import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows: admins } = await pool.query("SELECT id FROM admin_users LIMIT 1");
const crypto = await import("node:crypto");
const sid = crypto.randomBytes(32).toString("hex");
await pool.query(
  `INSERT INTO admin_sessions(id, user_id, created_at, expires_at) VALUES($1,$2,NOW(),NOW() + INTERVAL '1 hour')`,
  [sid, admins[0].id],
);
const H = { "Content-Type": "application/json", Cookie: `v9_admin_session=${sid}`, Origin: "http://localhost:8080" };

async function go(gid, ids, label) {
  const r = await fetch(`http://localhost:8080/api/admin/galleries/${gid}/reorder`, {
    method: "POST", headers: H, body: JSON.stringify({ imageIds: ids }),
  });
  const body = r.ok ? "" : " body=" + (await r.text()).slice(0, 120);
  console.log(label, "status:", r.status + body);
  return r;
}

const { rows: g } = await pool.query(`SELECT gallery_id AS id FROM gallery_images GROUP BY gallery_id HAVING COUNT(*) >= 3 ORDER BY gallery_id LIMIT 1`);
const gid = g[0].id;
const { rows: imgs } = await pool.query(`SELECT id FROM gallery_images WHERE gallery_id=$1 ORDER BY sort_order, id`, [gid]);
const allIds = imgs.map(r => r.id);
const reversed = [...allIds].reverse();

// Capture other galleries' state BEFORE
const beforeOther = (await pool.query(`SELECT id, sort_order FROM gallery_images WHERE gallery_id!=$1 ORDER BY id`, [gid])).rows;

await go(gid, reversed, "reverse");
const afterIds = (await pool.query(`SELECT id FROM gallery_images WHERE gallery_id=$1 ORDER BY sort_order`, [gid])).rows.map(r => r.id);
console.log("  reversed match?", JSON.stringify(afterIds) === JSON.stringify(reversed));

await go(gid, reversed.slice(0, 3), "partial (expect 400)");
await go(gid, [...reversed.slice(0, -1), 999999999], "foreign id (expect 400)");
await go(gid, [reversed[0], ...reversed.slice(0, -1)], "duplicate id (expect 400)");
await go(99999, allIds, "bad gallery (expect 404)");

await go(gid, allIds, "restore");
const afterOther = (await pool.query(`SELECT id, sort_order FROM gallery_images WHERE gallery_id!=$1 ORDER BY id`, [gid])).rows;
console.log("  other galleries untouched?", JSON.stringify(beforeOther) === JSON.stringify(afterOther));

await pool.query(`DELETE FROM admin_sessions WHERE id=$1`, [sid]);
await pool.end();
