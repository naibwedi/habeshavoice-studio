import {test,expect} from "@playwright/test";
import fs from "node:fs/promises";
test("workspace, edit, persistent save, export and delete",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/"); await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await expect(page.getByRole("heading",{name:"Your voice. In your words."})).toBeVisible();
 await expect(page.getByRole("alert")).toHaveCount(0);
 const text=page.getByRole("textbox",{name:"Transcript text"});
 const original=await text.inputValue();
 await page.getByRole("textbox",{name:"Transcript title"}).fill("Browser verification note");
 await text.fill(original+"\n\nሰላም!"); await expect(page.getByText("Unsaved changes")).toBeVisible();
 await page.getByRole("button",{name:"Save a copy",exact:true}).click();
 await expect(page.getByRole("button",{name:"Save changes",exact:true})).toBeDisabled();
 await page.getByRole("button",{name:"View original",exact:true}).click();
 await expect(text).toHaveValue(original);
 await page.getByRole("button",{name:"Back to edits",exact:true}).click();
 await expect(text).toHaveValue(original+"\n\nሰላም!");
 await page.getByRole("button",{name:"Export transcript",exact:true}).click();
 const downloading=page.waitForEvent("download");
 await page.getByRole("button",{name:"Plain text (.txt)",exact:true}).click();
 const download=await downloading;
 expect(await download.failure()).toBeNull();
 const path=await download.path();expect(path).toBeTruthy();
 expect(await fs.readFile(path!,"utf8")).toBe(original+"\n\nሰላም!");
 await page.reload();
 await page.getByRole("button",{name:/My library/}).click();
 await page.getByRole("textbox",{name:"Search transcripts"}).fill("Browser verification note");
 await page.getByRole("button",{name:/Browser verification note/}).click();
 await expect(text).toHaveValue(original+"\n\nሰላም!");
 await page.getByRole("button",{name:"Delete transcript",exact:true}).click();
 await page.getByRole("button",{name:"Delete session",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Every story starts with a voice."})).toBeVisible();
 expect(errors).toEqual([]);
});
test("fake microphone capture, preview and consent gate",async({page,context})=>{
 await context.grantPermissions(["microphone"]);
 await page.goto("/"); await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await page.getByRole("button",{name:"Start recording",exact:true}).click();
 await expect(page.getByRole("button",{name:"Stop recording",exact:true})).toBeVisible();
 await expect(page.locator(".timer")).toHaveText(/00:0[1-9]/);
 await page.getByRole("button",{name:"Stop recording",exact:true}).click();
 await expect(page.locator("audio.form-audio")).toBeVisible();
 await expect(page.getByRole("button",{name:"Transcribe Tigrinya",exact:true})).toBeDisabled();
 await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Transcribe Tigrinya",exact:true}).click();
 await expect(page.getByRole("dialog")).toContainText("Not connected");
 await page.getByRole("button",{name:"Close dialog",exact:true}).click();
 await expect(page.locator("audio.form-audio")).toBeVisible();
});
test("mobile layout, language switching and sample editing",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/"); await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await page.getByRole("button",{name:"Amharic አማርኛ",exact:true}).click();
 await page.getByRole("button",{name:"Open Amharic demo sample",exact:true}).click();
 await expect(page.getByRole("textbox",{name:"Transcript title"})).toHaveValue("A moment to connect");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:"test-results/studio-mobile.png",fullPage:true});
});
test("unsaved changes are protected when switching documents",async({page})=>{
 await page.goto("/"); await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await page.getByRole("textbox",{name:"Transcript title"}).fill("Unsaved title"); await expect(page.getByText("Unsaved changes")).toBeVisible();
 await page.getByRole("button",{name:"Amharic አማርኛ",exact:true}).click(); await page.getByRole("button",{name:"Open Amharic demo sample",exact:true}).click();
 await expect(page.getByRole("dialog")).toContainText("unsaved edits");
 await page.getByRole("button",{name:"Keep editing",exact:true}).click();
 await expect(page.getByRole("textbox",{name:"Transcript title"})).toHaveValue("Unsaved title");
});
test("desktop screenshot and install manifest",async({page})=>{
 await page.goto("/"); await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await expect(page.getByRole("alert")).toHaveCount(0);
 await page.screenshot({path:"test-results/studio-desktop.png",fullPage:true});
 const manifest=await(await page.request.get("/manifest.webmanifest")).json();
 expect(manifest.display).toBe("standalone");
 expect(manifest.name).toBe("HabeshaVoice Studio");
});



