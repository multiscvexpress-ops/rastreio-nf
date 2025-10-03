// /api/track com suporte a configuração explícita e auto-descoberta
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { cnpj = "", nf = "" } = req.query || {};
  if (!cnpj || !nf) return res.status(400).json({ message: "Parâmetros obrigatórios: cnpj, nf" });

  const base = process.env.BRUDAM_BASE || "https://multi.brudam.com.br";
  const headers = { accept: "application/json" };
  const mode = (process.env.BRUDAM_AUTH_MODE || "bearer").toLowerCase();
  if (mode === "bearer") {
    if (!process.env.BRUDAM_TOKEN) return res.status(500).json({ message: "Falta BRUDAM_TOKEN" });
    headers["authorization"] = `Bearer ${process.env.BRUDAM_TOKEN}`;
  } else {
    const tKey = process.env.BRUDAM_TOKEN_HEADER || "token";
    const uKey = process.env.BRUDAM_USER_HEADER  || "usuario";
    const pKey = process.env.BRUDAM_PASS_HEADER  || "senha";
    if (process.env.BRUDAM_TOKEN) headers[tKey] = process.env.BRUDAM_TOKEN;
    if (process.env.BRUDAM_USER)  headers[uKey] = process.env.BRUDAM_USER;
    if (process.env.BRUDAM_PASS)  headers[pKey] = process.env.BRUDAM_PASS;
  }

  // 1) Configuração explícita (se BRUDAM_ENDPOINT_PATH estiver setado)
  if (process.env.BRUDAM_ENDPOINT_PATH) {
    const pCnpj = process.env.BRUDAM_PARAM_CNPJ || "cnpj_remetente";
    const pDoc  = process.env.BRUDAM_PARAM_DOC  || "nota_fiscal";
    const url  = new URL(process.env.BRUDAM_ENDPOINT_PATH, base);
    url.searchParams.set(pCnpj, cnpj);
    url.searchParams.set(pDoc, nf);
    const extra = (process.env.BRUDAM_EXTRA_QUERY || "").trim();
    if (extra) for (const pair of extra.split("&")) {
      if (!pair) continue; const [k,v=""]=pair.split("="); if (k) url.searchParams.set(k,v);
    }
    try {
      const upstream = await fetch(url.toString(), { headers });
      const bodyText = await upstream.text();
      res.setHeader("X-Upstream-URL", url.toString());
      return res.status(upstream.status).setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8").send(bodyText);
    } catch (e) {
      return res.status(502).json({ message:"Erro ao consultar o provedor", error:String(e), upstream:url.toString() });
    }
  }

  // 2) Auto-descoberta de caminhos e nomes de parâmetros
  const prefixes = ["", "/api"];
  const resources = ["/tracking/ocorrencias/minuta", "/tracking/ocorrencias/nfe", "/tracking/ocorrencias"];
  const cnpjKeys = ["cnpj_remetente", "cnpj", "remetente", "remetente_cnpj"];
  const docKeys  = ["nota_fiscal", "numero_nf", "nf", "documento", "numeroDocumento", "numero_doc", "numeroNfe", "nfe", "chave", "chave_nfe", "chaveNfe"];

  const tried = [];
  for (const pre of prefixes) for (const resPath of resources) for (const kC of cnpjKeys) for (const kD of docKeys) {
    const path = (pre + resPath).replace(/\/{2,}/g,"/");
    const url = new URL(path, base);
    url.searchParams.set(kC, cnpj);
    url.searchParams.set(kD, nf);
    try {
      const r = await fetch(url.toString(), { headers });
      const snippet = await r.text();
      tried.push({ url:url.toString(), status:r.status, ok:r.ok, body: snippet.slice(0,300) });
      if (r.status !== 404) {
        res.setHeader("X-Upstream-URL", url.toString());
        return res.status(r.status).setHeader("Content-Type", r.headers.get("content-type") || "application/json; charset=utf-8").send(snippet);
      }
    } catch (e) {
      tried.push({ url:url.toString(), error:String(e) });
    }
  }

  return res.status(404).json({ message:"Nenhuma combinação de endpoint/parâmetros encontrada", base, tried });
}
