// Calls a tool of the n8n MCP server with the access token of n8ncli (~/.n8ncli-global.json, never printed).
// Used to update an existing workflow in place (update_workflow), which n8ncli push cannot do without an n8n API key.
// Usage: node scripts/n8n_mcp.mjs <tool> '<json args>' | @file.json
import { createRequire } from 'module';
import fs from 'fs'; import os from 'os'; import path from 'path';
const require = createRequire('/opt/homebrew/lib/node_modules/@workflows-accelerator/n8n-cli/package.json');
const { Client } = await import(require.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StreamableHTTPClientTransport } = await import(require.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js'));
const g = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.n8ncli-global.json'), 'utf8'));
const env = (g.environments || {}).prod || {};
const url = env.instanceUrl || g.instanceUrl; const token = env.accessToken || g.accessToken;
const base = url.endsWith('/mcp-server/http') ? url : new URL('/mcp-server/http', url).toString();
const client = new Client({ name: 'n8n-course', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(base), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
const args = process.argv[3] ? JSON.parse(process.argv[3].startsWith('@') ? fs.readFileSync(process.argv[3].slice(1), 'utf8') : process.argv[3]) : {};
const res = await client.callTool({ name: process.argv[2], arguments: args }, undefined, { timeout: 120000 });
for (const c of res.content || []) console.log(c.type === 'text' ? c.text : JSON.stringify(c));
if (res.structuredContent && !(res.content || []).length) console.log(JSON.stringify(res.structuredContent));
await client.close();
