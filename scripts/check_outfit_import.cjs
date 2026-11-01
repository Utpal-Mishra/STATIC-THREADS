// Local browser contracts use public catalogue art and intercepted services only.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'../out'),base='http://127.0.0.1:4185/STATIC-THREADS/';
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname).replace(/^\/STATIC-THREADS(?=\/|$)/,''));if(!file.startsWith(root+path.sep)&&file!==root)return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
const fixture=path.resolve(__dirname,'../public/catalog/grey-overshirt.webp');
const uid='00000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'photo-test@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
function session(){const exp=Math.floor(Date.now()/1000)+3600,b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');return {access_token:`${b64({alg:'HS256'})}.${b64({sub:uid,aud:'authenticated',exp})}.test`,refresh_token:'test',token_type:'bearer',expires_in:3600,expires_at:exp,user}}
(async()=>{
 await new Promise(r=>server.listen(4185,'127.0.0.1',r));const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].find(fs.existsSync);const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 const errors=[];try{
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('link',{name:'Import outfit photo',exact:true}).click();await page.getByRole('heading',{name:'Import an outfit',exact:true}).waitFor();assert.equal(await page.title(),'Static Threads');
  await page.getByLabel('Outfit photo',{exact:true}).setInputFiles(fixture);await page.getByAltText('Your selected full outfit, for garment review').waitFor();assert.equal(await page.getByRole('button',{name:'Detect garments',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Add a piece manually'}).click();const card=page.getByRole('article',{name:'Piece 1',exact:true});await card.getByLabel('Garment name',{exact:true}).fill('Reviewed draped garment');await card.getByLabel('Clothing category',{exact:true}).selectOption('dresses');await card.getByLabel('Colour',{exact:true}).fill('Blue');
  await card.getByText('Adjust visible crop',{exact:true}).click();const crop=card.locator('svg');const old=await crop.getAttribute('viewBox');await card.getByRole('slider',{name:'Left for piece 1',exact:true}).press('ArrowRight');assert.notEqual(await crop.getAttribute('viewBox'),old);
  const keep=page.getByRole('button',{name:'Keep selected in this session'});assert.equal(await keep.isDisabled(),true);await page.getByLabel('I have checked the selected names, categories and crops.').check();await keep.click();await page.getByRole('heading',{name:'Confirmed pieces',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Save selected to my wardrobe'}).isDisabled(),true);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/outfit-import-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('data:image/'))),false);
  await page.getByRole('button',{name:'Clear photo and draft'}).click();assert.equal(await page.getByRole('article').count(),0);assert.equal(await page.getByAltText('Your selected full outfit, for garment review').count(),0);
  await page.getByLabel('Outfit photo',{exact:true}).setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await page.getByRole('alert').filter({hasText:'Choose a JPEG'}).waitFor();
  await context.close();
  if(process.env.TEST_IMPORT==='1'){
   const privateContext=await browser.newContext({viewport:{width:390,height:844}});let detections=0,saveFail=true,invalid=false;const rows=new Map();
   await privateContext.route('https://auth-test.example/**',async route=>{const req=route.request(),url=new URL(req.url()),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};let body={},status=200;
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
    if(url.pathname.endsWith('/user'))body=user;
    else if(url.pathname.endsWith('/wardrobe_items')){assert.equal(url.searchParams.get('user_id'),'eq.'+uid);body=[...rows.values()]}
    else if(url.pathname.endsWith('/functions/v1/outfit-import')){detections++;const input=req.postDataJSON();assert.equal(input.consent,true);assert.ok(input.image.startsWith('data:image/jpeg;base64,'));assert.ok(!JSON.stringify(input).includes(user.email));body={candidates:[{name:'Sari',category:'dresses',colour:'Blue',detail:'Draped garment',confidence:.67,box:invalid?[.9,0,.8,1]:[.1,.1,.8,.8]},{name:'Coordinated set',category:'sets',colour:'Cream',detail:'User review required',confidence:.4,box:[.1,.1,.8,.8]}]}}
    else if(url.pathname.endsWith('/rpc/import_outfit_items')){const input=req.postDataJSON();assert.ok(!JSON.stringify(input).includes('data:image'));if(saveFail){status=403;body={message:'not permitted'}}else{for(const item of input.p_items){assert.ok(item.client_item_id.startsWith('photo:'));if(!rows.has(item.client_item_id))rows.set(item.client_item_id,{...item,id:crypto.randomUUID(),user_id:uid})}body=input.p_items.map(item=>rows.get(item.client_item_id))}}
    else throw new Error('Unexpected test service path '+url.pathname);
    return route.fulfill({status,headers,body:JSON.stringify(body)});
   });
   await privateContext.addInitScript(value=>localStorage.setItem('sb-auth-test-auth-token',JSON.stringify(value)),session());const p=await privateContext.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'import/');await p.getByRole('heading',{name:'Your imported wardrobe'}).waitFor();await p.getByLabel('Outfit photo',{exact:true}).setInputFiles(fixture);await p.getByRole('button',{name:'Add a piece manually'}).waitFor();assert.equal(detections,0);
   await p.getByLabel('I agree to send this photo for clothing recognition.').check();await p.getByRole('button',{name:'Detect garments',exact:true}).click();await p.getByRole('article',{name:'Piece 2',exact:true}).waitFor();assert.equal(detections,1);
   await p.getByLabel('I have checked the selected names, categories and crops.').check();await p.getByRole('button',{name:'Save selected to my wardrobe'}).click();await p.getByRole('alert').filter({hasText:'Saving could not be confirmed'}).waitFor();assert.equal(rows.size,0);
   saveFail=false;await p.getByRole('button',{name:'Save selected to my wardrobe'}).click();await p.getByRole('status').filter({hasText:'confirmed in your private wardrobe'}).waitFor();assert.equal(rows.size,2);await p.getByRole('button',{name:'Save selected to my wardrobe'}).click();await p.getByRole('status').filter({hasText:'confirmed in your private wardrobe'}).waitFor();assert.equal(rows.size,2);
   await p.reload();await p.getByRole('region',{name:'Previously imported wardrobe'}).getByText('Sari · dresses · Blue',{exact:true}).waitFor();assert.equal(await p.getByAltText('Your selected full outfit, for garment review').count(),0);
   await p.getByLabel('Outfit photo',{exact:true}).setInputFiles(fixture);await p.getByLabel('I agree to send this photo for clothing recognition.').check();invalid=true;await p.getByRole('button',{name:'Detect garments',exact:true}).click();await p.getByRole('alert').filter({hasText:'crop coordinates need correction'}).waitFor();assert.equal(await p.getByRole('article').count(),0);
   await privateContext.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: private photo preparation, manual categories/crops, review gate, session confirmation, clearing, unsupported files and responsive bounds.'+(process.env.TEST_IMPORT?' Recognition consent, invalid output, private save failure/retry/idempotency and reload contracts passed (simulated services).':''));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
