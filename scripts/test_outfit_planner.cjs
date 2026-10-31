const assert = require('node:assert/strict');
const { emptyBrief, updateBrief, nextQuestion, planOutfits } = require('/tmp/static-threads-planner-tests/outfit-planner.js');
const catalog = require('../data/catalog.json');
const items = catalog.items.map(item => ({ ...item, colour: item.primaryColour }));
const brief = updateBrief(emptyBrief(), 'Plan my outfit for dinner, smart casual, indoors, no black, prefer blue', items);
assert.equal(brief.event, 'dinner'); assert.equal(brief.dressCode, 'smart-casual'); assert.equal(brief.setting, 'indoors');
assert.equal(nextQuestion(brief), null);
const result = planOutfits(items, brief);
assert.ok(result.outfits.length > 0);
const available = new Set(items.filter(item => item.status === 'available').map(item => item.id));
for (const outfit of result.outfits) {
  assert.ok(outfit.items.every(item => available.has(item.id)));
  assert.ok(outfit.items.every(item => ![item.name, item.colour, ...(item.secondaryColours || [])].join(' ').toLowerCase().includes('black')));
  assert.ok(outfit.items.some(item => item.category === 'shoes'));
}
const altered = items.map(item => result.outfits[0].items.some(selected => selected.id === item.id) ? { ...item, status: 'laundry' } : item);
for (const outfit of planOutfits(altered, brief).outfits) assert.ok(outfit.items.every(item => !result.outfits[0].items.some(old => old.id === item.id)));
const formal = updateBrief(emptyBrief(), 'Wedding formal indoors', items);
assert.equal(planOutfits(items, formal).outfits.length, 0, 'Casual demo must not impersonate formal clothing');
assert.ok(planOutfits(items, formal).missing.includes('suitable footwear'));
assert.ok(nextQuestion(updateBrief(emptyBrief(), 'wedding', items)).text.includes('dress code'));
const outdoor = updateBrief(emptyBrief(), 'Travel casual outdoors', items);
assert.ok(nextQuestion(outdoor).text.includes('weather'));
const cold = updateBrief(outdoor, 'cold, no shorts', items);
assert.equal(cold.event, 'travel'); assert.equal(cold.dressCode, 'casual');
for (const outfit of planOutfits(items, cold).outfits) {
  assert.ok(outfit.items.some(item => item.category === 'jackets'));
  assert.ok(outfit.items.every(item => item.category !== 'shorts'));
}
const alternatives = planOutfits(items, brief, result.outfits.map(outfit => outfit.id));
assert.ok(alternatives.outfits.every(outfit => !result.outfits.some(old => old.id === outfit.id)));
const anchorBrief = updateBrief(brief, 'build around Grey Linen Shirt', items);
for (const outfit of planOutfits(items, anchorBrief).outfits) assert.ok(outfit.items.some(item => item.id === 'grey-linen-shirt'));
const reset = updateBrief(anchorBrief, 'clear preferences', items);
assert.equal(reset.anchorId, null); assert.deepEqual(reset.excluded, []);
const fixture = (id, category, name = id) => ({ id, name, category, subcategory: '', colour: 'Green', secondaryColours: [], material: 'Unknown', occasions: ['casual', 'formal', 'black-tie'], status: 'available' });
// One-piece and coordinated clothing must not require a western top/bottom split.
for (const category of ['dresses', 'jumpsuits', 'sets']) {
  const wardrobe = [fixture('piece', category, 'User-named garment'), fixture('shoe', 'footwear')];
  const planned = planOutfits(wardrobe, { ...formal, dressCode: 'black-tie' });
  assert.equal(planned.outfits.length, 1);
  assert.deepEqual(planned.outfits[0].items.map(item => item.id).sort(), ['piece', 'shoe']);
}
const mixed = [fixture('kurta', 'tops', 'Kurta'), fixture('bottom', 'bottoms'), fixture('shoes', 'shoes')];
assert.equal(planOutfits(mixed, { ...formal, dressCode: 'casual' }).outfits.length, 1);
assert.equal(planOutfits([], brief).outfits.length, 0);
assert.equal(planOutfits(items.map(item => ({ ...item, status: 'stored' })), brief).outfits.length, 0);
const unknownEvent = updateBrief(emptyBrief(), 'Plan my outfit for a poetry reading', items);
assert.equal(unknownEvent.event, 'a poetry reading');
assert.ok(planOutfits(items, updateBrief(cold, 'rainy', items)).outfits.every(outfit => outfit.cautions.some(caution => caution.includes('Water resistance'))));
console.log('PASS: grounded IDs, unavailable items, hard exclusions, multi-turn brief, formal gaps, weather, alternatives, named anchor, one-piece/sets and custom events.');
