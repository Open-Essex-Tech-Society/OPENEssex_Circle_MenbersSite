interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const target_uid = url.searchParams.get("target_uid");
  const caller_uid = url.searchParams.get("caller_uid");

  // Clean up old ringing notifications (> 1 minute)
  await DB.prepare(
    "DELETE FROM call_notifications WHERE status = 'ringing' AND created_at < datetime('now', '-1 minute')"
  ).run();

  if (target_uid) {
    // Check for incoming calls for me
    const { results } = await DB.prepare(
      "SELECT * FROM call_notifications WHERE target_uid = ? AND status = 'ringing' ORDER BY created_at DESC LIMIT 1"
    ).bind(target_uid).all();
    return Response.json(results);
  }

  if (caller_uid) {
    // Check if my call was accepted or rejected
    const { results } = await DB.prepare(
      "SELECT * FROM call_notifications WHERE caller_uid = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(caller_uid).all();
    return Response.json(results);
  }

  return new Response("Missing target_uid or caller_uid", { status: 400 });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();
  const { action, caller_uid, caller_name, target_uid, room_name, call_id, status } = data;

  if (action === "start") {
    // Remove any existing calls from this caller first to avoid duplicates
    await DB.prepare("DELETE FROM call_notifications WHERE caller_uid = ?").bind(caller_uid).run();
    
    const result = await DB.prepare(
      "INSERT INTO call_notifications (caller_uid, caller_name, target_uid, room_name, status) VALUES (?, ?, ?, ?, 'ringing') RETURNING id"
    ).bind(caller_uid, caller_name, target_uid, room_name).first();
    return Response.json(result);
  }

  if (action === "update") {
    await DB.prepare(
      "UPDATE call_notifications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(status, call_id).run();
    return new Response("OK");
  }

  if (action === "cancel") {
    await DB.prepare("DELETE FROM call_notifications WHERE id = ?").bind(call_id).run();
    return new Response("OK");
  }

  return new Response("Invalid action", { status: 400 });
};
