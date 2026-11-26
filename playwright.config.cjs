const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',testMatch:'**/*.spec.js',use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium'},webServer:{command:'node scripts/test-server.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:false},reporter:'list'});
