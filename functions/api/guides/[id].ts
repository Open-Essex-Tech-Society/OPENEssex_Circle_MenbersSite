interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const id = context.params.id;
  const data: any = await context.request.json();

  if (data.action === "like") {
    await DB.prepare("UPDATE guides SET likes = COALESCE(likes, 0) + 1 WHERE id = ?").bind(id).run();
    return new Response("Liked", { status: 200 });
  } else if (data.action === "edit") {
    await DB.prepare("UPDATE guides SET title = ?, content = ? WHERE id = ?").bind(data.title, data.content, id).run();
    return new Response("Updated", { status: 200 });
  }
  return new Response("Bad Request", { status: 400 });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { DB } = context.env;
  const id = context.params.id;
  await DB.prepare("DELETE FROM guides WHERE id = ?").bind(id).run();
  return new Response("Deleted", { status: 200 });
};
