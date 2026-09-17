import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/browser",timeout:45000,fullyParallel:false,workers:1,
 use:{baseURL:"http://localhost:5173",viewport:{width:1440,height:1000},channel:process.env.PW_CHANNEL||undefined,acceptDownloads:true,
 launchOptions:{args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]},
 screenshot:"only-on-failure",trace:"retain-on-failure"},
 webServer:{command:"node scripts/run-framework.mjs dev",url:"http://localhost:5173/api/config",reuseExistingServer:true,timeout:60000},
 reporter:[["list"]],
});


