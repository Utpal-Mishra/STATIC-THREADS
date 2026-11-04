// Token binding and recovery contracts. No real account or provider requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('lib/personal-wardrobe.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let token='token-A', verifiedTokens=[],requests=[],mode='ok';
const owner='00000000-0000-4000-8000-000000000001',itemId='00000000-0000-4000-8000-000000000011';
const row={id:itemId,user_id:owner,revision:1};
const moduleObj={exports:{}};
const mockClient={auth:{
  getSession:async()=>({data:{session:{access_token:token,user:{id:owner}}}}),
  getUser:async t=>{verifiedTokens.push(t);return {data:{user:{id:owner}}};}
}};
const fakeRequire=name=>name.includes('supabase-browser') ? {
  getCloudConfig:()=>({url:'https://test.example',anonKey:'public'}),getSupabaseBrowser:()=>mockClient
} : {prepareImportPhoto:async()=>({data:'data:image/jpeg;base64,YQ=='})};
new Function('require','exports','module',source)(fakeRequire,moduleObj.exports,moduleObj);
global.fetch=async(url,init={})=>{requests.push({url,init});if(String(url).startsWith('data:'))return {blob:async()=>new Blob(['a'],{type:'image/jpeg'})};
 if(mode==='missing')return new Response(JSON.stringify({code:'PGRST202'}),{status:404});
 if(mode==='conflict')return new Response(JSON.stringify({code:'40001'}),{status:409});
 if(mode==='offline')throw new TypeError('network');
 let data=[];
 if(String(url).includes('wardrobe_items?'))data=[mode==='foreign'?{...row,user_id:'other'}:row];
 if(String(url).includes('/rpc/save_'))data=row;
 if(String(url).includes('/sign/'))data={signedURL:'/object/sign/wardrobe-private/'+owner+'/'+itemId+'/photo.jpg?token=fixture'};
 if(String(url).includes('/rpc/wardrobe_photo_action')){let body=JSON.parse(init.body);data=body.p_action==='stage'?{id:body.p_photo_id,item_id:itemId,user_id:owner,path:owner+'/'+itemId+'/'+body.p_photo_id+'.jpg',state:'staged'}:row;if(body.p_action==='attach'&&mode==='attach-fail')return new Response('{}',{status:500});}
 return new Response(JSON.stringify(data),{status:200});};
(async()=>{const {personalSession,emptyDraft}=moduleObj.exports,c=new AbortController();const api=await personalSession(owner,c.signal);token='token-B';await api.save(itemId,1,{...emptyDraft(),name:'shirt'});assert.equal(requests.at(-1).init.headers.Authorization,'Bearer token-A');assert.deepEqual(verifiedTokens,['token-A']);
 const signed=await api.signedPhoto({id:'photo',user_id:owner,item_id:itemId,state:'current',path:owner+'/'+itemId+'/photo.jpg'});assert.ok(signed.startsWith('https://test.example/storage/v1/object/sign/'));
 for(const [m,kind] of [['missing','setup'],['conflict','conflict'],['offline','network'],['foreign','network']]){mode=m;await assert.rejects(()=>api.list(0),e=>e.kind===kind)}
 mode='attach-fail';requests=[];await assert.rejects(()=>api.upload(row,{}));assert.ok(requests.some(r=>r.url.includes('/storage/v1/object/wardrobe-private/')));assert.equal(requests.some(r=>r.init.method==='DELETE'),false,'Ambiguous attach must never delete a possibly-current photo');
 mode='ok';requests=[];const aborted=new AbortController();const scoped=await personalSession(owner,aborted.signal);aborted.abort();await assert.rejects(()=>scoped.save(itemId,1,emptyDraft()));assert.equal(requests.length,0);
 console.log('PASS: exact verified token, safe signed URL, missing setup/conflict/offline/foreign owner, aborted account scope and ambiguous photo attach recovery');})().catch(e=>{console.error(e);process.exitCode=1});
