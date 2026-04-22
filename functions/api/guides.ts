interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM guides ORDER BY created_at DESC").all();
  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=10, s-maxage=30' }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();
  
  if (!data.title || !data.content) {
    return new Response("Missing fields", { status: 400 });
  }

  await DB.prepare("INSERT INTO guides (title, content) VALUES (?, ?)")
    .bind(data.title, data.content)
    .run();

  return new Response("Success", { status: 201 });
};
