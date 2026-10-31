const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {png}=require('./outfit_visual_test_fixture.cjs');
const root=path.resolve(__dirname,'../out');
const base='http://127.0.0.1:4177/STATIC-THREADS/';
const shots='/tmp/static-threads-chat-visuals';
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,base).pathname).replace(/^\/STATIC-THREADS(?=\/|$)/,'')||'/';
 let file=path.resolve(root,`.${pathname}`);if(!file.startsWith(root+path.sep)&&file!==root)return res.writeHead(403).end();
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file))return res.writeHead(404).end();
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 fs.mkdirSync(shots,{recursive:true});await new Promise(resolve=>server.listen(4177,'127.0.0.1',resolve));
 const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].find(file=>fs.existsSync(file));
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844}});const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 try{
  const page=await context.newPage();await page.goto(base);assert.equal(await page.title(),'Static Threads');
  await page.getByRole('button',{name:'Plan an outfit',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Your outfit planner'});
  async function send(text){await dialog.getByLabel('Tell the planner').fill(text);await dialog.getByRole('button',{name:'Send',exact:true}).click()}
  await send('Dinner casual indoors');
  const first=dialog.locator('.outfit-chat-outfit').first();await first.locator('.chat-mannequin-gallery').waitFor();
  assert.equal(await first.getByRole('button',{name:/Show .* mannequin view/}).count(),5);
  for(const pose of ['walking','sitting','front','back','side']){
   await first.getByRole('button',{name:`Show ${pose} mannequin view`,exact:true}).click();
   assert.equal(await first.getByRole('button',{name:`Show ${pose} mannequin view`,exact:true}).getAttribute('aria-pressed'),'true');
  }
  const href=await first.locator('.chat-mannequin-main image').getAttribute('href');assert.ok(href.startsWith('/STATIC-THREADS/lookbooks/collections/v1/'));
  assert.equal((await page.request.get(new URL(href,base).href)).status(),200);
  await first.getByRole('button',{name:'Show complete image board'}).click();
  await first.locator('.chat-mannequin-full').waitFor();assert.ok(await first.locator('.chat-mannequin-full').evaluate(node=>node.complete&&node.naturalWidth>0));
  await first.getByRole('button',{name:'Show selected pose'}).click();
  await first.getByRole('button',{name:'Show front mannequin view',exact:true}).click();
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});await first.locator('.chat-mannequin-gallery').scrollIntoViewIfNeeded();
   const box=await first.locator('.chat-mannequin-gallery').boundingBox(),bounds=await dialog.boundingBox();assert.ok(box.x>=bounds.x&&box.x+box.width<=bounds.x+bounds.width);
   if(width===390)await page.screenshot({path:`${shots}/catalogue-mobile.png`});if(width===1280)await page.screenshot({path:`${shots}/catalogue-desktop.png`});
  }
  await dialog.getByRole('button',{name:'New plan'}).click();await send('Wedding formal indoors');
  const fallback=dialog.getByRole('button',{name:'Suggest top 5 outfits from the web',exact:true});await fallback.waitFor();await fallback.click();
  if(!process.env.TEST_WEB){
   await dialog.getByText('This service is not connected yet. Catalogue previews remain available.',{exact:true}).waitFor();
   assert.equal(await dialog.getByRole('button',{name:'Search and create mannequin previews'}).isDisabled(),true);
  }else{
   let searches=0,renders=0,failRender=false;
   const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',email:'visuals@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
   const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const expires=Math.floor(Date.now()/1000)+3600;
   const session={access_token:`${b64({alg:'HS256'})}.${b64({sub:user.id,aud:'authenticated',exp:expires})}.test`,refresh_token:'test',token_type:'bearer',expires_in:3600,expires_at:expires,user};
   await context.route('https://auth-test.example/**',async route=>{
    const request=route.request(),url=new URL(request.url());const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
    if(request.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
    if(url.pathname.endsWith('/user'))return route.fulfill({status:200,headers,body:JSON.stringify(user)});
    if(url.pathname.endsWith('/wardrobe_items'))return route.fulfill({status:200,headers,body:'[]'});
    assert.ok(url.pathname.endsWith('/functions/v1/outfit-visuals'));const body=request.postDataJSON();assert.ok(request.headers().authorization.startsWith('Bearer '));
    if(body.action==='search'){
     searches++;assert.equal(body.consent,true);assert.ok(!JSON.stringify(body).includes(user.email));
     return route.fulfill({status:200,headers,body:JSON.stringify({outfits:Array.from({length:5},(_,i)=>({title:`Sourced outfit ${i+1}`,description:'Test description',pieces:['Blue shirt','Grey trousers','White shoes'],sourceUrls:[`https://fashion.example/${i}`],ticket:`test-ticket-${i}`,checkedAt:'2026-10-31'}))})});
    }
    renders++;assert.equal(body.action,'render');assert.ok(body.ticket.startsWith('test-ticket-'));
    if(failRender)return route.fulfill({status:502,headers,body:'{}'});
    const frames=Array.from({length:5},(_,i)=>[Math.floor(i*1536/5),0,Math.floor((i+1)*1536/5)-Math.floor(i*1536/5),1024]);
    return route.fulfill({status:200,headers,body:JSON.stringify({board:{asset:`data:image/png;base64,${png()}`,width:1536,height:1024,frames,label:'Generated test fixture'}})});
   });
   await page.evaluate(value=>localStorage.setItem('sb-auth-test-auth-token',JSON.stringify(value)),session);await page.reload();
   await page.getByRole('button',{name:'Plan an outfit',exact:true}).click();await dialog.getByRole('button',{name:'Try demo wardrobe'}).click();
   await send('Wedding formal indoors');await fallback.click();
   assert.equal(searches,0); // No external request before explicit confirmation.
   await dialog.getByRole('button',{name:'Search and create mannequin previews'}).click();
   await dialog.getByText('5 web outfit suggestion(s). These are inspiration, not owned wardrobe items.',{exact:true}).waitFor();
   await page.waitForFunction(()=>document.querySelectorAll('.chat-web-result .chat-mannequin-gallery').length===5);
   assert.equal(searches,1);assert.equal(renders,5);assert.equal(await dialog.locator('.chat-web-sources a').count(),5);
   for(const result of await dialog.locator('.chat-web-result').all())assert.equal(await result.getByRole('button',{name:/Show .* mannequin view/}).count(),5);
   // Restarting a plan clears web results and aborts queued work.
   await dialog.getByRole('button',{name:'New plan'}).click();assert.equal(await dialog.locator('.chat-web-result').count(),0);
   failRender=true;await send('Wedding formal indoors');await fallback.click();await dialog.getByRole('button',{name:'Search and create mannequin previews'}).click();
   await dialog.getByRole('button',{name:'Retry mannequin preview',exact:true}).first().waitFor();assert.equal(await dialog.locator('.chat-web-result .chat-mannequin-gallery').count(),0);
  }
  assert.deepEqual(errors,[]);console.log('PASS: exact catalogue mapping, five poses/full board, real asset loads, responsive gallery, explicit unconfigured fallback'+(process.env.TEST_WEB?', confirmed top-five web flow, five per-result boards, citations, reset and failure states.':'.'));
 }finally{await context.close();await browser.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
