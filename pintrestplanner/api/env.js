export default function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

  // You should ONLY expose keys intended for the browser (the anon key is public by design).
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.status(200).send(
    `window.ENV = {
      SUPABASE_URL: ${JSON.stringify(SUPABASE_URL || "")},
      SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY || "")}
    };`
  );
}
