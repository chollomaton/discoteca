/* F14: pure identity engine. No IO, UI, mutation or implicit selection. */
var Edition = (function(){
  function text(v){ return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
  function code(v){ return text(v).replace(/[^a-z0-9]/g,''); }
  function id(v){ return /^[1-9]\d*$/.test(String(v || '')) ? String(v) : ''; }
  function release(d){ var m=String(d.discogs || d.uri || '').match(/discogs\.com\/(?:[a-z]{2}\/)?release\/(\d+)/i); return id(d.discogsReleaseId) || (m ? id(m[1]) : ''); }
  function master(d){ return id(d.discogsMasterId || d.master_id); }
  function country(v){ var t=text(v); return ({japan:'jp',japon:'jp',europe:'eu',europa:'eu',usa:'us','united states':'us',spain:'es',espana:'es','united kingdom':'uk',gb:'uk'})[t] || t; }
  function format(v){ var t=text(v); return /\bcd\b/.test(t) ? 'cd' : /vinyl|vinilo|\blp\b/.test(t) ? 'vinyl' : t; }
  function normalize(d){ return {release:release(d),master:master(d),artist:text(d.artista),artistId:String(d.discogsArtistId || d.artistMbid || ''),title:text(d.titulo),catalog:code(d.numeroCatalogo),barcode:code(d.codigoBarras),country:country(d.pais),format:format(d.formato),year:String(d.anioEdicion || '')}; }
  function compare(a,b){
    var x=normalize(a),y=normalize(b),conflicts=[],evidence=[],score=0;
    ['artistId','catalog','country','format','year'].forEach(function(k){ if(x[k] && y[k] && x[k]!==y[k]) conflicts.push(k); });
    if(x.release && y.release && x.release===y.release){ evidence.push('release');score=100; }
    if(x.master && y.master && x.master===y.master){ evidence.push('master');score+=20; }
    if(x.artist && y.artist && x.artist===y.artist){ evidence.push('artist');score+=10; }
    if(x.title && y.title && x.title===y.title){ evidence.push('title');score+=10; }
    ['catalog','barcode','country','format','year'].forEach(function(k){if(x[k] && x[k]===y[k]){evidence.push(k);score+=k==='catalog'?30:k==='barcode'?15:5;}});
    var sameWork=evidence.indexOf('master')>=0 || (!x.master || !y.master) && evidence.indexOf('artist')>=0 && evidence.indexOf('title')>=0 && conflicts.indexOf('artistId')<0;
    var relation=evidence.indexOf('release')>=0 ? 'exact_release' : sameWork ? (x.release && y.release && x.release!==y.release ? 'different_edition' : 'same_work') : 'uncertain';
    return {relation:relation,score:score,conflicts:conflicts,evidence:evidence,sameWork:!!sameWork,exact:evidence.indexOf('release')>=0};
  }
  function resolve(query,candidates){
    var seen=new Set(),ranked=[];
    (candidates || []).forEach(function(candidate){ var r=release(candidate);if(r && seen.has(r))return;if(r)seen.add(r);ranked.push({candidate:candidate,comparison:compare(query,candidate)}); });
    ranked.sort(function(a,b){return b.comparison.score-a.comparison.score;});
    if(!ranked.length)return {status:'none',candidates:[]};
    var viable=ranked.filter(function(r){return !r.comparison.conflicts.length && (!release(query) || release(query)===release(r.candidate));});
    if(!viable.length)return {status:'conflict',candidates:ranked};
    var best=viable[0],c=best.comparison;
    var physical=c.exact || c.evidence.indexOf('catalog')>=0 && c.evidence.indexOf('country')>=0 && c.evidence.indexOf('format')>=0 && c.sameWork;
    if(physical && (viable.length===1 || c.score-viable[1].comparison.score>=20))return {status:'clear',candidate:best.candidate,candidates:ranked};
    return {status:'ambiguous',candidates:ranked};
  }
  function indexes(discs){
    var out={release:new Map(),master:new Map(),barcode:new Map(),work:new Map()};
    (discs || []).forEach(function(d){var n=normalize(d);Object.keys(out).forEach(function(k){var v=k==='work'?n.artist+'\u0000'+n.title:n[k];if(!v || v==='\u0000')return;var list=out[k].get(v)||[];list.push(d);out[k].set(v,list);});});return out;
  }
  function fromDiscogs(r){
    var split=String(r.title||'').split(' - '),fmt=(r.formats||[])[0]||{},lab=(r.labels||[])[0]||{};
    return {discogsReleaseId:id(r.id),discogsMasterId:id(r.master_id),discogs:r.uri||'https://www.discogs.com/release/'+r.id,
      artista:r.artists ? r.artists.map(function(a){return a.name.replace(/ \(\d+\)$/,'');}).join(', ') : split.length>1?split.shift():'',
      titulo:r.artists?r.title:split.join(' - '),numeroCatalogo:r.catno||lab.catno||'',pais:r.country||'',
      formato:fmt.name || (r.format||[]).join(' '),codigoBarras:(r.barcode||[])[0]||((r.identifiers||[]).filter(function(i){return i.type==='Barcode';})[0]||{}).value||'',anioEdicion:r.year||''};
  }
  function status(d){
    return {incomplete:!d.portada || !Array.isArray(d.tracklist) || !d.tracklist.length || !d.genero || !d['año'] || !d.sello,
      identity:d.editionStatus === 'review' || d.confianza === 'baja' ? 'review' : release(d) ? (d.editionStatus === 'verified' ? 'verified' : 'review') : 'unidentified'};
  }
  function duplicates(discs){
    var ix=indexes(discs),out={};
    ix.work.forEach(function(group){if(group.length>1)group.forEach(function(d){out[d.id]='Misma obra';});});
    ix.master.forEach(function(group){if(group.length>1)group.forEach(function(d){out[d.id]='Otra edición';});});
    ix.release.forEach(function(group){if(group.length>1)group.forEach(function(d){out[d.id]='Mismo Release · varios ejemplares';});});
    (discs||[]).forEach(function(d){if(d.ejemplares>1)out[d.id]='Varios ejemplares';});return out;
  }
  function shop(candidate,discs,complete){
    var matches=(discs||[]).map(function(d){return {disc:d,c:compare(candidate,d)};});
    var owned=matches.filter(function(x){return x.disc.lista!=='deseos';});
    var exact=owned.filter(function(x){return x.c.exact && !x.c.conflicts.length;});
    if(exact.length)return {state:'exact_release',discs:exact.map(function(x){return x.disc;})};
    var work=owned.filter(function(x){return x.c.sameWork;});
    if(work.length)return {state:work.some(function(x){return x.c.relation==='different_edition';})?'different_edition':'same_work',discs:work.map(function(x){return x.disc;})};
    var wish=matches.filter(function(x){return x.disc.lista==='deseos' && (x.disc.wishScope==='release'?x.c.exact:x.c.sameWork);});
    if(wish.length)return {state:'wishlist',discs:wish.map(function(x){return x.disc;})};
    return {state:complete && release(candidate)?'different':'uncertain',discs:[]};
  }
  return {shop:shop,status:status,duplicates:duplicates,text:text,code:code,release:release,master:master,normalize:normalize,compare:compare,resolve:resolve,indexes:indexes,fromDiscogs:fromDiscogs};
})();
