const assert = require('node:assert/strict');
const { handleImportRequest } = require('/tmp/static-threads-import-tests/service/core.js');
const { validateCandidates, validBox, uniqueCandidates, importKey } = require('/tmp/static-threads-import-tests/client/outfit-import.js');
const uid='00000000-0000-4000-8000-000000000001';
const config={supabaseUrl:'https://auth.example',anonKey:'public',serviceKey:'server-key',providerKey:'provider-key',model:'configured-model',allowedOrigins:['https://site.example']};
// Syntactic JPEG header fixture for handler contracts only; no model/image quality claim.
const jpeg=(w=100,h=200)=>'data:image/jpeg;base64,'+Buffer.from([255,216,255,192,0,11,8,h>>8,h&255,w>>8,w&255,1,1,17,0,255,217]).toString('base64');
const candidate={name:'Draped garment',category:'dresses',colour:'Blue',detail:'Visible layered fabric',confidence:.6,box:[.1,.1,.8,.8]};
const request=(body={consent:true,image:jpeg()},options={})=>new Request('https://edge.example',{method:'POST',headers:{Origin:'https://site.example',Authorization:'Bearer test','Content-Type':'application/json',...options.headers},body:JSON.stringify(body)});
(async()=>{
 let calls=[],quota=true,invalid=false,providerStatus=200;
 const fake=async(url,options)=>{calls.push({url,body:options.body?JSON.parse(options.body):null});if(url.endsWith('/user'))return Response.json({id:uid});if(url.includes('consume_outfit_import_quota'))return Response.json(quota);assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.model,config.model);assert.equal(body.input[0].content[1].image_url,jpeg());assert.ok(!JSON.stringify(body).includes(uid));assert.ok(!JSON.stringify(body).includes(config.serviceKey));return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[invalid?{...candidate,box:[.9,0,.8,1]}:candidate]})}]}]},{status:providerStatus})};
 let r=await handleImportRequest(request(),config,fake);assert.equal(r.status,200);assert.deepEqual((await r.json()).candidates,[candidate]);assert.ok(calls[1].url.includes('quota'));assert.ok(calls[2].url.includes('openai'));
 for(const body of [{consent:false,image:jpeg()},{consent:true,image:'https://remote.example/private.jpg'},{consent:true,image:jpeg(3000,3000)},{consent:true,image:'data:image/jpeg;base64,AAAA'}]){calls=[];r=await handleImportRequest(request(body),config,fake);assert.equal(r.status,400);assert.equal(calls.length,1)}
 calls=[];quota=false;r=await handleImportRequest(request(),config,fake);assert.equal(r.status,429);assert.equal(calls.length,2);quota=true;
 invalid=true;r=await handleImportRequest(request(),config,fake);assert.equal(r.status,502);invalid=false;
 r=await handleImportRequest(request(),{...config,providerKey:''},fake);assert.equal(r.status,503);
 r=await handleImportRequest(request(undefined,{headers:{Origin:'https://wrong.example'}}),config,fake);assert.equal(r.status,403);
 r=await handleImportRequest(new Request('https://edge.example',{method:'POST',headers:{Origin:'https://site.example'},body:'{}'}),config,fake);assert.equal(r.status,401);
 r=await handleImportRequest(request(),config,async()=>new Response('{}',{status:401}));assert.equal(r.status,401);
 r=await handleImportRequest(request({consent:true,image:'a'.repeat(2_900_001)}),config,fake);assert.equal(r.status,413);
 providerStatus=500;r=await handleImportRequest(request(),config,fake);assert.equal(r.status,502);
 assert.equal(validBox([.9,0,.2,1]),false);assert.equal(validBox([0,0,NaN,1]),false);
 const items=validateCandidates([candidate,{...candidate,name:'Jumpsuit',category:'jumpsuits'},{...candidate,name:'Coordinated set',category:'sets'}]);assert.equal(items.length,3);assert.equal(uniqueCandidates('a'.repeat(64),[items[0],items[0]]).length,1);assert.equal(importKey('a'.repeat(64),items[0]),importKey('a'.repeat(64),{...items[0],id:'different'}));assert.throws(()=>validateCandidates([{...candidate,category:'invented-role'}]));
 console.log('PASS: recognition consent/auth/origin/configuration, photo bounds, quota-before-provider, safe failures, editable candidate validation and stable duplicate keys. Provider calls simulated only.');
})().catch(e=>{console.error(e);process.exitCode=1});
