import { spawnSync } from 'node:child_process';
for (const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build'],['node_modules/typescript/bin/tsc','-p','tsconfig.server.json']]) {
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.error) { console.error(result.error.message); process.exit(1); }
  if(result.status!==0)process.exit(result.status||1);
}
