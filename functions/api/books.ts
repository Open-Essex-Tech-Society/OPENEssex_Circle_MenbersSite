interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const { results } = await DB.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const data: any = await context.request.json();
  
  if (!data.title || !data.description || !data.author) {
    return new Response("Missing fields", { status: 400 });
  }

  await DB.prepare("INSERT INTO books (title, description, author, link) VALUES (?, ?, ?, ?)")
    .bind(data.title, data.description, data.author, data.link || null)
    .run();

  return new Response("Success", { status: 201 });
};
