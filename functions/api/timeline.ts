interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM timeline ORDER BY created_at DESC").all();
  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=10, s-maxage=30' }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();
  
  if (!data.type || !data.url || !data.title || !data.author) {
    return new Response("Missing fields", { status: 400 });
  }

  await DB.prepare("INSERT INTO timeline (type, url, title, description, author) VALUES (?, ?, ?, ?, ?)")
    .bind(data.type, data.url, data.title, data.description || '', data.author)
    .run();

  return new Response("Success", { status: 201 });
};
