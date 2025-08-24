export default {
  async fetch(req: Request, env: any) {
    const url = new URL(req.url);

    // 1) Exchange code -> token (called by your SPA after redirect)
    if (url.pathname === "/oauth/exchange" && req.method === "POST") {
      const { code, code_verifier, redirect_uri } = await req.json();
      const body = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code, redirect_uri, code_verifier
      });
      const r = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body
      });
      const json = await r.json(); // { access_token, token_type, scope }
      // In production, store token server-side and set an HttpOnly session cookie instead
      return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" }});
    }

    // 2) Proxy gist creation using a stored token/session (simplified)
    if (url.pathname === "/gists" && req.method === "POST") {
      const { token, ...payload } = await req.json();
      const r = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" }});
    }

    return new Response("Not found", { status: 404 });
  }
};
