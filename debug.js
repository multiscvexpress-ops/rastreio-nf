export default async function handler(req, res) {
  const info = {
    ok: true,
    base: process.env.BRUDAM_BASE || "https://multi.brudam.com.br",
    endpoint_path: process.env.BRUDAM_ENDPOINT_PATH || "/tracking/ocorrencias/minuta",
    param_cnpj: process.env.BRUDAM_PARAM_CNPJ || "cnpj_remetente",
    param_doc: process.env.BRUDAM_PARAM_DOC || "nota_fiscal",
    extra_query: process.env.BRUDAM_EXTRA_QUERY || "",
    auth_mode: (process.env.BRUDAM_AUTH_MODE || "bearer").toLowerCase(),
    token_set: Boolean(process.env.BRUDAM_TOKEN),
    user_set: Boolean(process.env.BRUDAM_USER),
    pass_set: Boolean(process.env.BRUDAM_PASS),
  };
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(info);
}
