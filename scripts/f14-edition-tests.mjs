import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('js/edition.js','utf8'),c);const E=c.Edition;
const eu={artista:'Van Halen',titulo:'1984',pais:'Europe',formato:'Vinilo',numeroCatalogo:'923 985-1',discogsReleaseId:'10',discogsMasterId:'20'};
const jp={...eu,pais:'Japan',discogsReleaseId:'11'};
assert.equal(E.resolve(eu,[jp,eu]).candidate.discogsReleaseId,'10');assert.equal(E.resolve(eu,[jp]).status,'conflict');
assert.equal(E.compare(eu,{...eu,id:'second-copy'}).relation,'exact_release');assert.equal(E.compare(eu,jp).relation,'different_edition');
assert.equal(E.resolve({codigoBarras:'123'},[{...eu,codigoBarras:'123'},{...jp,codigoBarras:'123'}]).status,'ambiguous');
assert.equal(E.resolve(eu,[{...eu,numeroCatalogo:'other'}]).status,'conflict');
assert.equal(E.resolve(eu,[]).status,'none');assert.equal(E.release({discogs:'https://www.discogs.com/es/release/123-test'}),'123');
assert.equal(E.resolve({artista:'Talking Heads',titulo:'Remain in Light'},[{artista:'Talking Heads',titulo:'Remain in Light',discogsReleaseId:'9'}]).status,'ambiguous');
assert.equal(E.compare({...eu,discogsArtistId:'1'},{...eu,discogsArtistId:'2'}).conflicts.includes('artistId'),true);
const before=JSON.stringify([eu,jp]);const ix=E.indexes([eu,jp,{...eu,id:'copy'}]);assert.equal(ix.release.get('10').length,2);assert.equal(ix.master.get('20').length,3);assert.equal(JSON.stringify([eu,jp]),before);
console.log('W1: exact Release, Master, copies, shared barcode, conflicting catalog, JP/EU and homonyms OK');

assert.equal(E.status({...eu,editionStatus:'verified',tracklist:[]}).identity,'verified');assert.equal(E.status({...eu,editionStatus:'verified',tracklist:[]}).incomplete,true);assert.equal(E.duplicates([{...eu,id:'a'},{...eu,id:'b'}]).a,'Mismo Release · varios ejemplares');

assert.equal(E.fromDiscogs({id:1,title:'Album',artists:[{id:5,name:'Band'}]}).discogsArtistId,'5');
