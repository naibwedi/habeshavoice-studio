import {test,expect} from "@playwright/test";
test("honest empty workspace and no generated sample text",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/");await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await expect(page.getByRole("heading",{name:"Every story starts with a voice."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"No sessions yet"})).toBeVisible();
 await expect(page.getByText("Speech engine offline")).toBeVisible();
 await expect(page.getByRole("textbox",{name:"Transcript text"})).toHaveCount(0);
 await page.getByRole("button",{name:/My library/}).click();
 await expect(page.getByRole("heading",{name:"Your library starts here"})).toBeVisible();
 expect(errors).toEqual([]);
});
test("recording, preview, consent and disconnected speech engine",async({page,context})=>{
 await context.grantPermissions(["microphone"]);
 await page.goto("/");await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await page.getByRole("button",{name:"Start recording",exact:true}).click();
 await expect(page.getByRole("button",{name:"Stop recording",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Stop recording",exact:true}).click();
 await expect(page.locator("audio.form-audio")).toBeVisible();
 await expect(page.getByRole("button",{name:"Transcribe Tigrinya",exact:true})).toBeDisabled();
 await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Transcribe Tigrinya",exact:true}).click();
 await expect(page.getByRole("dialog")).toContainText("Not connected");
});
test("mobile layout and language switching",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/");
 await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 await page.getByRole("button",{name:"Amharic አማርኛ",exact:true}).click();
 await expect(page.getByRole("button",{name:"Amharic አማርኛ",exact:true})).toHaveAttribute("aria-pressed","true");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:"docs/studio-mobile.png",fullPage:true});
});
test("manifest and desktop rendering",async({page})=>{
 await page.goto("/");await expect(page.locator(".shell")).toHaveAttribute("aria-busy","false");
 const manifest=await(await page.request.get("/manifest.webmanifest")).json();
 expect(manifest.display).toBe("standalone");expect(manifest.name).toBe("HabeshaVoice Studio");
 await expect(page.getByRole("alert")).toHaveCount(0);
 await page.screenshot({path:"docs/studio-desktop.png",fullPage:true});
});



