import assert from "node:assert/strict";
const base=process.env.TEST_BASE_URL||"http://localhost:5173";
const origin=new URL(base).origin;
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname))throw new Error("Smoke test only runs against a local development server.");
let r=await fetch(base+"/api/transcripts");assert.equal(r.status,401);
const signin=await fetch(base+"/signin-with-chatgpt?return_to=/",{redirect:"manual"});
const cookie=signin.headers.get("set-cookie")?.split(";")[0];assert.ok(cookie);
const headers={cookie,origin,"content-type":"application/json"};
let id;
try{
 r=await fetch(base+"/api/transcripts",{method:"POST",headers,body:JSON.stringify({title:"Automated test",text:"ሰላም",language:"ti",sampleId:"sample-ti"})});assert.equal(r.status,201,await r.clone().text());const created=(await r.json()).transcript;id=created.id;
 r=await fetch(base+"/api/transcripts/"+id,{method:"PATCH",headers,body:JSON.stringify({title:"Updated test",text:"ሰላም!"})});assert.equal(r.status,200);const edited=(await r.json()).transcript;assert.equal(edited.text,"ሰላም!");assert.equal(edited.original,created.original);
 r=await fetch(base+"/api/transcripts/"+id,{headers:{cookie}});assert.equal(r.status,200);
 r=await fetch(base+"/api/transcripts/"+id);assert.equal(r.status,401);
 r=await fetch(base+"/api/transcripts/"+id,{method:"PATCH",headers:{...headers,origin:"https://attacker.example"},body:JSON.stringify({title:"Bad",text:"Bad"})});assert.equal(r.status,403);
 r=await fetch(base+"/api/transcripts/"+id,{method:"PATCH",headers,body:JSON.stringify({title:"",text:"Bad"})});assert.equal(r.status,400);
 r=await fetch(base+"/api/transcripts/00000000-0000-4000-8000-000000000000",{headers:{cookie}});assert.equal(r.status,404);
 r=await fetch(base+"/api/transcripts/"+id+"/audio",{headers:{cookie}});assert.equal(r.status,404);
 r=await fetch(base+"/api/transcribe",{method:"POST",headers});assert.equal(r.status,503);
 console.log("PASS: authentication, create, edit, immutable original, read, CSRF, validation, missing audio, missing speech-engine guard.");
}finally{if(id){const deleted=await fetch(base+"/api/transcripts/"+id,{method:"DELETE",headers});assert.equal(deleted.status,200);const gone=await fetch(base+"/api/transcripts/"+id,{headers:{cookie}});assert.equal(gone.status,404);console.log("PASS: deletion and read-after-delete.");}}

