import {mkdir,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
await mkdir(".sites-runtime",{recursive:true});
const config={name:"habeshavoice-local-migrations",compatibility_date:"2026-05-15",d1_databases:[{binding:"DB",database_name:"site-creator-d1",database_id:"00000000-0000-4000-8000-000000000000",migrations_dir:"../drizzle"}]};
await writeFile(".sites-runtime/local-db.json",JSON.stringify(config,null,2));
const state=process.argv[2]||".wrangler/state";
const r=spawnSync(process.execPath,["--import","./scripts/sites-env.mjs","./node_modules/wrangler/bin/wrangler.js","d1","migrations","apply","DB","--local","--config",".sites-runtime/local-db.json","--persist-to",state],{stdio:"inherit"});
process.exit(r.status??1);
