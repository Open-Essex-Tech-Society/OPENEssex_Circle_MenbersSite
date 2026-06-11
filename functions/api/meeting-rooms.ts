interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  
  // Clean up rooms that haven't been updated in 2 minutes
  await DB.prepare(
    "DELETE FROM active_rooms WHERE last_heartbeat < datetime('now', '-2 minutes')"
  ).run();

  const { results } = await DB.prepare(
    "SELECT * FROM active_rooms ORDER BY created_at DESC"
  ).all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();

  const { room_name, display_name, member_count, created_by, action } = data;

  if (action === "heartbeat") {
    await DB.prepare(
      `INSERT INTO active_rooms (room_name, display_name, member_count, created_by, last_heartbeat)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(room_name) DO UPDATE SET
         member_count = excluded.member_count,
         last_heartbeat = CURRENT_TIMESTAMP`
    ).bind(room_name, display_name, member_count, created_by).run();
    return new Response("OK");
  }

  if (action === "leave") {
    const { results }: any = await DB.prepare(
      "SELECT member_count FROM active_rooms WHERE room_name = ?"
    ).bind(room_name).all();

    if (results && results.length > 0) {
      const newCount = Math.max(0, results[0].member_count - 1);
      if (newCount === 0) {
        await DB.prepare("DELETE FROM active_rooms WHERE room_name = ?").bind(room_name).run();
      } else {
        await DB.prepare("UPDATE active_rooms SET member_count = ? WHERE room_name = ?").bind(newCount, room_name).run();
      }
    }
    return new Response("OK");
  }

  return new Response("Invalid action", { status: 400 });
};
