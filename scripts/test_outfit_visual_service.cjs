const assert = require('node:assert/strict');
const { png } = require('./outfit_visual_test_fixture.cjs');
const { handleVisualRequest } = require('/tmp/static-threads-visual-service/core.js');
const uid = '00000000-0000-4000-8000-000000000001';
const config = { supabaseUrl: 'https://auth-test.example', anonKey: 'anon-test', serviceKey: 'server-test', providerKey: 'provider-test', searchModel: 'search-test', imageModel: 'image-test', signingSecret: 'test-only-secret-with-at-least-32-characters', allowedOrigins: ['https://utpal-mishra.github.io'] };
const brief = { event: 'dinner', dressCode: 'smart-casual', setting: 'indoors', weather: null, excluded: [], preferredColour: null, comfort: true, covered: false };
const make = body => new Request('https://auth-test.example/functions/v1/outfit-visuals', { method: 'POST', headers: { Origin: config.allowedOrigins[0], Authorization: 'Bearer user-test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let allowQuota=true, authenticated=true, wrongOwner=false, truncate=false, forgedSources=false, paidCalls=0;
const candidates=Array.from({length:5},(_,i)=>({title:`Outfit ${i+1}`,description:'An outfit described by the search source.',pieces:['Blue shirt','Grey trousers','White shoes'],sourceUrls:[`https://fashion.example/look-${i}`]}));
const fakeFetch=async(url, options={})=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:wrongOwner?'00000000-0000-4000-8000-000000000002':uid},{status:authenticated?200:401});
  if(url.includes('/rpc/')) { assert.equal(options.headers.apikey,config.serviceKey);return Response.json(allowQuota); }
  paidCalls++;
  const body=JSON.parse(options.body);
  if(url.endsWith('/responses')) {
    assert.equal(body.store,false);assert.equal(body.tools[0].type,'web_search');
    assert.ok(!body.input.includes('user-test-token'));
    return Response.json({output:[{type:'web_search_call',action:{sources:forgedSources?[]:candidates.map(item=>({url:item.sourceUrls[0]}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify({outfits:candidates})}]}]});
  }
  assert.ok(url.endsWith('/images/generations'));assert.equal(body.n,1);assert.equal(body.size,'1536x1024');assert.ok(body.prompt.includes('EXACTLY FIVE'));
  return Response.json({data:[{b64_json:truncate?Buffer.from('truncated').toString('base64'):png()}]});
};
(async()=>{
  let response=await handleVisualRequest(make({action:'search',consent:true,brief,pieces:['Blue shirt']}),config,fakeFetch,1000000);
  assert.equal(response.status,200);const result=await response.json();assert.equal(result.outfits.length,5);
  const ticket=result.outfits[0].ticket;
  response=await handleVisualRequest(make({action:'render',ticket}),config,fakeFetch,1000001);
  assert.equal(response.status,200);const {board}=await response.json();assert.equal(board.frames.length,5);assert.equal(board.width,1536);assert.ok(board.asset.startsWith('data:image/png;base64,'));
  let before=paidCalls;
  for(const token of [ticket+'x','invalid',ticket.split('.')[0]+'.invalid']){assert.equal((await handleVisualRequest(make({action:'render',ticket:token}),config,fakeFetch,1000001)).status,400)}
  wrongOwner=true;assert.equal((await handleVisualRequest(make({action:'render',ticket}),config,fakeFetch,1000001)).status,400);wrongOwner=false;
  assert.equal((await handleVisualRequest(make({action:'render',ticket}),config,fakeFetch,2000000)).status,400);assert.equal(paidCalls,before);
  authenticated=false;assert.equal((await handleVisualRequest(make({action:'search',consent:true,brief,pieces:['shirt']}),config,fakeFetch)).status,401);authenticated=true;
  assert.equal((await handleVisualRequest(make({action:'search',consent:false,brief,pieces:['shirt']}),config,fakeFetch)).status,400);
  assert.equal((await handleVisualRequest(make({action:'search',consent:true,brief:{...brief,event:'x'.repeat(200)},pieces:['shirt']}),config,fakeFetch)).status,400);
  allowQuota=false;assert.equal((await handleVisualRequest(make({action:'render',ticket}),config,fakeFetch,1000001)).status,429);assert.equal(paidCalls,before);allowQuota=true;
  truncate=true;assert.equal((await handleVisualRequest(make({action:'render',ticket}),config,fakeFetch,1000001)).status,502);truncate=false;
  forgedSources=true;response=await handleVisualRequest(make({action:'search',consent:true,brief,pieces:['shirt']}),config,fakeFetch);assert.equal((await response.json()).outfits.length,0);forgedSources=false;
  response=await handleVisualRequest(make({action:'search',consent:true,brief:{...brief,excluded:['blue']},pieces:['shirt']}),config,fakeFetch);assert.equal((await response.json()).outfits.length,0);
  assert.equal((await handleVisualRequest(make({action:'search'}),{...config,providerKey:''},fakeFetch)).status,503);
  const badOrigin=new Request(make({action:'search'}),{headers:{Origin:'https://attacker.example'}});assert.equal((await handleVisualRequest(badOrigin,config,fakeFetch)).status,403);
  console.log('PASS: source-grounded top-five search, signed owner/expiry tickets, image board validation, quotas before paid calls, auth/consent/origin/configuration and invalid responses.');
})().catch(error=>{console.error(error);process.exitCode=1});
