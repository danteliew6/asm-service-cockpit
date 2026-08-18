import { analytics, createApp, genie, getExecutionContext, server, serving } from "@databricks/appkit";
import { z } from "zod";

//#region server/server.ts
const CATALOG = "dante_classic_stable_catalog";
const SCHEMA = "asm_service_forecast";
const VS_INDEX = `${CATALOG}.${SCHEMA}.kb_search_index`;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID ?? "";
const LLM_ENDPOINT = process.env.DATABRICKS_SERVING_ENDPOINT_NAME ?? "databricks-claude-sonnet-5";
function userEmail(req) {
	const h = req.headers;
	const email = h["x-forwarded-email"] ?? h["x-forwarded-user"];
	return email && email.length > 0 ? email : "demo.user@asm.com";
}
createApp({
	plugins: [
		analytics(),
		genie(),
		server(),
		serving()
	],
	async onPluginsReady(appkit) {
		appkit.server.extend((app) => {
			app.get("/api/whoami", (req, res) => {
				res.json({ email: userEmail(req) });
			});
			const submitSchema = z.object({
				account_id: z.number(),
				account_name: z.string(),
				region: z.string(),
				version_id: z.string(),
				forecast_month: z.string(),
				next6_forecast: z.number(),
				confidence: z.string(),
				status: z.enum(["Draft", "Submitted"]),
				drivers_json: z.string(),
				notes: z.string().optional().default("")
			});
			app.post("/api/submit-forecast", async (req, res) => {
				const parsed = submitSchema.safeParse(req.body);
				if (!parsed.success) {
					res.status(400).json({
						error: "Invalid payload",
						details: parsed.error.issues
					});
					return;
				}
				const b = parsed.data;
				const by = userEmail(req);
				const submissionId = `${b.account_id}-${b.version_id}-${Date.now()}`;
				const { client: w } = getExecutionContext();
				try {
					const resp = await w.statementExecution.executeStatement({
						warehouse_id: WAREHOUSE_ID,
						catalog: CATALOG,
						schema: SCHEMA,
						wait_timeout: "30s",
						statement: `INSERT INTO ${CATALOG}.${SCHEMA}.forecast_submissions
              (submission_id, account_id, account_name, region, version_id, forecast_month,
               next6_forecast, confidence, status, drivers_json, notes, submitted_by, submitted_at)
              VALUES (:sid, :aid, :aname, :region, :vid, :fmonth, :next6, :conf, :status, :drivers, :notes, :by, current_timestamp())`,
						parameters: [
							{
								name: "sid",
								value: submissionId,
								type: "STRING"
							},
							{
								name: "aid",
								value: String(b.account_id),
								type: "INT"
							},
							{
								name: "aname",
								value: b.account_name,
								type: "STRING"
							},
							{
								name: "region",
								value: b.region,
								type: "STRING"
							},
							{
								name: "vid",
								value: b.version_id,
								type: "STRING"
							},
							{
								name: "fmonth",
								value: b.forecast_month,
								type: "STRING"
							},
							{
								name: "next6",
								value: String(Math.round(b.next6_forecast)),
								type: "BIGINT"
							},
							{
								name: "conf",
								value: b.confidence,
								type: "STRING"
							},
							{
								name: "status",
								value: b.status,
								type: "STRING"
							},
							{
								name: "drivers",
								value: b.drivers_json,
								type: "STRING"
							},
							{
								name: "notes",
								value: b.notes ?? "",
								type: "STRING"
							},
							{
								name: "by",
								value: by,
								type: "STRING"
							}
						]
					});
					const state = resp.status?.state;
					if (state && state !== "SUCCEEDED") {
						res.status(500).json({
							error: `Statement ${state}`,
							detail: resp.status?.error
						});
						return;
					}
					res.status(201).json({
						ok: true,
						submission_id: submissionId,
						status: b.status,
						submitted_by: by
					});
				} catch (err) {
					res.status(500).json({
						error: "Write failed",
						detail: String(err)
					});
				}
			});
			const askSchema = z.object({ question: z.string().min(2) });
			app.post("/api/service-assistant", async (req, res) => {
				const parsed = askSchema.safeParse(req.body);
				if (!parsed.success) {
					res.status(400).json({ error: "Invalid payload" });
					return;
				}
				const { question } = parsed.data;
				const { client: w } = getExecutionContext();
				try {
					const rows = (await w.vectorSearchIndexes.queryIndex({
						index_name: VS_INDEX,
						columns: [
							"id",
							"doc_type",
							"title",
							"product_line",
							"text"
						],
						query_text: question,
						num_results: 5
					})).result?.data_array ?? [];
					const sources = rows.map((r) => ({
						id: r[0],
						doc_type: r[1],
						title: r[2],
						product_line: r[3],
						score: Number(r[5])
					}));
					const context = rows.map((r, i) => `[${i + 1}] (${r[1]} · ${r[3]}) ${r[2]}\n${r[4]}`).join("\n\n");
					const raw = (await w.servingEndpoints.query({
						name: LLM_ENDPOINT,
						max_tokens: 600,
						messages: [{
							role: "system",
							content: "You are the ASM International field-service assistant. Answer the engineer's question using ONLY the retrieved service bulletins and spare-part records below. Be concise and practical: name the likely root cause, the specific part numbers to replace, and the recommended action. Cite sources as [n]. If the context does not cover it, say so.\n\nRETRIEVED CONTEXT:\n" + context
						}, {
							role: "user",
							content: question
						}]
					})).choices?.[0]?.message?.content;
					let answer = "No answer generated.";
					if (typeof raw === "string") answer = raw;
					else if (Array.isArray(raw)) {
						const text = raw.filter((b) => b && typeof b === "object" && b.type === "text").map((b) => b.text ?? "").join("\n").trim();
						if (text) answer = text;
					}
					res.json({
						answer,
						sources
					});
				} catch (err) {
					res.status(500).json({
						error: "Assistant failed",
						detail: String(err)
					});
				}
			});
		});
	}
}).catch(console.error);

//#endregion
export {  };