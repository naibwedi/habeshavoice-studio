import test from "node:test";
import assert from "node:assert/strict";
import {editSchema,createSchema,languageSchema,inferenceSchema,isSameOrigin} from "../lib/validation.ts";
test("only the two supported languages are accepted",()=>{assert.equal(languageSchema.parse("ti"),"ti");assert.equal(languageSchema.parse("am"),"am");assert.throws(()=>languageSchema.parse("en"));});
test("empty titles, oversized transcripts, and extra fields are rejected",()=>{assert.throws(()=>editSchema.parse({title:" ",text:""}));assert.throws(()=>editSchema.parse({title:"a",text:"x".repeat(50001)}));assert.throws(()=>editSchema.parse({title:"a",text:"ok",owner:"someone-else"}));});
test("Ethiopic text survives validation unchanged",()=>{const text="ሰላም! ከመይ ኣለኹም?";assert.equal(editSchema.parse({title:"  My note  ",text}).text,text);});
test("a saved sample must reference a known demo",()=>{assert.throws(()=>createSchema.parse({title:"a",text:"a",language:"ti",sampleId:"unknown"}));});
test("cross-site writes are denied",()=>{assert.equal(isSameOrigin(new Request("https://studio.example/api",{headers:{origin:"https://attacker.example"}})),false);assert.equal(isSameOrigin(new Request("https://studio.example/api",{headers:{origin:"https://studio.example"}})),true);assert.equal(isSameOrigin(new Request("https://studio.example/api",{headers:{"sec-fetch-site":"cross-site"}})),false);});
test("inference output must have bounded duration and non-empty text",()=>{assert.throws(()=>inferenceSchema.parse({text:"",duration:1}));assert.throws(()=>inferenceSchema.parse({text:"a",duration:301}));assert.throws(()=>inferenceSchema.parse({text:"a",duration:NaN}));});

