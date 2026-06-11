interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const { results } = await DB.prepare(
      `SELECT uid, display_name, avatar_url, bio, role, skills, created_at, last_seen
       FROM profiles ORDER BY created_at ASC`
    ).all();
    return Response.json(results, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'CDN-Cache-Control': 'no-store' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  try {
    const { uid } = await context.request.json() as { uid: string };

    if (!uid) {
      return new Response("Missing uid", { status: 400 });
    }

    await DB.prepare(
      "UPDATE profiles SET last_seen = CURRENT_TIMESTAMP WHERE uid = ?"
    ).bind(uid).run();

    return new Response("OK", { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();

  if (!data.uid || !data.display_name) {
    return new Response("Missing uid or display_name", { status: 400 });
  }

  // Reject avatar_url if base64 data is too large (>50KB string = ~37KB image)
  const avatarUrl = (data.avatar_url || '');
  if (avatarUrl.startsWith('data:') && avatarUrl.length > 50000) {
    return new Response("Avatar image too large. Please use a smaller image.", { status: 400 });
  }

  // Upsert: create or update profile
  await DB.prepare(
    `INSERT INTO profiles (uid, display_name, email, avatar_url, bio, role, skills, linkedin_url, github_url, website_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET
       display_name = excluded.display_name,
       email = excluded.email,
       avatar_url = excluded.avatar_url,
       bio = excluded.bio,
       role = excluded.role,
       skills = excluded.skills,
       linkedin_url = excluded.linkedin_url,
       github_url = excluded.github_url,
       website_url = excluded.website_url,
       updated_at = CURRENT_TIMESTAMP,
       last_seen = CURRENT_TIMESTAMP`
  ).bind(
    data.uid,
    data.display_name,
    data.email || '',
    avatarUrl,
    (data.bio || '').slice(0, 500), // Limit bio length
    (data.role || 'Member').slice(0, 50),
    (data.skills || '').slice(0, 200),
    (data.linkedin_url || '').slice(0, 200),
    (data.github_url || '').slice(0, 200),
    (data.website_url || '').slice(0, 200)
  ).run();

  return new Response("Success", { status: 201 });
};
