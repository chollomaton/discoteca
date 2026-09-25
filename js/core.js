/* ============================================================
   1. ESTADO
   ============================================================ */
var IDB_NAME = 'discoteca', IDB_STORE = 'kv', K_DATOS = 'datos', K_CFG = 'config';
var LS_KEY = 'discoteca.local.v4';
var LS_CFG = 'discoteca.cfg.v1';
var DB = { version: 4, actualizado: '', discos: [], borrados: [] };
var CFG = { owner: '', repo: '', branch: 'main', path: 'datos.json', token: '', recordarClaves: false, discogs: '', anthropic: '', lastfm: '', ticketmaster: '', audd: '', subirADiscogs: false, auto: true };
var configuracionEnCurso = false;
var SHA = '';                 // sha del datos.json remoto que tenemos
var syncState = 'local';      // local | ok | pend | busy | err | off
var syncMsg = '', lastSync = '', readOnly = false;
var VERSION = '2026.09.25-phase7';
var firmas = {};              // id -> firma, para detectar qué cambió
var firmasCampos = {};        // id -> firmas por campo, para sincronización granular
var view = 'col';
var fType = 'all', fGen = '', fArt = '', fTag = '', fDec = '', fPais = '', fSello = '';
var sortBy = 'artist', grupo = 'none', modo = 'grid';
var bulk = null, randomSeed = 1;

var GENEROS = [
  'Pop Internacional','Pop Nacional','Rock Internacional','Rock Nacional','BSO',
  'Indie / Alternativo','Heavy / Metal','Punk / Hardcore','Grunge',
  'Hip Hop / Rap','R&B / Soul','Funk / Disco','Electrónica / Dance',
  'Jazz','Blues','Reggae / Ska','Folk / Cantautor','Country','Clásica',
  'Flamenco','Latina','New Wave / Synth Pop','Recopilatorios / Varios','Otros'
];
var PAL = ['#0071e3','#af52de','#ff9500','#34c759','#ff2d55','#5856d6','#30b0c7','#ffcc00','#ff3b30','#00c7be','#8e8e93','#a2845e'];
var PAISES = {
  ES:['España',40.4,-3.7],US:['Estados Unidos',39.8,-98.6],GB:['Reino Unido',54,-2],UK:['Reino Unido',54,-2],
  DE:['Alemania',51.2,10.5],FR:['Francia',46.6,2.4],IT:['Italia',42.8,12.6],NL:['Países Bajos',52.2,5.3],
  CA:['Canadá',56.1,-106.3],AU:['Australia',-25.3,133.8],JP:['Japón',36.2,138.3],BR:['Brasil',-14.2,-51.9],
  AR:['Argentina',-38.4,-63.6],MX:['México',23.6,-102.6],ZA:['Sudáfrica',-30.6,22.9],SE:['Suecia',60.1,18.6],
  NO:['Noruega',60.5,8.5],DK:['Dinamarca',56.3,9.5],FI:['Finlandia',61.9,25.7],IE:['Irlanda',53.4,-8.2],
  PT:['Portugal',39.4,-8.2],BE:['Bélgica',50.5,4.5],CH:['Suiza',46.8,8.2],AT:['Austria',47.5,14.6],
  GR:['Grecia',39.1,21.8],PL:['Polonia',51.9,19.1],RU:['Rusia',61.5,105.3],CU:['Cuba',21.5,-77.8],
  CL:['Chile',-35.7,-71.5],CO:['Colombia',4.6,-74.3],NZ:['Nueva Zelanda',-40.9,174.9],IN:['India',20.6,79],
  KR:['Corea del Sur',35.9,127.8],CN:['China',35.9,104.2],IL:['Israel',31,34.9],TR:['Turquía',38.9,35.2],
  JM:['Jamaica',18.1,-77.3],XW:['Mundial',0,0],XE:['Europa',54,15]
};
function bandera(cc){
  if(!cc || cc.length !== 2 || cc === 'XW' || cc === 'XE') return '';
  return String.fromCodePoint(0x1F1E6 + cc.toUpperCase().charCodeAt(0) - 65, 0x1F1E6 + cc.toUpperCase().charCodeAt(1) - 65);
}
function nombrePais(cc){ return (PAISES[cc] && PAISES[cc][0]) || cc || ''; }

var I = {
  disc:'<svg class="ic ph" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="2.8"/></svg>',
  cd:'<svg class="ic ph" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><path d="M12 2.8a9.2 9.2 0 0 1 8 4.6"/></svg>',
  vinyl:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="2.8"/></svg>',
  cdSm:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
  spark:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 2.6l1.9 5.1 5.1 1.9-5.1 1.9L12 16.6l-1.9-5.1L5 9.6l5.1-1.9z"/><path d="M18.6 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
  pencil:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  check:'<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  x:'<svg class="ic" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  trash:'<svg class="ic" viewBox="0 0 24 24"><polyline points="3 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  minus:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  plus:'<svg class="ic" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  warn:'<svg class="ic" viewBox="0 0 24 24"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  up:'<svg class="ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  down:'<svg class="ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  layers:'<svg class="ic" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  copy:'<svg class="ic" viewBox="0 0 24 24"><rect x="9" y="9" width="12.5" height="12.5" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  music:'<svg class="ic" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  user:'<svg class="ic" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cloud:'<svg class="ic" viewBox="0 0 24 24"><path d="M18 18.5H6.5A4.5 4.5 0 0 1 5.6 9.6a6 6 0 0 1 11.6-1.5A4.2 4.2 0 0 1 18 18.5z"/></svg>',
  cloudUp:'<svg class="ic" viewBox="0 0 24 24"><path d="M18 17.5H6.5A4.5 4.5 0 0 1 5.6 8.6a6 6 0 0 1 11.6-1.5A4.2 4.2 0 0 1 18 17.5z"/><polyline points="9.5 13 12 10.5 14.5 13"/><line x1="12" y1="10.5" x2="12" y2="17"/></svg>',
  img:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.6"/><polyline points="21 15 16 10 5 21"/></svg>',
  db:'<svg class="ic" viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="8" ry="3.2"/><path d="M4 5.5v13c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-13"/><path d="M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2"/></svg>',
  euro:'<svg class="ic" viewBox="0 0 24 24"><path d="M17 5.5A7 7 0 1 0 17 18.5"/><line x1="3" y1="10" x2="12" y2="10"/><line x1="3" y1="14" x2="12" y2="14"/></svg>',
  cal:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="11" x2="21" y2="11"/></svg>',
  heart:'<svg class="ic" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  play:'<svg class="ic" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  pause:'<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  link:'<svg class="ic" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
  hand:'<svg class="ic" viewBox="0 0 24 24"><path d="M18 11V6.5a1.5 1.5 0 0 0-3 0V11"/><path d="M15 10V4.5a1.5 1.5 0 0 0-3 0V10"/><path d="M12 10V5.5a1.5 1.5 0 0 0-3 0V13"/><path d="M9 12.5V9a1.5 1.5 0 0 0-3 0v7a6 6 0 0 0 6 6h1.5a6 6 0 0 0 6-6v-3"/></svg>',
  tag:'<svg class="ic" viewBox="0 0 24 24"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
  globe:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>',
  print:'<svg class="ic" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>',
  search:'<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7.5"/><line x1="21" y1="21" x2="16.8" y2="16.8"/></svg>',
  scan:'<svg class="ic" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="14" y1="8" x2="14" y2="16"/><line x1="17.5" y1="8" x2="17.5" y2="16"/></svg>',
  gap:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6"/></svg>',
  clock:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6.5 12 12 15.5 14"/></svg>',
  file:'<svg class="ic" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  key:'<svg class="ic" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L20 3l1.5 1.5L20 6l1.5 1.5L19 10l-1.5-1.5"/></svg>',
  refresh:'<svg class="ic" viewBox="0 0 24 24"><polyline points="21 4 21 10 15 10"/><polyline points="3 20 3 14 9 14"/><path d="M19.4 9a8 8 0 0 0-13.1-3L3 9m18 6l-3.3 3A8 8 0 0 1 4.6 15"/></svg>',
  vinilo:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
  cdIc:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3a9 9 0 0 1 7.8 4.5" opacity=".55"/></svg>',
  playF:'<svg class="ic" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 4.5v15l12-7.5z"/></svg>',
  oreja:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 8.5a6 6 0 1 1 12 0c0 3-2 4-2.6 5.6-.5 1.3-.3 2.4-1.2 3.4-.8.9-2 1.2-3 .8"/><path d="M9.5 9a2.6 2.6 0 1 1 5 .5"/></svg>',
  vinBadge:'<svg class="ic" viewBox="0 0 32 32">'
    + '<circle cx="16" cy="16" r="15.2" fill="url(#gVin)"/>'
    + '<g fill="none" stroke="#ffffff" stroke-opacity=".14" stroke-width=".7">'
    + '<circle cx="16" cy="16" r="12.6"/><circle cx="16" cy="16" r="11.2"/><circle cx="16" cy="16" r="9.8"/>'
    + '<circle cx="16" cy="16" r="8.4"/><circle cx="16" cy="16" r="7"/></g>'
    + '<path d="M5.6 6.4A14.6 14.6 0 0 1 16 .9" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    + '<circle cx="16" cy="16" r="5.6" fill="url(#gVinLab)"/>'
    + '<circle cx="16" cy="16" r="5.6" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".6"/>'
    + '<circle cx="16" cy="16" r="1.15" fill="#141418"/></svg>',
  cdBadge:'<svg class="ic" viewBox="0 0 32 32">'
    + '<circle cx="16" cy="16" r="15.2" fill="url(#gCd)"/>'
    + '<circle cx="16" cy="16" r="15.2" fill="none" stroke="#93a2b3" stroke-width=".8"/>'
    + '<circle cx="16" cy="16" r="11.6" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width=".7"/>'
    + '<path d="M6.9 7.3A13 13 0 0 1 16 3.4" stroke="#fff" stroke-opacity=".85" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '<circle cx="16" cy="16" r="6.4" fill="#f4f7fa"/>'
    + '<circle cx="16" cy="16" r="6.4" fill="none" stroke="#a8b5c4" stroke-width=".7"/>'
    + '<circle cx="16" cy="16" r="3.1" fill="url(#gCdHole)" stroke="#a8b5c4" stroke-width=".7"/></svg>',
  corazon:'<svg class="ic" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  girar:'<svg class="ic" viewBox="0 0 24 24"><path d="M2.5 12a9.5 9.5 0 0 1 16.2-6.7L21 7.6"/><polyline points="21 3 21 8 16 8"/><path d="M21.5 12a9.5 9.5 0 0 1-16.2 6.7L3 16.4"/><polyline points="3 21 3 16 8 16"/></svg>',
  lupa:'<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8.5" x2="11" y2="13.5"/><line x1="8.5" y1="11" x2="13.5" y2="11"/></svg>',
  apple:'<svg class="ic" viewBox="0 0 24 24"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.5-3.6z"/><path d="M14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z"/></svg>',
  personas:'<svg class="ic" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  vinResumen:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3a9 9 0 0 1 6.4 2.6" stroke-opacity=".45"/></svg>',
  estanteria:'<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="6.5" width="4" height="14" rx="1"/><rect x="8" y="4.5" width="4" height="16" rx="1"/><rect x="13.2" y="7.5" width="4" height="13" rx="1"/><path d="M18.6 8.6l2.6.7-3.3 11.4-2.6-.7z"/></svg>',
  aguja:'<svg class="ic" viewBox="0 0 24 24"><circle cx="10.5" cy="13.5" r="7.5"/><circle cx="10.5" cy="13.5" r="2"/><path d="M19.5 4.2l-1.6 6.4-2.4 3.4"/><circle cx="19.9" cy="3.4" r="1.4"/></svg>',
  globoSurcos:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3.3 9.3h17.4M3.3 14.7h17.4"/><circle cx="12" cy="12" r="1.6"/></svg>',
  hojaDisco:'<svg class="ic" viewBox="0 0 24 24"><path d="M6 3.5h8.5L19 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4.5"/><circle cx="11.5" cy="15" r="3.2"/><circle cx="11.5" cy="15" r=".9"/></svg>',
  calDisco:'<svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2.2"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/><circle cx="12" cy="15.2" r="2.8"/><circle cx="12" cy="15.2" r=".8"/></svg>',
  paleta:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="8.4" cy="9.6" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.6" cy="8.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="14.4" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="15.6" r="1.5" fill="currentColor" stroke="none"/></svg>',
  lampara:'<svg class="ic" viewBox="0 0 24 24"><path d="M5.6 17.4c0-2.5 2.3-4.5 5.1-4.5s5.1 2 5.1 4.5c0 .7-.2 1.4-.5 2H6.1c-.3-.6-.5-1.3-.5-2z"/><path d="M9 12.9c0-.7.8-1.2 1.7-1.2s1.7.5 1.7 1.2"/><circle cx="10.7" cy="10.7" r=".9"/><path d="M15.5 14.4c1.5-.2 3-1.1 4.1-2.4.5-.6 1.4-.5 1.6.3.2.9-.2 1.9-1 2.7-1.2 1.2-2.9 1.9-4.4 1.9"/><path d="M5.7 15.6c-1.3.2-2.3-.5-2.3-1.6 0-1 .8-1.7 1.9-1.7.5 0 1 .2 1.3.5"/><path d="M4.6 19.4h12.6" stroke-width="1.7"/><path d="M13.2 8.9c1.5-.7 2-1.9 1.4-3-.6-1.2 0-2.2 1.4-2.5" stroke-opacity=".55"/><path d="M16.8 8c1.3-.4 1.8-1.2 1.5-2.2" stroke-opacity=".4"/></svg>',
  save:'<svg class="ic" viewBox="0 0 24 24"><path d="M19.5 21h-15a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 4.5 3h11L21 8.5v11a1.5 1.5 0 0 1-1.5 1.5z"/><path d="M7.5 3v6h8V3"/><rect x="7.5" y="13" width="9" height="8" rx="1"/></svg>',
  pregunta:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2"/><path d="M9.3 9.3a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.3-2.7 4"/><line x1="12" y1="17.4" x2="12.01" y2="17.4"/></svg>',
  bombilla:'<svg class="ic" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 2a6.5 6.5 0 0 0-3.7 11.9c.6.4 1 1.1 1.1 1.8l.1.8h5l.1-.8c.1-.7.5-1.4 1.1-1.8A6.5 6.5 0 0 0 12 2z"/></svg>',
  estrella:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>',
  letra:'<svg class="ic" viewBox="0 0 24 24"><path d="M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5v-14a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/>'
    + '<line x1="7.5" y1="8.5" x2="16.5" y2="8.5"/><line x1="7.5" y1="12" x2="13.5" y2="12"/></svg>',
  aleatorio:'<svg class="ic" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>'
    + '<polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
  reloj2:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6.5 12 12 16 14"/></svg>',
  compartir:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 15V3"/><polyline points="8 6.5 12 2.5 16 6.5"/>'
    + '<path d="M20 14v5.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14"/></svg>',
  pin:'<svg class="ic" viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  libro:'<svg class="ic" viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></svg>',
  carrito:'<svg class="ic" viewBox="0 0 24 24"><circle cx="9.5" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/></svg>',
  info:'<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.6" x2="12.01" y2="7.6"/></svg>',
  eye:'<svg class="ic" viewBox="0 0 24 24"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>'
};
var CHEV = '<svg class="ic cv" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

/* ============================================================
   2. UTILIDADES
   ============================================================ */
function esc(s){ return (s == null ? '' : String(s)).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* Un color mal formado -por ejemplo, si viniera de una copia editada a
   mano- no debe poder colarse dentro de un atributo style, aunque esc()
   ya evite que rompa el propio atributo. Solo se acepta "R,G,B" con cada
   canal entre 0 y 255. */
function colorSeguro(c){
  var m = String(c || '').match(/^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/);
  if(!m) return '';
  var r = +m[1], g = +m[2], b = +m[3];
  if(r > 255 || g > 255 || b > 255) return '';
  return r + ',' + g + ',' + b;
}
/* Una URL externa que se va a usar como href/src debe empezar por http(s);
   cualquier otra cosa -un "javascript:", por ejemplo- se descarta */
function urlSegura(u){
  return /^https?:\/\//i.test(String(u || '').trim()) ? u : '';
}
function uid(){ return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nowISO(){ return new Date().toISOString(); }
function fdate(iso){
  if(!iso) return '—';
  try{ return new Date(iso).toLocaleString('es-ES', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}); }
  catch(e){ return iso; }
}
function fhora(iso){ try{ return new Date(iso).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}); }catch(e){ return ''; } }
function key(d){ return (d.artista || '').trim().toLowerCase() + '|' + (d.titulo || '').trim().toLowerCase() + '|' + (d.formato || ''); }
function plain(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function bytes(n){
  if(n < 1024) return n + ' B';
  if(n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}
function limpiaNombre(s){ return String(s || '').replace(/\s*\((\d{1,2})\)/g, '').replace(/\s{2,}/g, ' ').trim(); }
function limpiaSello(s){
  var raw = limpiaNombre(s).split(/\s*,\s*/), partes = [];
  raw.forEach(function(x){
    x = x.trim();
    if(!x) return;
    if(/^(inc|ltd|limited|llc|s\.?a|s\.?l|s\.?r\.?l|gmbh|b\.?v|co|corp|plc|ab|a\/s|oy|nv)\.?$/i.test(x) && partes.length){
      partes[partes.length - 1] += ', ' + x;
    }else partes.push(x);
  });
  var vistos = [], out = [];
  partes.forEach(function(x){
    var k = x.toLowerCase().replace(/\b(records|recordings|record|inc|ltd|limited|s\.?a|s\.?l|gmbh|music|the)\b/g, '').replace(/[^a-z0-9]/g, '');
    if(k && vistos.indexOf(k) >= 0) return;
    vistos.push(k); out.push(x);
  });
  return out.slice(0, 2).join(' / ');
}
function normTracks(tl){
  if(!Array.isArray(tl)) return [];
  return tl.map(function(t){
    if(typeof t === 'string') return {titulo:t, duracion:'', preview:''};
    var o = {titulo:(t.titulo || t.title || ''), duracion:(t.duracion || t.duration || ''), preview:(t.preview || t.previewUrl || '')};
    if(t.pos) o.pos = t.pos;
    if(t.disco) o.disco = t.disco;
    if(t.fav) o.fav = 1;
    return o;
  }).filter(function(t){ return t.titulo; });
}
function normDisc(d){
  d = d || {};
  var y = String(d['año'] || d.anio || d.year || '').trim();
  if(!/^\d{4}$/.test(y)) y = (y.match(/\d{4}/) || [''])[0];
  var fmt = (d.formato === 'CD' || d.formato === 'Vinilo') ? d.formato
    : (String(d.formato || '').toLowerCase().indexOf('cd') >= 0 ? 'CD' : 'Vinilo');
  return {
    id: d.id || uid(),
    lista: d.lista === 'deseos' ? 'deseos' : 'coleccion',
    artista: limpiaNombre(d.artista || d.artist || ''),
    titulo: d.titulo || d.title || '',
    'año': y,
    formato: fmt,
    formatoDetalle: d.formatoDetalle || (d.formato && d.formato !== 'CD' && d.formato !== 'Vinilo' ? d.formato : ''),
    genero: d.genero || d.genre || '',
    sello: limpiaSello(d.sello || d.label || ''),
    numeroCatalogo: d.numeroCatalogo || d.catalogNumber || '',
    pais: d.pais || d.country || '',
    estado: d.estado || d.condition || '',
    estadoFunda: d.estadoFunda || '',
    fechaCompra: d.fechaCompra || '',
    precioCompra: Number(d.precioCompra) || 0,
    valorMercado: Number(d.valorMercado) || 0,
    portada: d.portada || d.coverUrl || '',
    color: d.color || '',
    tracklist: normTracks(d.tracklist),
    notas: d.notas || d.notes || '',
    etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas.filter(Boolean) : [],
    mbid: d.mbid || '', rgid: d.rgid || '', discogs: d.discogs || '',
    codigoBarras: d.codigoBarras || '',
    confianza: d.confianza || '',
    valoracion: Number(d.valoracion) || 0,
    ubicacion: d.ubicacion || '',
    ejemplares: Number(d.ejemplares) || 1,
    revisado: d.revisado || '',
    faltan: d.faltan || '',
    sinFoto: d.sinFoto ? 1 : 0,
    fotoDisco: d.fotoDisco || '',
    /* de qué MusicBrainz Release viene fotoDisco, para avisar si luego se
       cambia de edición y la foto del soporte queda desactualizada */
    fotoDiscoMbid: d.fotoDiscoMbid || '',
    editado: (d.editado && typeof d.editado === 'object') ? d.editado : {},
    enlazado: d.enlazado || '',
    appleUrl: d.appleUrl || '',
    tecnica: d.tecnica && typeof d.tecnica === 'object' ? d.tecnica : null,
    extra: d.extra && typeof d.extra === 'object' ? d.extra : null,
    escuchas: Number(d.escuchas) || 0,
    escuchasFechas: Array.isArray(d.escuchasFechas) ? d.escuchasFechas.filter(Boolean).slice(-600) : [],
    ultimaEscucha: d.ultimaEscucha || '',
    prestadoA: d.prestadoA || '',
    prestadoDesde: d.prestadoDesde || '',
    /* Sincronización granular: modsBase es la marca común de los campos que
       nunca se han tocado desde que se activó este sistema; modsCampos solo
       guarda excepciones. Así evitamos repetir una fecha por cada campo. */
    modsBase: d.modsBase || '',
    modsCampos: (d.modsCampos && typeof d.modsCampos === 'object') ? d.modsCampos : {},
    fechaAlta: d.fechaAlta || nowISO(),
    mod: d.mod || d.fechaAlta || nowISO()
  };
}
function firma(d){
  var c = {};
  /* mod y modsCampos son metadata de sincronización: no deben provocar por sí
     solos otra ronda de cambios al recalcular la firma de contenido. */
  Object.keys(d).forEach(function(k){ if(k !== 'mod' && k !== 'modsBase' && k !== 'modsCampos') c[k] = d[k]; });
  return JSON.stringify(c);
}
function firmaValorCampo(v){
  try{ return JSON.stringify(v === undefined ? null : v); }
  catch(e){ return String(v); }
}
function firmasDeCampos(d){
  var out = {};
  Object.keys(d || {}).forEach(function(k){
    if(k === 'id' || k === 'mod' || k === 'modsBase' || k === 'modsCampos') return;
    out[k] = firmaValorCampo(d[k]);
  });
  return out;
}
function marcaCampo(d, campo){
  return (d && d.modsCampos && d.modsCampos[campo]) || (d && d.modsBase) || (d && d.mod) || '';
}
function compararMarca(a, b){
  var ta = Date.parse(a || ''), tb = Date.parse(b || '');
  if(!isNaN(ta) && !isNaN(tb)){
    if(ta > tb) return 1;
    if(tb > ta) return -1;
    return 0;
  }
  a = String(a || ''); b = String(b || '');
  return a > b ? 1 : (b > a ? -1 : 0);
}
function marcaMasReciente(a, b){ return compararMarca(a, b) >= 0 ? (a || b) : (b || a); }
function marcaMasAntigua(a, b){
  if(!a) return b || '';
  if(!b) return a || '';
  return compararMarca(a, b) <= 0 ? a : b;
}
function valoresIguales(a, b){ return firmaValorCampo(a) === firmaValorCampo(b); }
function hoyISO(){
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function escuchadoHoy(d){ return (d.escuchasFechas || []).indexOf(hoyISO()) >= 0; }
function totalEscuchas(d){ return Math.max(Number(d.escuchas) || 0, (d.escuchasFechas || []).length); }
function fechaBonita(iso){
  if(!iso) return '';
  var hoy = hoyISO();
  if(iso === hoy) return 'hoy';
  var ayer = new Date(Date.now() - 86400000);
  var a = ayer.getFullYear() + '-' + ('0' + (ayer.getMonth() + 1)).slice(-2) + '-' + ('0' + ayer.getDate()).slice(-2);
  if(iso === a) return 'ayer';
  try{ return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'}); }
  catch(e){ return iso; }
}
/* Marca (o desmarca) una escucha del día de hoy. Solo una por día. */
function marcarEscucha(id, silencioso){
  var d = DB.discos.filter(function(x){ return x.id === id; })[0];
  if(!d || readOnly) return false;
  var hoy = hoyISO();
  var i = (d.escuchasFechas || []).indexOf(hoy);
  var puesto;
  if(i >= 0){
    d.escuchasFechas.splice(i, 1);
    d.escuchas = Math.max(0, (Number(d.escuchas) || 1) - 1);
    puesto = false;
  }else{
    d.escuchasFechas = (d.escuchasFechas || []).concat([hoy]).sort();
    d.escuchas = (Number(d.escuchas) || 0) + 1;
    puesto = true;
  }
  d.ultimaEscucha = d.escuchasFechas.length ? d.escuchasFechas[d.escuchasFechas.length - 1] : '';
  persist(true);
  if(!silencioso) toast(puesto ? 'Escuchado hoy · ' + totalEscuchas(d) + (totalEscuchas(d) === 1 ? ' vez' : ' veces') : 'Escucha de hoy quitada');
  return puesto;
}
/* Campos que normDisc() reconstruye con un valor por defecto exacto cuando
   faltan del todo (mismo resultado que si estuvieran presentes "vacíos"):
   quitarlos del JSON subido no pierde ningún dato, solo bytes. NUNCA incluye
   identificadores ni datos bibliográficos (artista, título, sello, país,
   catálogo, mbid, discogs, códigoBarras, portada, notas...), que se guardan
   siempre tal cual aunque estén vacíos. */
var CAMPOS_LIGEROS = ['estadoFunda', 'fechaCompra', 'precioCompra', 'valorMercado',
  'etiquetas', 'ubicacion', 'valoracion', 'escuchas', 'escuchasFechas', 'ultimaEscucha',
  'prestadoA', 'prestadoDesde', 'enlazado', 'editado', 'sinFoto', 'ejemplares',
  'revisado', 'confianza', 'color', 'appleUrl', 'fotoDiscoMbid', 'faltan',
  'modsBase', 'modsCampos'];
function esDefectoReconstruible(campo, valor){
  if(campo === 'ejemplares') return !valor || valor === 1;
  if(Array.isArray(valor)) return valor.length === 0;
  if(valor && typeof valor === 'object') return Object.keys(valor).length === 0;
  return !valor;
}
/* Copia de un disco sin lo que normDisc() puede reconstruir solo:
   los fragmentos de audio caducan, la ficha técnica repite datos que ya
   están en el disco, y los campos de CAMPOS_LIGEROS vuelven a su valor por
   defecto exacto en cuanto faltan del JSON. */
function serializarDiscLigero(d){
  var o = {}, k;
  for(k in d) if(Object.prototype.hasOwnProperty.call(d, k)) o[k] = d[k];
  CAMPOS_LIGEROS.forEach(function(campo){
    if(esDefectoReconstruible(campo, o[campo])) delete o[campo];
  });
  if(o.tracklist && o.tracklist.length){
    /* "preview" se omite SIEMPRE, tenga o no contenido: normTracks() lo
       reconstruye igual (como "") tanto si la clave falta del todo como si
       llega vacía, así que dejar preview:"" en cada tema no protegía nada y
       solo eran bytes muertos repetidos por cada canción de cada disco. */
    o.tracklist = o.tracklist.map(function(t){
      var c = {}, j;
      for(j in t) if(j !== 'preview') c[j] = t[j];
      return c;
    });
  }
  if(o.tecnica){
    var t2 = {}, j2;
    for(j2 in o.tecnica) if(j2 !== 'url' && j2 !== 'cargado') t2[j2] = o.tecnica[j2];
    o.tecnica = t2;
  }else if(o.tecnica === null){
    delete o.tecnica;
  }
  if(o.extra){
    if(o.extra.cargado){
      var e2 = {}, j3;
      for(j3 in o.extra) if(j3 !== 'cargado') e2[j3] = o.extra[j3];
      o.extra = e2;
    }
  }else if(o.extra === null){
    delete o.extra;
  }
  return o;
}
function discosLigeros(){ return DB.discos.map(serializarDiscLigero); }
function coleccion(){ return DB.discos.filter(function(d){ return d.lista !== 'deseos'; }); }
function deseos(){ return DB.discos.filter(function(d){ return d.lista === 'deseos'; }); }
function dupSet(){
  var m = {}, s = {};
  coleccion().forEach(function(d){ var k = key(d); (m[k] = m[k] || []).push(d.id); });
  Object.keys(m).forEach(function(k){ if(m[k].length > 1) m[k].forEach(function(id){ s[id] = 1; }); });
  return s;
}
function incompleto(d){ return !d.portada || d.tracklist.length === 0 || !d.genero || !d['año'] || !d.sello; }
function todasEtiquetas(){
  var m = {};
  DB.discos.forEach(function(d){ d.etiquetas.forEach(function(t){ m[t] = (m[t] || 0) + 1; }); });
  return Object.keys(m).sort(function(a, b){ return m[b] - m[a]; });
}
/* ---------- tema claro / oscuro / automático ---------- */
var K_TEMA = 'discoteca.tema';
function temaActual(){
  try{ return localStorage.getItem(K_TEMA) || 'auto'; }catch(e){ return 'auto'; }
}
function aplicarTema(t){
  t = t || temaActual();
  var raiz = document.documentElement;
  if(t === 'auto') raiz.removeAttribute('data-tema');
  else raiz.setAttribute('data-tema', t);
  try{ localStorage.setItem(K_TEMA, t); }catch(e){}
  var oscuro = t === 'oscuro'
    || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.remove(); });
  var m2 = document.createElement('meta');
  m2.name = 'theme-color';
  m2.content = oscuro ? '#000000' : '#f5f5f7';
  document.head.appendChild(m2);
}

/* ---------- ayudas al pasar el ratón ---------- */
var cajaAyuda = null, tempAyuda = null;
function montarAyudas(raiz){
  (raiz || document).querySelectorAll('[data-tip]').forEach(function(el){
    if(el.dataset.tipListo) return;
    el.dataset.tipListo = '1';
    /* data-tip solo se ve al pasar el ratón: para quien navega con teclado o
       lector de pantalla, un botón sin texto y sin aria-label es un icono
       mudo. Si no tiene ya un nombre accesible propio, se usa el mismo texto
       de la ayuda visual -no hace falta duplicarlo a mano en cada sitio-. */
    if(!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', el.dataset.tip);
    el.addEventListener('mouseenter', function(){
      if(window.matchMedia && window.matchMedia('(hover: none)').matches) return;
      clearTimeout(tempAyuda);
      tempAyuda = setTimeout(function(){ mostrarAyuda(el); }, 320);
    });
    el.addEventListener('mouseleave', ocultarAyuda);
    el.addEventListener('click', ocultarAyuda);
  });
}
function mostrarAyuda(el){
  if(!cajaAyuda){
    cajaAyuda = document.createElement('div');
    cajaAyuda.className = 'ayuda';
    document.body.appendChild(cajaAyuda);
  }
  var txt = el.dataset.tip || '';
  var atajo = el.dataset.tecla ? '<kbd>' + esc(el.dataset.tecla) + '</kbd>' : '';
  cajaAyuda.innerHTML = esc(txt) + atajo;
  var r = el.getBoundingClientRect();
  cajaAyuda.style.visibility = 'hidden';
  cajaAyuda.classList.add('on');
  var a = cajaAyuda.getBoundingClientRect();
  var x = Math.min(window.innerWidth - a.width - 8, Math.max(8, r.left + r.width / 2 - a.width / 2));
  var abajo = r.bottom + 8 + a.height < window.innerHeight;
  cajaAyuda.style.left = x + 'px';
  cajaAyuda.style.top = (abajo ? r.bottom + 8 : r.top - a.height - 8) + 'px';
  cajaAyuda.style.visibility = '';
}
function ocultarAyuda(){
  clearTimeout(tempAyuda);
  if(cajaAyuda) cajaAyuda.classList.remove('on');
}

/* ---------- registro de fallos, para poder diagnosticarlos después ---------- */
var K_FALLOS = 'discoteca.fallos';
function apuntarFallo(tipo, msg, donde){
  try{
    var l = fallosGuardados();
    var texto = ocultarSecretos(msg).slice(0, 220);
    /* no repetir el mismo fallo una y otra vez */
    var ult = l[l.length - 1];
    if(ult && ult.m === texto){ ult.n = (ult.n || 1) + 1; ult.f = nowISO(); }
    else l.push({f: nowISO(), t: ocultarSecretos(tipo), m: texto, d: ocultarSecretos(donde).slice(0, 90), n: 1});
    localStorage.setItem(K_FALLOS, JSON.stringify(l.slice(-40)));
  }catch(e){}
}
function fallosGuardados(){
  try{ return JSON.parse(localStorage.getItem(K_FALLOS) || '[]').map(function(f){ return Object.assign({}, f, {m:ocultarSecretos(f.m), d:ocultarSecretos(f.d), t:ocultarSecretos(f.t)}); }); }catch(e){ return []; }
}
window.addEventListener('error', function(e){
  apuntarFallo('js', e.message, (e.filename || '').split('/').pop() + ':' + e.lineno);
});
window.addEventListener('unhandledrejection', function(e){
  var m = e.reason && (e.reason.message || e.reason);
  if(/Failed to fetch|NetworkError|Load failed/i.test(String(m))) return;
  apuntarFallo('promesa', m, '');
});

function toast(msg, err){
  var old = document.querySelectorAll('.toast');
  for(var i = 0; i < old.length; i++) old[i].remove();
  var t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (err ? I.warn : I.check) + '<span>' + esc(msg) + '</span>';
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, err ? 4200 : 3000);
  return t;
}
function download(filename, content, mime){
  var blob = content instanceof Blob ? content : new Blob([content], {type: mime || 'text/plain;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} a.remove(); }, 500);
}
function rngShuffle(arr, seed){
  var a = arr.slice(), s = seed || 1;
  for(var i = a.length - 1; i > 0; i--){
    s = (s * 9301 + 49297) % 233280;
    var j = Math.floor(s / 233280 * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function similitud(a, b){
  a = plain(a); b = plain(b);
  if(!a || !b) return 0;
  if(a === b) return 1;
  var bg = function(s){
    var r = [];
    for(var i = 0; i < s.length - 1; i++) r.push(s.substr(i, 2));
    return r;
  };
  var A = bg(a), B = bg(b);
  if(!A.length || !B.length) return 0;
  var copia = B.slice(), hits = 0;
  A.forEach(function(x){
    var i = copia.indexOf(x);
    if(i >= 0){ hits++; copia.splice(i, 1); }
  });
  return 2 * hits / (A.length + B.length);
}

/* ============================================================
   3. ALMACÉN LOCAL (caché)
   ============================================================ */
/* Una sola conexión reutilizada para toda la sesión, en vez de abrir una
   nueva en cada guardado/lectura (cada persist() podía dejar una conexión
   sin cerrar nunca). Se descarta y se vuelve a abrir sola si otra pestaña
   pide subir de versión, o si la apertura falla. */
var idbConexion = null;
function idbOpen(){
  if(idbConexion) return idbConexion;
  idbConexion = new Promise(function(res, rej){
    if(!window.indexedDB) return rej('no-idb');
    var r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = function(){ r.result.createObjectStore(IDB_STORE); };
    r.onsuccess = function(){
      var db = r.result;
      db.onversionchange = function(){ db.close(); idbConexion = null; };
      res(db);
    };
    r.onerror = function(){ idbConexion = null; rej(r.error); };
  });
  return idbConexion;
}
function idbSet(k, val){
  return idbOpen().then(function(db){
    return new Promise(function(res, rej){
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, k);
      tx.oncomplete = function(){ res(true); };
      tx.onerror = function(){ rej(tx.error); };
      tx.onabort = function(){ rej(tx.error || new Error('Escritura cancelada')); };
    });
  });
}
function idbGet(k){
  return idbOpen().then(function(db){
    return new Promise(function(res, rej){
      var tx = db.transaction(IDB_STORE, 'readonly');
      var q = tx.objectStore(IDB_STORE).get(k);
      q.onsuccess = function(){ res(q.result || null); };
      q.onerror = function(){ rej(q.error); };
    });
  });
}
function guardarLocal(){
  var payload = { actualizado: DB.actualizado, discos: DB.discos, borrados: DB.borrados, sha: SHA, lastSync: lastSync };
  return idbSet(K_DATOS, payload).catch(function(){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(payload)); }catch(e){ toast('No se pueden guardar los cambios en este dispositivo. Exporta una copia antes de cerrar.', true); throw e; }
  });
}
/* Las claves solo persisten en IndexedDB con consentimiento; nunca en el respaldo. */
var CLAVES_CFG = ['token', 'discogs', 'anthropic', 'lastfm', 'ticketmaster', 'audd'];
function configSinClaves(cfg){
  var copia = Object.assign({}, cfg);
  CLAVES_CFG.forEach(function(k){ copia[k] = ''; });
  return copia;
}
function ocultarSecretos(texto){
  var limpio = String(texto || '');
  CLAVES_CFG.forEach(function(k){
    var v = CFG[k];
    if(v){ limpio = limpio.split(v).join('[oculto]').split(encodeURIComponent(v)).join('[oculto]'); }
  });
  return limpio.replace(/(?:github_pat_|gh[pousr]_)[a-zA-Z0-9_]+/g, '[oculto]')
    .replace(/([?&](?:token|api_key|apikey|api_token|key)=)[^&#\s]*/gi, '$1[oculto]')
    .replace(/(Bearer\s+)[^\s,;]+/gi, '$1[oculto]');
}
function guardarCfg(){
  var publica = configSinClaves(CFG);
  try{ localStorage.setItem(LS_CFG, JSON.stringify(publica)); }catch(e){}
  return idbSet(K_CFG, CFG.recordarClaves ? Object.assign({}, CFG) : publica);
}
function validarConfig(cfg){
  if(!/^[a-zA-Z0-9-]+$/.test(cfg.owner) || !/^[a-zA-Z0-9_.-]+$/.test(cfg.repo))
    throw new Error('Revisa el usuario y el repositorio');
  if(!cfg.branch || /[\s?*\[\]~^:\\]/.test(cfg.branch) || cfg.branch.indexOf('..') >= 0)
    throw new Error('Revisa la rama');
  if(!cfg.path || cfg.path.split('/').some(function(p){ return !p || p === '.' || p === '..'; }) || !/\.json$/i.test(cfg.path))
    throw new Error('El archivo debe ser una ruta JSON sin segmentos vacíos ni puntos relativos');
  if(!cfg.token || /\s/.test(cfg.token)) throw new Error('Revisa el token');
}
function destinoConfig(cfg){ return [cfg.owner, cfg.repo, cfg.branch, cfg.path].join('/'); }
function crearPuntoRecuperacion(motivo){
  var copia = {version:4, actualizado:DB.actualizado, discos:JSON.parse(JSON.stringify(DB.discos)),
    borrados:JSON.parse(JSON.stringify(DB.borrados || [])), motivo:motivo, creado:nowISO()};
  return idbSet('recuperacion', copia).catch(function(){
    localStorage.setItem('discoteca.recuperacion', JSON.stringify(copia));
  });
}
function leerPuntoRecuperacion(){
  return idbGet('recuperacion').catch(function(){ return null; }).then(function(copia){
    var alternativa = null;
    try{ alternativa = JSON.parse(localStorage.getItem('discoteca.recuperacion') || 'null'); }catch(e){}
    return alternativa && (!copia || alternativa.creado > copia.creado) ? alternativa : copia;
  });
}

/* ============================================================
   4. CAMBIOS Y PERSISTENCIA
   ============================================================ */
var saveTimer = null;
function sellarCambios(){
  var ahora = nowISO(), n = 0, vistos = {};
  DB.discos.forEach(function(d){
    vistos[d.id] = 1;
    var f = firma(d);
    if(firmas[d.id] !== f){
      var yaExistia = firmas[d.id] !== undefined;
      var modAnterior = d.mod || d.fechaAlta || ahora;
      var anteriores = firmasCampos[d.id] || {};
      var actuales = firmasDeCampos(d);
      if(yaExistia){
        /* Primera edición tras actualizar desde una versión sin marcas por
           campo: se siembran los campos conocidos con el mod ANTERIOR de la
           ficha. Después solo los campos que realmente cambiaron reciben
           "ahora". Dos dispositivos que partan de la misma ficha pueden así
           editar campos distintos sin pisarse al volver a encontrarse. */
        d.modsCampos = (d.modsCampos && typeof d.modsCampos === 'object')
          ? Object.assign({}, d.modsCampos) : {};
        if(!d.modsBase) d.modsBase = modAnterior;
        Object.keys(actuales).forEach(function(k){
          if(anteriores[k] !== actuales[k]) d.modsCampos[k] = ahora;
        });
        d.mod = ahora;
      }else if(!d.mod){
        d.mod = ahora;
      }
      firmas[d.id] = firma(d);
      firmasCampos[d.id] = firmasDeCampos(d);
      n++;
    }
  });
  Object.keys(firmas).forEach(function(id){
    if(!vistos[id]){
      delete firmas[id];
      delete firmasCampos[id];
      DB.borrados = (DB.borrados || []).filter(function(b){ return b.id !== id; });
      DB.borrados.push({id:id, fecha:ahora});
      n++;
    }
  });
  if(DB.borrados && DB.borrados.length > 400){
    DB.borrados = DB.borrados.slice().sort(function(a, b){ return fechaMasReciente(a.fecha, b.fecha) ? 1 : -1; }).slice(-400);
  }
  return n;
}
function indexarFirmas(){
  firmas = {}; firmasCampos = {};
  DB.discos.forEach(function(d){
    firmas[d.id] = firma(d);
    firmasCampos[d.id] = firmasDeCampos(d);
  });
}
/* revisionDatos sube cada vez que hay un cambio real que sincronizar; push()
   la usa para saber si el PUT que acaba de subir ya incluye lo último, o si
   ha quedado algo fuera y hace falta otro (ver push() más abajo). */
var revisionDatos = 0;
function persist(silencioso){
  if(readOnly) return;
  var n = sellarCambios();
  if(n){ DB.actualizado = nowISO(); revisionDatos++; }
  guardarLocal().catch(function(){ marcar('err', 'Almacenamiento local lleno: exporta una copia'); });
  if(n && CFG.token){ syncState = 'pend'; programarPush(); }
  if(!silencioso) renderAll(); else pintarSync();
}
function programarPush(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){ saveTimer = null; push(); }, 2500);
}


/* ============================================================
   5. SINCRONIZACIÓN CON GITHUB
      Los datos viven en tu repositorio. Cada dispositivo baja,
      fusiona por fecha de modificación de cada disco y sube.
   ============================================================ */
var GH = 'https://api.github.com/repos/';
var pullTimer = null, ultimoPull = 0;

function b64enc(str){
  var bytes = new TextEncoder().encode(str), bin = '', paso = 0x8000;
  for(var i = 0; i < bytes.length; i += paso){
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + paso));
  }
  return btoa(bin);
}
function b64dec(b64){
  var bin = atob(String(b64).replace(/\s/g, ''));
  var bytes = new Uint8Array(bin.length);
  for(var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
function ghUrl(){
  return GH + encodeURIComponent(CFG.owner) + '/' + encodeURIComponent(CFG.repo)
    + '/contents/' + CFG.path.split('/').map(encodeURIComponent).join('/');
}
function ghHeaders(){
  return { 'Authorization': 'Bearer ' + CFG.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}
function configurado(){ return !!(CFG.owner && CFG.repo && CFG.token); }

function pintarSync(){
  var b = document.getElementById('syncBadge'), t = document.getElementById('syncTxt');
  if(!b) return;
  var textos = {
    local: 'Solo en este equipo', ok: 'Al día', pend: 'Pendiente de subir',
    busy: 'Sincronizando…', err: 'Error de sincronía', off: 'Sin conexión'
  };
  b.className = 'sync ' + syncState;
  t.textContent = syncMsg || textos[syncState] || '';
  b.title = lastSync ? 'Última sincronización: ' + fdate(lastSync) : 'Pulsa para configurar la sincronización';
}
function marcar(estado, msg){
  syncState = estado; syncMsg = msg || '';
  pintarSync();
  /* la pestaña Archivo muestra el estado: si está a la vista, se refresca */
  if(view === 'db' && document.getElementById('dbBody')) paintDb();
}

/* ---------- fusión ---------- */
/* Compara dos fechas de verdad, no como texto: un ISO con otro huso horario
   compararía mal como texto aunque sea correcto cronológicamente. Si algo
   no se puede interpretar como fecha, cae de vuelta a comparar el texto,
   para no romperse con un valor antiguo o raro. */
function fechaMasReciente(a, b){
  var ta = Date.parse(a || ''), tb = Date.parse(b || '');
  if(!isNaN(ta) && !isNaN(tb)) return ta >= tb;
  return String(a || '') >= String(b || '');
}
function fusionar(locales, borrLoc, remotos, borrRem){
  var mapa = {}, out = [], cambiosLocales = 0, cambiosRemotos = 0;
  var borrados = {};
  (borrLoc || []).concat(borrRem || []).forEach(function(b){
    if(!borrados[b.id] || fechaMasReciente(b.fecha, borrados[b.id])) borrados[b.id] = b.fecha;
  });
  (remotos || []).forEach(function(d){ mapa[d.id] = {r: normDisc(d)}; });
  (locales || []).forEach(function(d){
    mapa[d.id] = mapa[d.id] || {};
    mapa[d.id].l = d;
  });
  Object.keys(mapa).forEach(function(id){
    var par = mapa[id], l = par.l, r = par.r;
    var base = l && r ? (fechaMasReciente(l.mod, r.mod) ? l : r) : (l || r);
    var borr = borrados[id];
    if(borr && fechaMasReciente(borr, base.mod)){
      if(l) cambiosLocales++;
      if(r) cambiosRemotos++;
      return;
    }

    if(!l || !r){
      if(!l) cambiosLocales++;
      if(!r) cambiosRemotos++;
      out.push(base);
      return;
    }

    /* Fusión granular compatible hacia atrás. Si una ficha todavía no tiene
       modsCampos, marcaCampo() cae a d.mod y el comportamiento es exactamente
       el last-write-wins histórico. Cuando ambos dispositivos ya han editado
       con esta versión, cada campo puede viajar por separado. */
    var elegido = Object.assign({}, base);
    var mods = {};
    var clavesMods = {};
    Object.keys(l.modsCampos || {}).concat(Object.keys(r.modsCampos || {})).forEach(function(k){ clavesMods[k] = 1; });
    Object.keys(clavesMods).forEach(function(k){
      mods[k] = marcaMasReciente(marcaCampo(l, k), marcaCampo(r, k));
    });

    var especiales = {id:1, mod:1, modsBase:1, modsCampos:1, etiquetas:1, editado:1,
      escuchasFechas:1, escuchas:1, ultimaEscucha:1};
    var claves = {};
    Object.keys(l).concat(Object.keys(r)).forEach(function(k){ if(!especiales[k]) claves[k] = 1; });
    Object.keys(claves).forEach(function(k){
      if(valoresIguales(l[k], r[k])){ elegido[k] = l[k]; return; }
      var cmp = compararMarca(marcaCampo(l, k), marcaCampo(r, k));
      if(cmp > 0) elegido[k] = l[k];
      else if(cmp < 0) elegido[k] = r[k];
      else elegido[k] = base[k]; /* empate real: conserva el desempate histórico por mod */
      mods[k] = marcaMasReciente(marcaCampo(l, k), marcaCampo(r, k));
    });

    /* Etiquetas son acumulativas: nunca tiene sentido perder una porque otro
       dispositivo añadió otra distinta. */
    var etq = {};
    (l.etiquetas || []).concat(r.etiquetas || []).forEach(function(t){ if(t) etq[t] = 1; });
    elegido.etiquetas = Object.keys(etq).sort();
    if(!valoresIguales(l.etiquetas || [], r.etiquetas || []))
      mods.etiquetas = marcaMasReciente(marcaCampo(l, 'etiquetas'), marcaCampo(r, 'etiquetas'));

    /* Las protecciones manuales también son acumulativas: editar "país" en un
       dispositivo y "catálogo" en otro debe conservar ambas protecciones. */
    elegido.editado = Object.assign({}, r.editado || {}, l.editado || {});
    Object.keys(r.editado || {}).forEach(function(k){
      if((r.editado || {})[k]) elegido.editado[k] = r.editado[k];
    });
    if(!valoresIguales(l.editado || {}, r.editado || {}))
      mods.editado = marcaMasReciente(marcaCampo(l, 'editado'), marcaCampo(r, 'editado'));

    /* Escuchas: unión de días + máximo histórico. Antes el máximo solo se
       recalculaba cuando aparecía una fecha nueva; con las mismas fechas una
       cifra histórica mayor podía perderse al ganar la ficha más reciente. */
    var union = {};
    (l.escuchasFechas || []).concat(r.escuchasFechas || []).forEach(function(f){ if(f) union[f] = 1; });
    var todas = Object.keys(union).sort();
    elegido.escuchasFechas = todas;
    elegido.escuchas = Math.max(todas.length, Number(l.escuchas) || 0, Number(r.escuchas) || 0);
    var ultimas = [l.ultimaEscucha || '', r.ultimaEscucha || '', todas.length ? todas[todas.length - 1] : '']
      .filter(Boolean).sort();
    elegido.ultimaEscucha = ultimas.length ? ultimas[ultimas.length - 1] : '';
    ['escuchasFechas','escuchas','ultimaEscucha'].forEach(function(k){
      if(!valoresIguales(l[k], r[k]))
        mods[k] = marcaMasReciente(marcaCampo(l, k), marcaCampo(r, k));
    });

    /* Una sola marca base para los campos sin excepción. Si ambos lados ya
       traen base granular, conservar la más antigua es deliberadamente
       conservador: los campos realmente cambiados llevan su excepción en
       modsCampos y los que no la llevan no deben aparentar ser más nuevos. */
    var baseL = l.modsBase || '', baseR = r.modsBase || '';
    elegido.modsBase = marcaMasAntigua(baseL, baseR);
    elegido.modsCampos = mods;
    elegido.mod = fechaMasReciente(l.mod, r.mod) ? l.mod : r.mod;

    /* Contar contra cada lado por CONTENIDO, no por identidad de objeto. Así
       una combinación de campos de ambos dispositivos se propaga exactamente
       a los lados que todavía no tienen el resultado final. */
    if(firma(elegido) !== firma(l)) cambiosLocales++;
    if(firma(elegido) !== firma(r)) cambiosRemotos++;
    out.push(elegido);
  });
  var listaBorrados = Object.keys(borrados).map(function(id){ return {id:id, fecha:borrados[id]}; })
    .sort(function(a, b){ return fechaMasReciente(a.fecha, b.fecha) ? 1 : -1; })
    .slice(-400);
  return { discos: out, borrados: listaBorrados, aLocal: cambiosLocales, aRemoto: cambiosRemotos };
}

/* ---------- descarga ---------- */
/* Exclusión mutua GLOBAL: pull y push comparten una única cola, así que
   nunca hay un GET y un PUT en vuelo a la vez -ni tampoco dos pull o dos
   push-. Sin esto, un pull que termina de fusionar cambios remotos justo
   mientras un push ya en marcha sube una foto de DB.discos tomada ANTES de
   esa fusión podía sobrescribir GitHub y perder lo que el pull acababa de
   traer. encolarSync() ata cada operación real a la cola: la siguiente no
   empieza hasta que la anterior (pull o push, la que sea) ha terminado del
   todo, éxito o fallo. */
var colaSincro = Promise.resolve();
function encolarSync(fn){
  var propia = colaSincro.then(fn, fn);
  colaSincro = propia.catch(function(){}); /* un fallo no debe dejar la cola atascada */
  return propia;
}
var pullPromiseActual = null;
/* llamadas nuevas mientras ya hay un pull pedido reutilizan esa misma
   promesa en vez de encolar una segunda petición idéntica */
function pull(silencioso){
  if(pullPromiseActual) return pullPromiseActual;
  if(configuracionEnCurso || !configurado()) return Promise.resolve(false);
  pullPromiseActual = encolarSync(function(){ return pullReal(silencioso); })
    .then(function(resultado){ pullPromiseActual = null; return resultado; });
  return pullPromiseActual;
}
/* La operación real de descarga, sin cola ni deduplicación propia: la usa
   pull() (ya encolado) y también, directamente y SIN pasar otra vez por la
   cola, el reintento tras un 409 dentro de pushInterno -que ya se está
   ejecutando dentro de su propio turno de la cola; volver a encolar desde
   ahí produciría un interbloqueo, porque esa misma tarea es la que la cola
   está esperando a que termine-. */
function pullReal(silencioso){
  marcar('busy');
  return fetch(ghUrl() + '?ref=' + encodeURIComponent(CFG.branch) + '&t=' + Date.now(), {headers: ghHeaders(), cache:'no-store'})
    .then(function(r){
      if(r.status === 404) return null;
      if(r.status === 401 || r.status === 403) throw new Error('token');
      if(!r.ok) throw new Error('http' + r.status);
      return r.json();
    })
    .then(function(j){
      ultimoPull = Date.now();
      if(!j){ SHA = ''; marcar('pend', 'Aún no subido'); return true; }
      var texto = j.content ? b64dec(j.content) : null;
      var seguir = function(txt){
        var remoto = validarCopia(JSON.parse(txt));
        SHA = j.sha;
        var res = fusionar(DB.discos, DB.borrados, remoto.discos || [], remoto.borrados || []);
        DB.discos = res.discos.map(normDisc);
        DB.borrados = res.borrados;
        indexarFirmas();
        lastSync = nowISO();
        guardarLocal();
        if(res.aRemoto > 0){
          /* La fusión ha producido datos que GitHub todavía no tiene (p.ej.
             escuchasFechas combinadas de dos dispositivos): eso es un cambio
             real y tiene que contar como tal, o push() -que solo sube cuando
             revisionDatos ha avanzado- puede pensar que ya está todo subido
             y no hacer ningún PUT. */
          revisionDatos++;
          marcar('pend'); programarPush();
        }
        else marcar('ok');
        if(res.aLocal > 0){
          renderAll();
          if(!silencioso) toast(res.aLocal + (res.aLocal === 1 ? ' cambio recibido' : ' cambios recibidos'));
        }else{
          renderAll();
        }
        return true;
      };
      if(texto !== null) return seguir(texto);
      return fetch(ghUrl() + '?ref=' + encodeURIComponent(CFG.branch), {
        headers:Object.assign({}, ghHeaders(), {Accept:'application/vnd.github.raw+json'}), cache:'no-store'
      }).then(function(r2){ if(!r2.ok) throw new Error('http' + r2.status); return r2.text(); }).then(seguir);
    })
    .catch(function(e){
      /* un fallo de red de verdad (sin conexión) llega aquí como TypeError,
         distinto de los errores que la propia app lanza a propósito;
         navigator.onLine no se usa para bloquear el intento porque en
         Safari, sobre todo en la app instalada, puede decir que no hay
         red aunque sí la haya */
      if(e instanceof TypeError){ marcar('off'); return false; }
      marcar('err', String(e.message) === 'token' ? 'Token no válido' : '');
      return false;
    });
}

/* ---------- subida ---------- */
/* pushInterno() hace la petición PUT y, si hace falta, el reintento tras
   un 409/422; push() es la puerta de entrada con exclusión mutua: si ya
   hay una subida en curso, una llamada nueva no dispara un segundo PUT en
   paralelo, se limita a anotar que hace falta otra en cuanto termine la
   actual, para no perder el cambio que la motivó. */
/* Qué revisión de los datos iba dentro del último cuerpo que de verdad se
   envió por PUT -se fija justo al construir "doc", no al pedir el push-,
   para que push() sepa exactamente qué se subió aunque el cambio haya
   llegado mientras esta tarea esperaba su turno en la cola. */
var revisionEnviada = -1;
/* El contador de reintentos por conflicto 409/422 es un PARÁMETRO de esta
   cadena de llamadas, no una variable global: así cada push() -incluso uno
   completamente independiente que empiece justo después de que otro haya
   agotado sus reintentos- arranca siempre desde 0, con sus 3 reintentos
   propios disponibles, en vez de heredar el contador ya consumido por una
   sincronización anterior. */
var MAX_REINTENTOS_PUSH = 3;
function pushInterno(intento){
  intento = intento || 0;
  marcar('busy');
  revisionEnviada = revisionDatos;
  var doc = { version:4, actualizado: nowISO(), discos: discosLigeros(), borrados: DB.borrados || [] };
  var cuerpo = {
    message: 'Discoteca · ' + DB.discos.length + ' discos · ' + new Date().toLocaleString('es-ES'),
    content: b64enc(JSON.stringify(doc, null, 0)),
    branch: CFG.branch
  };
  if(SHA) cuerpo.sha = SHA;
  return fetch(ghUrl(), {method:'PUT', headers: ghHeaders(), body: JSON.stringify(cuerpo)})
    .then(function(r){
      if(r.status === 409 || r.status === 422){
        if(intento >= MAX_REINTENTOS_PUSH) throw new Error('conflicto');
        var siguiente = intento + 1;
        /* pequeño backoff antes de reintentar: si dos dispositivos están
           chocando a la vez, reintentar en el mismo instante solo aumenta
           las probabilidades de un segundo choque. 400ms, 800ms, 1200ms. */
        var espera = new Promise(function(res){ setTimeout(res, 400 * siguiente); });
        /* Va directo a pullReal(), NO a pull(): esta función ya se está
           ejecutando dentro de su propio turno de la cola de sincronización
           (encolarSync), así que volver a pasar por pull() -que también
           encola- se quedaría esperando a que termine... esta misma tarea:
           interbloqueo. Si el pull para refrescar el SHA falla (sin red,
           token, lo que sea), NO tiene sentido reintentar el push a ciegas:
           seguiría mandando el mismo SHA caducado y volvería a chocar, o
           peor, podría pisar cambios remotos que no llegó a ver. */
        return espera.then(function(){ return pullReal(true); }).then(function(ok){
          if(!ok) throw new Error('conflicto');
          return pushInterno(siguiente);
        });
      }
      if(r.status === 401 || r.status === 403) throw new Error('token');
      if(!r.ok) throw new Error('http' + r.status);
      return r.json().then(function(j){
        SHA = j.content && j.content.sha ? j.content.sha : SHA;
        DB.actualizado = doc.actualizado;
        lastSync = nowISO();
        guardarLocal();
        marcar('ok');
        return true;
      });
    })
    .catch(function(e){
      if(e instanceof TypeError){ marcar('off'); return false; }
      marcar('err', String(e.message) === 'token' ? 'Token no válido' : '');
      return false;
    });
}
var pushPromiseActual = null, ultimaRevisionSubida = -1;
function push(){
  if(pushPromiseActual) return pushPromiseActual;
  if(configuracionEnCurso || !configurado() || readOnly) return Promise.resolve(false);
  /* Caso A del punto 7: tres push() sin ningún cambio de por medio no deben
     generar tres PUT -ni siquiera dos-, solo uno. Si ya se subió esta misma
     revisión de los datos, no hay nada nuevo que enviar. */
  if(revisionDatos === ultimaRevisionSubida) return Promise.resolve(true);
  pushPromiseActual = encolarSync(function(){ return pushInterno(0); }).then(function(resultado){
    pushPromiseActual = null;
    /* Encadenar otro push() solo tiene sentido cuando este ha tenido ÉXITO:
       si ha fallado (sin red, token caducado, conflicto agotado...), NO se
       reintenta aquí en bucle -ultimaRevisionSubida no se toca, así que
       revisionDatos seguiría sin coincidir con ella para siempre y encadenar
       push() habría sido un bucle infinito-. Un fallo ya deja marcar('err')/
       marcar('off') y syncState en consecuencia; lo reintentan los mecanismos
       normales (sincronización periódica, el próximo guardado, o "Sincronizar
       ahora"), no un reintento ciego dentro de esta misma promesa. */
    if(!resultado) return resultado;
    /* Se compara contra revisionEnviada (fijada dentro de pushInterno justo
       al construir el cuerpo del PUT), NUNCA contra la revisión de cuando se
       llamó a push(): si el cambio llegó mientras esta tarea esperaba turno
       en la cola, ya iba incluido en "doc" y no hace falta un segundo PUT
       para lo mismo -pero si llegó DESPUÉS, con el PUT ya en vuelo (Caso B),
       sí quedó fuera y hace falta otro PUT con lo último-. */
    ultimaRevisionSubida = revisionEnviada;
    if(revisionDatos !== revisionEnviada) return push();
    return resultado;
  });
  return pushPromiseActual;
}
function sincronizarAhora(){
  if(!configurado()){ pantallaSync(); return; }
  pull().then(function(){
    if(syncState === 'pend'){
      /* pull() puede haber programado ya una subida para dentro de unos
         segundos; como se va a subir ahora mismo, se cancela esa, para
         que no lleguen las dos y generen un segundo commit de más */
      clearTimeout(saveTimer); saveTimer = null;
      return push();
    }
  });
}

/* ---------- arranque ---------- */
function boot(){
  Promise.all([idbGet(K_CFG).catch(function(){ return null; }), idbGet(K_DATOS).catch(function(){ return null; })])
    .then(function(res){
      var cfg = res[0], loc = res[1];
      if(!cfg){
        try{ var rawCfg = localStorage.getItem(LS_CFG); if(rawCfg) cfg = JSON.parse(rawCfg); }catch(e){}
      }
      if(!loc){
        try{ var raw = localStorage.getItem(LS_KEY); if(raw) loc = JSON.parse(raw); }catch(e){}
      }
      if(cfg){
        CFG = Object.assign(CFG, cfg);
        /* Migración compatible: conservar el acceso existente y quitar la copia duplicada. */
        if(typeof cfg.recordarClaves !== 'boolean') CFG.recordarClaves = true;
        guardarCfg().catch(function(){ toast('No se pudieron guardar los ajustes; conserva tus claves en el gestor de contraseñas', true); });
      }
      /* Sin token no se puede escribir en el repositorio: la app se abre en modo consulta */
      readOnly = !configurado();
      document.body.classList.toggle('ro', readOnly);
      if(loc && Array.isArray(loc.discos)){
        DB.discos = loc.discos.map(normDisc);
        DB.borrados = loc.borrados || [];
        DB.actualizado = loc.actualizado || '';
        SHA = loc.sha || '';
        lastSync = loc.lastSync || '';
        indexarFirmas();
        marcar(configurado() ? 'ok' : 'local');
        montarEventos();
        renderAll();
        if(configurado()) pull(true);
        return;
      }
      return Promise.resolve({discos:[], borrados:[]})
        .then(function(doc){
          DB.discos = (doc.discos || []).map(normDisc);
          DB.borrados = doc.borrados || [];
          DB.actualizado = doc.actualizado || nowISO();
          indexarFirmas();
          guardarLocal();
          marcar(configurado() ? 'ok' : 'local');
          montarEventos();
          renderAll();
          if(configurado()) pull(true);
        });
    })
    .catch(function(){
      montarEventos();
      renderAll();
    });
}

/* ---------- pantalla de configuración ---------- */
/* ---------- comprobar cada clave opcional, antes de guardarla ---------- */
function probarDiscogs(valor){
  return fetch('https://api.discogs.com/database/search?q=queen&type=artist&per_page=1&token=' + encodeURIComponent(valor))
    .then(function(r){
      if(r.status === 401) throw new Error('Token no válido');
      if(!r.ok) throw new Error('Discogs respondió con un error (http' + r.status + ')');
      return 'Funciona correctamente';
    });
}
/* Un único sitio para el nombre de cada modelo: si Anthropic retira uno,
   se cambia aquí y no hay que buscarlo por el resto del archivo. */
var MODELO_ANTHROPIC_RAPIDO = 'claude-haiku-4-5-20251001';
var MODELO_ANTHROPIC_COMPLETO = 'claude-sonnet-5';
function probarAnthropic(valor){
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'content-type':'application/json', 'x-api-key':valor, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({model:MODELO_ANTHROPIC_RAPIDO, max_tokens:1, messages:[{role:'user', content:'hola'}]})
  }).then(function(r){
    if(r.status === 401) throw new Error('Clave no válida');
    if(!r.ok) return r.json().catch(function(){ return {}; }).then(function(j){
      throw new Error((j.error && j.error.message) || ('http' + r.status));
    });
    return 'Funciona correctamente';
  });
}
function probarLastfm(valor){
  return fetch('https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=queen&api_key=' + encodeURIComponent(valor) + '&format=json')
    .then(function(r){ return r.json(); })
    .then(function(j){
      if(j.error) throw new Error(j.message || 'Clave no válida');
      return 'Funciona correctamente';
    });
}
function probarTicketmaster(valor){
  return fetch('https://app.ticketmaster.com/discovery/v2/events.json?apikey=' + encodeURIComponent(valor) + '&size=1')
    .then(function(r){
      if(r.status === 401) throw new Error('Clave no válida');
      if(!r.ok) return r.json().catch(function(){ return {}; }).then(function(j){
        throw new Error((j.fault && j.fault.faultstring) || ('http' + r.status));
      });
      return 'Funciona correctamente';
    });
}
function probarAudd(valor){
  /* sin mandar ningún archivo: AudD devuelve un código distinto si el
     problema es el token (900) que si el problema es que falta el
     archivo (700, esperado aquí), así que esto no gasta ninguna consulta
     de las limitadas de tu plan */
  var fd = new FormData();
  fd.append('api_token', valor);
  return fetch('https://api.audd.io/', {method:'POST', body:fd})
    .then(function(r){ return r.json(); })
    .then(function(j){
      var codigo = j.error && j.error.error_code;
      if(codigo === 900 || codigo === 901) throw new Error('Token no válido');
      return 'La clave funciona (no se ha gastado ninguna consulta)';
    });
}
function probarClave(fn, valor, elBoton, elResultado){
  if(!valor){ elResultado.style.display = 'none'; return; }
  elResultado.style.display = '';
  elResultado.className = 'note busy';
  elResultado.textContent = 'Comprobando…';
  elBoton.disabled = true;
  fn(valor).then(function(msg){
    elResultado.className = 'note ok';
    elResultado.textContent = msg;
    elBoton.disabled = false;
  }).catch(function(e){
    elResultado.className = 'note err';
    elResultado.textContent = (e instanceof TypeError) ? 'No se pudo conectar con el servidor' : e.message;
    elBoton.disabled = false;
  });
}
function pantallaSync(){
  var body =
    '<div class="warnb info">' + I.cloud + '<span>Tu colección se guarda en un archivo <b>' + esc(CFG.path)
    + '</b> dentro de tu repositorio de GitHub. Cada dispositivo la baja al abrir y sube lo que cambies. '
    + 'La app puede ser pública y la colección estar en otro repositorio privado. El token se envía únicamente a GitHub para autenticarte.</span></div>'
    + '<div class="group">'
      + '<div class="grow"><label>Usuario</label><input id="sOwner" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + esc(CFG.owner) + '" placeholder="tu-usuario"></div>'
      + '<div class="grow"><label>Repositorio</label><input id="sRepo" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + esc(CFG.repo) + '" placeholder="discoteca"></div>'
      + '<div class="grow"><label>Rama</label><input id="sBranch" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + esc(CFG.branch) + '" placeholder="main"></div>'
      + '<div class="grow"><label>Archivo</label><input id="sPath" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + esc(CFG.path) + '" placeholder="datos.json"></div>'
      + '<div class="grow"><label>Token</label><input id="sToken" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="github_pat_…"></div>'
    + '</div>'
    + '<div class="warnb info">' + I.scan + '<span>Opcional: un <b>token de Discogs</b> mejora mucho el escáner de códigos de barras '
    + 'y el relleno de fichas, porque su base de datos de discos físicos es la más completa. '
    + 'Se crea en Discogs → Settings → Developers → Generate token.</span></div>'
    + '<div class="group"><div class="grow"><label>Token Discogs</label>'
    + '<input id="sDisc" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="opcional"></div>'
    + '<button class="btn sm" type="button" id="pDisc">Probar</button></div><div id="rDisc" class="note" style="display:none;margin:-6px 0 14px"></div>'
    + '<div style="font-size:12.5px;color:var(--txt2);line-height:1.5;margin:-4px 0 14px 3px">'
    + 'El token se crea en GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens, '
    + 'con permiso <b>Contents: Read and write</b> sobre ese único repositorio.</div>'
    + '<div class="warnb">' + I.warn + '<span>Más opcional aún: una <b>clave de API de Anthropic</b> permite identificar '
    + 'un disco por la foto de su portada cuando el código de barras no se puede leer. Tiene un coste pequeño por foto '
    + '(unos céntimos) que se cobra en tu cuenta de Anthropic, y sigue la opción de recordar claves de este dispositivo, '
    + 'como los demás tokens. Sin ella, esa opción simplemente no aparece.</span></div>'
    + '<div class="group"><div class="grow"><label>Clave de Anthropic</label>'
    + '<input id="sAntropic" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="sk-ant-…"></div>'
    + '<button class="btn sm" type="button" id="pAntropic" data-tip="La prueba también tiene un coste mínimo">Probar</button></div>'
    + '<div id="rAntropic" class="note" style="display:none;margin:-6px 0 14px"></div>'
    + '<div class="warnb info">' + I.info + '<span>Opcional y gratis: una <b>clave de Last.fm</b> da una biografía del '
    + 'artista cuando Wikipedia en español no tiene artículo sobre él. Se crea en last.fm/api/account/create, '
    + 'sin coste.</span></div>'
    + '<div class="group"><div class="grow"><label>Clave de Last.fm</label>'
    + '<input id="sLastfm" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="opcional"></div>'
    + '<button class="btn sm" type="button" id="pLastfm">Probar</button></div><div id="rLastfm" class="note" style="display:none;margin:-6px 0 14px"></div>'
    + (hayDiscogs() ? '<div class="fila" style="margin-top:4px"><div><div class="ft">Subir a Discogs al añadir aquí</div>'
        + '<div class="fs">Cuando des de alta un disco que ya tenga edición de Discogs enlazada, se añade también '
        + 'a tu colección de Discogs.</div></div>'
        + '<input type="checkbox" id="sSubir" style="width:20px;height:20px;accent-color:var(--blue)"' + (CFG.subirADiscogs ? ' checked' : '') + '></div>' : '')
    + '<div class="warnb info">' + I.info + '<span>Opcional y gratis: una <b>clave de Ticketmaster</b> avisa de conciertos '
    + 'cerca de ti de artistas que ya tienes. Se crea en developer.ticketmaster.com, sin coste, con un límite '
    + 'generoso de consultas al día.</span></div>'
    + '<div class="group"><div class="grow"><label>Clave de Ticketmaster</label>'
    + '<input id="sTM" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="opcional"></div>'
    + '<button class="btn sm" type="button" id="pTM">Probar</button></div><div id="rTM" class="note" style="display:none;margin:-6px 0 14px"></div>'
    + '<div class="warnb">' + I.warn + '<span>Más opcional aún: una <b>clave de AudD</b> permite reconocer una canción '
    + 'grabando unos segundos con el micrófono, como Shazam. Su plan gratuito es muy limitado; para usarlo con '
    + 'cierta frecuencia hace falta un plan de pago en audd.io.</span></div>'
    + '<div class="group"><div class="grow"><label>Clave de AudD</label>'
    + '<input id="sAudd" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" value="" autocomplete="off" placeholder="opcional"></div>'
    + '<button class="btn sm" type="button" id="pAudd">Probar</button></div><div id="rAudd" class="note" style="display:none;margin:-6px 0 14px"></div>'
    + '<label><input id="sRecordar" type="checkbox"' + (CFG.recordarClaves ? ' checked' : '') + '> Recordar claves en este dispositivo</label>'
    + '<div class="note">Si no lo marcas, las claves duran hasta cerrar o recargar la app. Si lo marcas, se guardan sin cifrar en este navegador. Usa un token limitado al repositorio privado de datos.</div>'
    + '<div id="snote"></div>';
  var pie = (configurado()
      ? '<button type="button" class="btn destr" id="sOff">Desconectar</button>'
      : '<span></span>')
    + '<div class="rowb"><button type="button" class="btn" id="sProbar">Probar</button><button type="button" class="btn pri" id="sOk">Guardar y sincronizar</button></div>';
  var s = sheet('Sincronización', body, pie);
  var $ = function(q){ return s.querySelector(q); };
  [['sToken','token'],['sDisc','discogs'],['sAntropic','anthropic'],['sLastfm','lastfm'],['sTM','ticketmaster'],['sAudd','audd']].forEach(function(p){ $('#' + p[0]).value = CFG[p[1]] || ''; });
  var leer = function(){
    return {
      owner: $('#sOwner').value.trim(), repo: $('#sRepo').value.trim(),
      branch: $('#sBranch').value.trim() || 'main', path: $('#sPath').value.trim() || 'datos.json',
      token: $('#sToken').value.trim(), discogs: $('#sDisc').value.trim(),
      anthropic: $('#sAntropic').value.trim(), lastfm: $('#sLastfm').value.trim(),
      ticketmaster: $('#sTM').value.trim(), audd: $('#sAudd').value.trim(),
      recordarClaves: $('#sRecordar').checked, subirADiscogs: $('#sSubir') ? $('#sSubir').checked : false, auto: true
    };
  };
  /* Diagnóstico por etapas: primero repositorio, luego rama y solo al final
     datos.json. Un 404 ya no se interpreta automáticamente como "archivo no
     existe", porque también puede significar repo/rama mal escritos o token
     sin acceso. */
  var probar = function(cfg){
    try{ validarConfig(cfg); }catch(e){ return Promise.reject(e); }
    var base = GH + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo);
    var headers = {'Authorization':'Bearer ' + cfg.token, 'Accept':'application/vnd.github+json'};
    var errorComun = function(r, que){
      if(r.status === 401) throw new Error('El token de GitHub no es válido o ha caducado');
      if(r.status === 403) throw new Error('El token no tiene permisos suficientes para ' + que);
      throw new Error('GitHub respondió con HTTP ' + r.status + ' al comprobar ' + que);
    };
    return fetch(base, {headers:headers, cache:'no-store'}).then(function(r){
      if(r.status === 404){
        /* En un repositorio público esta segunda petición permite distinguir
           "repo existe pero el token no tiene acceso" de "repo no existe".
           En uno privado GitHub oculta deliberadamente esa diferencia. */
        return fetch(base, {headers:{'Accept':'application/vnd.github+json'}, cache:'no-store'}).then(function(pub){
          if(pub.ok) throw new Error('El repositorio existe, pero este token no tiene acceso a él');
          throw new Error('No se encuentra el repositorio ' + cfg.owner + '/' + cfg.repo + ' o el token no tiene acceso');
        });
      }
      if(!r.ok) return errorComun(r, 'el repositorio');
      return r.json().then(function(repo){
        cfg.repoPrivado = repo.private === true;
        if(repo.archived) throw new Error('El repositorio está archivado y no admite cambios');
        if(repo.permissions && repo.permissions.push === false) throw new Error('Tu cuenta no tiene permiso de escritura en este repositorio');
        var rama = base + '/branches/' + encodeURIComponent(cfg.branch);
        return fetch(rama, {headers:headers, cache:'no-store'});
      });
    }).then(function(r){
      if(r.status === 404) throw new Error('La rama "' + cfg.branch + '" no existe en ese repositorio');
      if(!r.ok) return errorComun(r, 'la rama ' + cfg.branch);
      var archivo = base + '/contents/' + cfg.path.split('/').map(encodeURIComponent).join('/')
        + '?ref=' + encodeURIComponent(cfg.branch);
      return fetch(archivo, {headers:headers, cache:'no-store'});
    }).then(function(r){
      if(r.status === 200) return {ok:true, existe:true};
      if(r.status === 404) return {ok:true, existe:false};
      if(!r.ok) return errorComun(r, 'el archivo ' + cfg.path);
      return {ok:true, existe:true};
    });
  };
  $('#sProbar').onclick = function(){
    var cfg = leer();
    if(!cfg.owner || !cfg.repo || !cfg.token){ $('#snote').innerHTML = '<div class="note err">Faltan datos.</div>'; return; }
    $('#snote').innerHTML = '<div class="note busy">Comprobando…</div>';
    probar(cfg).then(function(r){
      $('#snote').innerHTML = '<div class="note ok">Conexión correcta · '
        + (cfg.repoPrivado ? 'repositorio privado · ' : 'ATENCIÓN: repositorio público · ') + (r.existe ? 'el archivo ya existe' : 'se creará al guardar') + '</div>';
    }).catch(function(e){ $('#snote').innerHTML = '<div class="note err">' + esc(e.message) + '</div>'; });
  };
  $('#sOk').onclick = function(){
    var cfg = leer();
    if(!cfg.owner || !cfg.repo || !cfg.token){ $('#snote').innerHTML = '<div class="note err">Faltan datos.</div>'; return; }
    $('#snote').innerHTML = '<div class="note busy">Conectando…</div>';
    if(syncState === 'busy' || pullPromiseActual || pushPromiseActual){ toast('Espera a que termine la sincronización', true); return; }
    var cambiando = destinoConfig(CFG) !== destinoConfig(cfg);
    if(cambiando && !confirm('Vas a conectar otra ubicación. Se fusionará con la colección de este dispositivo. Antes se guardará una copia de recuperación. ¿Continuar?')) return;
    $('#sOk').disabled = true;
    configuracionEnCurso = true;
    probar(cfg).then(function(){
      if(!cfg.repoPrivado && !confirm('Este repositorio es público: cualquiera puede leer tu colección. ¿Continuar?')) throw new Error('Conexión cancelada');
      if(syncState === 'busy' || pullPromiseActual || pushPromiseActual) throw new Error('Espera a que termine la sincronización');
      clearTimeout(saveTimer); saveTimer = null;
      return crearPuntoRecuperacion('Antes de cambiar la conexión');
    }).then(function(){
      if(pullPromiseActual || pushPromiseActual) throw new Error('Espera a que termine la sincronización');
      var anterior = CFG;
      CFG = Object.assign({}, CFG, cfg);
      return guardarCfg().catch(function(e){ CFG = anterior; throw new Error('No se han podido guardar los ajustes'); });
    }).then(function(){
      configuracionEnCurso = false;
      SHA = ''; ultimaRevisionSubida = -1; revisionDatos++;
      readOnly = false;
      document.body.classList.remove('ro');
      s.remove();
      toast('Sincronización activada · ya puedes editar');
      renderAll();
      pull().then(function(ok){ if(ok && syncState !== 'ok') return push(); });
    }).catch(function(e){ configuracionEnCurso = false; if(configurado() && revisionDatos !== ultimaRevisionSubida) programarPush(); $('#sOk').disabled = false; $('#snote').innerHTML = '<div class="note err">' + esc(ocultarSecretos(e.message)) + '</div>'; });
  };
  $('#pDisc').onclick = function(e){ probarClave(probarDiscogs, $('#sDisc').value.trim(), e.currentTarget, $('#rDisc')); };
  $('#pAntropic').onclick = function(e){ probarClave(probarAnthropic, $('#sAntropic').value.trim(), e.currentTarget, $('#rAntropic')); };
  $('#pLastfm').onclick = function(e){ probarClave(probarLastfm, $('#sLastfm').value.trim(), e.currentTarget, $('#rLastfm')); };
  $('#pTM').onclick = function(e){ probarClave(probarTicketmaster, $('#sTM').value.trim(), e.currentTarget, $('#rTM')); };
  $('#pAudd').onclick = function(e){ probarClave(probarAudd, $('#sAudd').value.trim(), e.currentTarget, $('#rAudd')); };
  if($('#sOff')) $('#sOff').onclick = function(){
    if(configuracionEnCurso){ toast('Espera a que termine el cambio de ajustes', true); return; }
    if(!confirm('¿Desconectar este dispositivo? La colección se quedará solo aquí.')) return;
    if(pullPromiseActual || pushPromiseActual){ toast('Espera a que termine la sincronización', true); return; }
    clearTimeout(saveTimer); saveTimer = null;
    try{ localStorage.setItem(K_FALLOS, JSON.stringify(fallosGuardados())); }catch(e){}
    CFG = configSinClaves(CFG);
    CFG.recordarClaves = false;
    SHA = '';
    guardarCfg().catch(function(){ toast('No se pudieron borrar las claves guardadas. Revócalas en su proveedor.', true); });
    readOnly = true;
    document.body.classList.add('ro');
    marcar('local');
    s.remove();
    renderAll();
    toast('Desconectado');
  };
}


/* ============================================================
   6. MOTOR DE COMPLETADO AUTOMÁTICO
      Apple Music (iTunes Search) · MusicBrainz · Cover Art Archive
      APIs públicas, sin clave, con CORS.
   ============================================================ */
var IT = 'https://itunes.apple.com/';
var MB = 'https://musicbrainz.org/ws/2/';
var itNext = 0, mbNext = 0, dgNext = 0;
var artistNat = {}, artistMbid = {};
var cancelBulk = false;

function slot(kind, gap){
  var now = Date.now();
  var next = kind === 'it' ? itNext : (kind === 'dg' ? dgNext : mbNext);
  var wait = Math.max(0, next - now);
  var t = now + wait + gap;
  if(kind === 'it') itNext = t; else if(kind === 'dg') dgNext = t; else mbNext = t;
  return new Promise(function(r){ setTimeout(r, wait); });
}
function jget(url, kind, gap, retry){
  return slot(kind, gap).then(function(){ return fetch(url); }).then(function(r){
    if((r.status === 503 || r.status === 429) && (retry || 0) < 2){
      return new Promise(function(res){ setTimeout(res, 2600); }).then(function(){ return jget(url, kind, gap, (retry || 0) + 1); });
    }
    if(!r.ok) throw new Error('http' + r.status);
    return r.json();
  });
}
function itGet(path){ return jget(IT + path, 'it', 340); }
function mbGet(path){ return jget(MB + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'fmt=json', 'mb', 1150); }
function lucene(s){ return String(s || '').replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ').replace(/\s+/g, ' ').trim(); }
function msDur(ms){
  if(!ms) return '';
  var t = Math.round(ms / 1000);
  return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
}
function selloDeCopyright(c){
  if(!c) return '';
  var s = String(c).replace(/^[\u2117\u00a9\s]*\d{4}\s*/, '')
    .replace(/^the copyright in this sound recording is owned by\s*/i, '')
    .replace(/\s*under exclusive licen[sc]e.*$/i, '')
    .replace(/,?\s+(a|an)\s+[^,]*\b(company|group|label)\b\.?$/i, '')
    .replace(/\s*\/.*$/, '').replace(/[,;.\s]+$/, '').trim();
  return (s.length >= 2 && s.length <= 46) ? s : '';
}
function artBig(url, px){ return String(url || '').replace('100x100bb', (px || 600) + 'x' + (px || 600) + 'bb'); }

/* ---------- Apple Music ---------- */
function itCandidatos(titulo, artista, laxo){
  var term = ((artista ? artista + ' ' : '') + titulo).trim();
  return itGet('search?term=' + encodeURIComponent(term) + '&entity=album&limit=25&country=ES').then(function(j){
    var nt = plain(titulo), na = plain(artista);
    var extra = /deluxe|live|remaster|legacy|edition|edicion|version|tour|anniversar|directo|greatest|best of|coleccion|collection|karaoke|tribute|tributo|instrumental/;
    var quiereExtra = extra.test(String(titulo).toLowerCase());
    var cand = [];
    (j.results || []).forEach(function(c){
      var ct = plain(c.collectionName), ca = plain(c.artistName), s = 0, exacto = false;
      if(!ct) return;
      if(na){
        if(ca === na) s += 5;
        else if(ca.indexOf(na) >= 0 || na.indexOf(ca) >= 0) s += 3;
        else if(!laxo) return;
      }
      if(ct === nt){ s += 8; exacto = true; }
      else if(ct.indexOf(nt) === 0 && nt.length >= 4) s += 5;
      else if(nt && ct.indexOf(nt) >= 0 && nt.length >= 5) s += 2;
      else if(nt && nt.indexOf(ct) === 0 && ct.length >= 5) s += 2;
      else{
        /* nada literal: aceptamos el más parecido si se aproxima bastante */
        var par = similitud(ct, nt);
        if(par >= 0.62) s += Math.round(par * 6);
        else return;
      }
      if(!quiereExtra && !exacto && extra.test(String(c.collectionName).toLowerCase())) s -= 5;
      if((c.trackCount || 0) < 3) s -= 4;
      cand.push({c:c, s:s, exacto:exacto, d:String(c.releaseDate || '9999')});
    });
    cand.sort(function(a, b){ return (b.s - a.s) || a.d.localeCompare(b.d); });
    return cand;
  });
}
function itBuscar(titulo, artista, laxo){
  return itCandidatos(titulo, artista, laxo).then(function(cand){
    if(!cand.length) throw new Error('sin coincidencia');
    if(!laxo && cand[0].s < (artista ? 8 : 6)) throw new Error('coincidencia débil');
    return cand[0];
  });
}
function itTracks(id){
  return itGet('lookup?id=' + id + '&entity=song&limit=200&country=ES').then(function(j){
    return (j.results || []).filter(function(x){ return x.wrapperType === 'track' && x.trackName; })
      .sort(function(a, b){ return (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber); })
      .map(function(x){ return { titulo: x.trackName, duracion: msDur(x.trackTimeMillis), preview: x.previewUrl || '',
        disco: Number(x.discNumber) || 1 }; });
  }).catch(function(){ return []; });
}

/* ---------- MusicBrainz ---------- */
function mbArtistaId(nombre){
  var k = (nombre || '').trim().toLowerCase();
  if(!k) return Promise.resolve('');
  if(artistMbid[k] !== undefined) return Promise.resolve(artistMbid[k]);
  return mbGet('artist?query=' + encodeURIComponent('artist:"' + lucene(nombre) + '"') + '&limit=3').then(function(j){
    var a = (j.artists || [])[0];
    artistMbid[k] = a ? a.id : '';
    if(a) artistNat[k] = !!(a.country === 'ES' || (a.area && /spain|españa/i.test(a.area.name || '')));
    return artistMbid[k];
  }).catch(function(){ artistMbid[k] = ''; return ''; });
}
function esArtistaEspanol(artista, generoRaw){
  var k = (artista || '').trim().toLowerCase();
  if(!k) return Promise.resolve(false);
  if(artistNat[k] !== undefined) return Promise.resolve(artistNat[k]);
  var prev = DB.discos.filter(function(d){
    return (d.artista || '').trim().toLowerCase() === k && /Nacional|Internacional/.test(d.genero || '');
  })[0];
  if(prev){ artistNat[k] = /Nacional/.test(prev.genero); return Promise.resolve(artistNat[k]); }
  return mbGet('artist?query=' + encodeURIComponent('artist:"' + lucene(artista) + '"') + '&limit=3').then(function(j){
    var a = (j.artists || [])[0];
    var es = !!a && (a.country === 'ES'
      || (a.area && /spain|españa/i.test(a.area.name || ''))
      || (a['begin-area'] && /spain|españa/i.test(a['begin-area'].name || '')));
    artistNat[k] = es;
    if(a) artistMbid[k] = a.id;
    return es;
  }).catch(function(){
    var es = /español|espanol/i.test(generoRaw || '');
    artistNat[k] = es;
    return es;
  });
}
function mbDetalle(relId){
  return mbGet('release/' + relId + '?inc=recordings+labels+artist-credits+release-groups+genres').then(function(r){
    var rg = r['release-group'] || {};
    var lab = (r['label-info'] || [])[0] || {};
    var tracks = [], varias = (r.media || []).length > 1;
    (r.media || []).forEach(function(m, i){
      (m.tracks || []).forEach(function(t){
        var o = { titulo: t.title, duracion: msDur(t.length || (t.recording && t.recording.length)), preview: '' };
        if(varias) o.disco = i + 1;
        if(t.number && /^[A-Z]\d*$/i.test(String(t.number))) o.pos = t.number;
        tracks.push(o);
      });
    });
    var fmt = '';
    if(r.media && r.media.length){
      var f = (r.media[0].format) || '';
      fmt = (r.media.length > 1 ? r.media.length + 'x' : '') + (f || '');
    }
    var year = String(r.date || rg['first-release-date'] || '').slice(0, 4);
    var orig = String(rg['first-release-date'] || '').slice(0, 4);
    return {
      id: r.id, rgId: rg.id, tracklist: tracks,
      titulo: r.title || '',
      artista: (r['artist-credit'] || []).map(function(c){ return c.name + (c.joinphrase || ''); }).join(''),
      'año': /^\d{4}$/.test(year) ? year : '',
      anioOriginal: /^\d{4}$/.test(orig) ? orig : '',
      sello: (lab.label && lab.label.name) || '',
      numeroCatalogo: lab['catalog-number'] || '',
      pais: (r.country && r.country !== 'XW' && r.country !== 'XE') ? r.country : '',
      formatoDetalle: fmt,
      codigoBarras: r.barcode || '',
      tags: ((r.genres || []).concat(rg.genres || [])).map(function(g){ return g.name; }).join(' '),
      sec: (rg['secondary-types'] || []).join(' ')
    };
  });
}
function mbBuscarReleases(titulo, artista, formato, limite){
  var q = 'release:"' + lucene(titulo) + '"';
  if(artista) q += ' AND artist:"' + lucene(artista) + '"';
  return mbGet('release?query=' + encodeURIComponent(q) + '&limit=' + (limite || 15)).then(function(res){
    var rel = (res.releases || []).filter(function(r){ return (r.score || 0) >= 65; });
    var wantCD = formato === 'CD';
    rel.sort(function(a, b){
      var fa = ((a.media && a.media[0] && a.media[0].format) || '').toLowerCase();
      var fb = ((b.media && b.media[0] && b.media[0].format) || '').toLowerCase();
      var ma = (wantCD ? fa.indexOf('cd') >= 0 : fa.indexOf('vinyl') >= 0) ? 1 : 0;
      var mb2 = (wantCD ? fb.indexOf('cd') >= 0 : fb.indexOf('vinyl') >= 0) ? 1 : 0;
      if(ma !== mb2) return mb2 - ma;
      if((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return String(a.date || '9999').localeCompare(String(b.date || '9999'));
    });
    return rel;
  });
}
function mbRelease(titulo, artista, formato){
  return mbBuscarReleases(titulo, artista, formato, 15).then(function(rel){
    if(!rel.length) throw new Error('sin resultados');
    return mbDetalle(rel[0].id);
  });
}
function headStatus(url){
  return fetch(url, {method:'HEAD'}).then(function(r){ return r.ok ? 1 : 0; }).catch(function(){ return 2; });
}
function coverArchive(relId, rgId, px){
  var t = px || 500;
  if(!relId && !rgId) return Promise.resolve('');
  var u = 'https://coverartarchive.org/release/' + relId + '/front-' + t;
  return headStatus(u).then(function(st){
    if(st === 1 || st === 2) return u;
    if(!rgId) return '';
    var v = 'https://coverartarchive.org/release-group/' + rgId + '/front-' + t;
    return headStatus(v).then(function(s2){ return s2 === 1 ? v : ''; });
  }).catch(function(){ return ''; });
}

/* ---------- foto del disco físico (Cover Art Archive, tipo "Medium") ---------- */
/* Cover Art Archive a veces devuelve sus propias URLs en http:// aunque el
   mismo dominio funciona igual de bien en https://; como la app se sirve en
   https, esas imágenes podían no cargar. Se sube el esquema aquí, en el único
   sitio por el que pasa esta fuente. */
function aHttps(url){ return String(url || '').replace(/^http:\/\//, 'https://'); }
function fotoDelSoporte(relId, rgId){
  var mira = function(id, tipo){
    return jget('https://coverartarchive.org/' + tipo + '/' + id, 'mb', 900).then(function(j){
      var imgs = (j.images || []).filter(function(im){
        return (im.types || []).indexOf('Medium') >= 0;
      });
      if(!imgs.length) throw new Error('sin medium');
      var im = imgs[0];
      return aHttps((im.thumbnails && (im.thumbnails['500'] || im.thumbnails.large)) || im.image);
    });
  };
  if(!relId && !rgId) return Promise.reject(new Error('sin id'));
  return mira(relId, 'release').catch(function(){
    if(!rgId) throw new Error('no');
    return mira(rgId, 'release-group');
  });
}
/* Todas las imágenes de la edición en Discogs, para elegir a mano */
function imagenesDiscogs(d){
  if(!hayDiscogs()) return Promise.reject(new Error('sin token'));
  var m = String(d.discogs || '').match(/release\/(\d+)/);
  var busca = m ? dgGet('releases/' + m[1])
    : dgGet('database/search?type=release&per_page=3&q='
        + encodeURIComponent((d.artista || '') + ' ' + (d.titulo || ''))).then(function(j){
        var r = (j.results || [])[0];
        if(!r) throw new Error('no');
        return dgGet('releases/' + r.id);
      });
  return busca.then(function(r){
    var im = (r.images || []).map(function(x){ return {uri: aHttps(x.uri), mini: aHttps(x.uri150), tipo:x.type}; });
    if(!im.length) throw new Error('sin imágenes');
    return im;
  });
}

/* ---------- clasificación de género ---------- */
var CATS = [
  ['BSO', ['soundtrack','banda sonora','bandas sonoras','musica original','música original','stage & screen','original score','film score']],
  ['Flamenco', ['flamenco','rumba','copla','sevillanas']],
  ['Heavy / Metal', ['metal','thrash','doom','speed metal','metalcore']],
  ['Grunge', ['grunge']],
  ['Punk / Hardcore', ['punk','hardcore','oi!']],
  ['Hip Hop / Rap', ['hip-hop','hip hop','rap','trap']],
  ['R&B / Soul', ['r&b','soul','motown','rhythm and blues']],
  ['Funk / Disco', ['funk','disco']],
  ['New Wave / Synth Pop', ['new wave','synth-pop','synthpop','synth pop','new romantic','darkwave','minimal wave']],
  ['Electrónica / Dance', ['electronic','electrónica','electronica','techno','house','trance','ambient','dance','edm','downtempo','big beat','breakbeat','idm']],
  ['Jazz', ['jazz','bebop','swing','big band']],
  ['Blues', ['blues','rhythm & blues']],
  ['Reggae / Ska', ['reggae','ska','rocksteady','dub']],
  ['Country', ['country','bluegrass','americana','honky']],
  ['Clásica', ['classical','clásica','clasica','ópera','opera','barroc','sinfón','sinfon','chamber','crossover clásico']],
  ['Folk / Cantautor', ['folk','cantautor','singer/songwriter','singer-songwriter','canción de autor']],
  ['Rock', ['rock','psychedelic','garage','britpop','stoner']],
  ['Latina', ['latin','salsa','cumbia','bolero','ranchera','bachata','reguet','reggaet','merengue','tango']],
  ['Indie / Alternativo', ['indie','alternativ']],
  ['Pop', ['pop']]
];
function cuenta(t, kw){
  var n = 0, i = t.indexOf(kw);
  while(i >= 0){ n++; i = t.indexOf(kw, i + kw.length); }
  return n;
}
function clasificar(texto, esES, artista){
  var t = ' ' + String(texto || '').toLowerCase().replace(/[\/,;|]/g, ' ') + ' ';
  var a = String(artista || '').toLowerCase();
  if(/various artists|varios artistas|v\.a\.|artistas varios/.test(a)) return 'Recopilatorios / Varios';
  var mejor = '', punt = 0;
  CATS.forEach(function(cat){
    var s = 0;
    cat[1].forEach(function(kw){ s += cuenta(t, kw); });
    if(s > punt){ punt = s; mejor = cat[0]; }
  });
  if(!mejor) return '';
  if(mejor === 'Rock') return esES ? 'Rock Nacional' : 'Rock Internacional';
  if(mejor === 'Pop') return esES ? 'Pop Nacional' : 'Pop Internacional';
  if(mejor === 'Latina' && esES) return 'Pop Nacional';
  return mejor;
}
function clasificarMixto(appleGenero, mbTags, esES, artista){
  var t = ' ' + [appleGenero, appleGenero, appleGenero, mbTags].filter(Boolean).join(' ') + ' ';
  return clasificar(t, esES, artista);
}
function necesitaNacionalidad(g){ return g === 'Rock' || g === 'Pop' || /^(Rock|Pop) /.test(g) || g === 'Latina'; }

/* ---------- orquestador ---------- */
function fetchInfo(titulo, artista, formato, faltan){
  faltan = faltan || {};
  var out = null, conf = 'alta';
  return itBuscar(titulo, artista).then(function(hit){
    var al = hit.c;
    if(!hit.exacto) conf = 'baja';
    var year = String(al.releaseDate || '').slice(0, 4);
    out = {
      portada: artBig(al.artworkUrl100, 600),
      'año': /^\d{4}$/.test(year) ? year : '',
      sello: selloDeCopyright(al.copyright),
      generoRaw: al.primaryGenreName || '',
      artistaReal: al.artistName || artista,
      tituloReal: al.collectionName || titulo,
      appleUrl: al.collectionViewUrl || '',
      tracklist: [], numeroCatalogo: '', pais: '', formatoDetalle: '', notas: '', mbid: '', rgid: '', codigoBarras: ''
    };
    return itTracks(al.collectionId);
  }).then(function(tr){
    out.tracklist = tr;
    var pre = clasificar(out.generoRaw, false, out.artistaReal || artista);
    if(!necesitaNacionalidad(pre)) return pre;
    return esArtistaEspanol(out.artistaReal || artista, out.generoRaw).then(function(esES){
      return clasificar(out.generoRaw, esES, out.artistaReal || artista);
    });
  }).then(function(gen){
    out.genero = gen;
    var necesitaMB = (faltan.sello && !out.sello) || faltan.catalogo || faltan.pais || faltan.formato
      || faltan['año'] || !out.tracklist.length || !out.genero;
    if(!necesitaMB) return out;
    return mbRelease(titulo, artista, formato).then(function(mb){
      out.mbid = mb.id; out.rgid = mb.rgId;
      if(!out.sello) out.sello = mb.sello;
      if(!out.numeroCatalogo) out.numeroCatalogo = mb.numeroCatalogo;
      if(!out.pais) out.pais = mb.pais;
      if(!out.formatoDetalle) out.formatoDetalle = mb.formatoDetalle;
      if(!out.codigoBarras) out.codigoBarras = mb.codigoBarras;
      var cand = mb.anioOriginal || mb['año'];
      if(!out['año']) out['año'] = cand;
      else if(cand && parseInt(cand) < parseInt(out['año'])) out['año'] = cand;
      if(!out.tracklist.length) out.tracklist = mb.tracklist;
      var texto = mb.tags + ' ' + mb.sec;
      var pre2 = clasificarMixto(out.generoRaw, texto, false, artista);
      if(!necesitaNacionalidad(pre2)){ if(pre2) out.genero = pre2; return out; }
      return esArtistaEspanol(artista, out.generoRaw + ' ' + texto).then(function(esES){
        var g2 = clasificarMixto(out.generoRaw, texto, esES, artista);
        if(g2) out.genero = g2;
        return out;
      });
    }).catch(function(){ return out; });
  }).then(function(r){ r.confianza = conf; return r; })
  .catch(function(){
    var res = null;
    return mbRelease(titulo, artista, formato).then(function(mb){
      res = mb;
      var texto = mb.tags + ' ' + mb.sec;
      var pre = clasificar(texto, false, artista);
      if(!necesitaNacionalidad(pre)) return pre;
      return esArtistaEspanol(artista, texto).then(function(esES){ return clasificar(texto, esES, artista); });
    }).then(function(gen){
      return coverArchive(res.id, res.rgId).then(function(cov){
        return {
          portada: cov, tracklist: res.tracklist, 'año': res.anioOriginal || res['año'], sello: res.sello,
          numeroCatalogo: res.numeroCatalogo, pais: res.pais, formatoDetalle: res.formatoDetalle,
          codigoBarras: res.codigoBarras, mbid: res.id, rgid: res.rgId, genero: gen, notas: '',
          confianza: plain(res.titulo) === plain(titulo) ? 'alta' : 'baja'
        };
      });
    });
  }).catch(function(){
    /* último intento: el disco que más se parezca, aunque el título no sea idéntico */
    return itBuscar(titulo, artista, true).then(function(hit){
      var al = hit.c;
      var year = String(al.releaseDate || '').slice(0, 4);
      return itTracks(al.collectionId).then(function(tr){
        var g = clasificar(al.primaryGenreName || '', false, al.artistName);
        return {
          portada: artBig(al.artworkUrl100, 600), 'año': /^\d{4}$/.test(year) ? year : '',
          sello: selloDeCopyright(al.copyright), tracklist: tr, genero: g,
          numeroCatalogo:'', pais:'', formatoDetalle:'', notas:'', mbid:'', rgid:'', codigoBarras:'',
          tituloReal: al.collectionName, artistaReal: al.artistName, confianza:'baja'
        };
      });
    });
  }).catch(function(){ return askAI(titulo, artista, formato, ''); });
}

/* Campos que rellenan automáticamente Apple Music, MusicBrainz y Discogs.
   Si el usuario ha corregido alguno a mano, «Completar» no debe volver a pisarlo. */
var CAMPOS_AUTO = ['año', 'sello', 'numeroCatalogo', 'pais', 'formatoDetalle', 'genero',
  'portada', 'tracklist', 'titulo', 'artista', 'codigoBarras'];
function protegido(d, campo){ return !!(d.editado && d.editado[campo]); }
/* Al traer una lista de canciones nueva, se conservan los corazones de
   favorita que ya tenías puestos, emparejando por título -no por
   posición, que puede cambiar si aparece o desaparece una pista extra. */
function conservarFavoritas(nuevas, viejas){
  if(!viejas || !viejas.length) return nuevas;
  var favPorTitulo = {};
  viejas.forEach(function(t){ if(t.fav) favPorTitulo[plain(t.titulo)] = true; });
  if(!Object.keys(favPorTitulo).length) return nuevas;
  return nuevas.map(function(t){
    if(favPorTitulo[plain(t.titulo)]) return Object.assign({}, t, {fav: true});
    return t;
  });
}
function aplicar(d, r, force){
  if(!r) return false;
  var cambios = false;
  if(r.portada && !protegido(d, 'portada') && (force || !d.portada)){ d.portada = r.portada; d.color = ''; cambios = true; }
  if(r.tracklist && r.tracklist.length && !protegido(d, 'tracklist') && (force || d.tracklist.length === 0)){
    d.tracklist = conservarFavoritas(normTracks(r.tracklist), d.tracklist); cambios = true;
  }
  ['año','sello','numeroCatalogo','pais','formatoDetalle','genero','mbid','rgid','codigoBarras','appleUrl'].forEach(function(f){
    if(protegido(d, f)) return;
    if(r[f] && (force || !d[f])){ d[f] = r[f]; cambios = true; }
  });
  if(r.notas && !d.notas){ d.notas = r.notas; cambios = true; }
  if(cambios){ d.confianza = r.confianza === 'baja' ? 'baja' : ''; refrescarFaltan(d); }
  return cambios;
}
function enrich(id, force){
  var d = DB.discos.filter(function(x){ return x.id === id; })[0];
  if(!d || (!d.titulo && !d.artista)) return Promise.resolve(false);
  if(d.mbid && !force) return porMbid(d, d.mbid, false);
  var faltan = { sello: !d.sello, catalogo: !d.numeroCatalogo, pais: !d.pais, formato: !d.formatoDetalle, 'año': !d['año'] };
  return fetchInfo(d.titulo, d.artista, d.formato, faltan).then(function(r){
    var c = aplicar(d, r, force);
    if(c) persist();
    return c;
  }).catch(function(){ return false; });
}

/* ---------- edición concreta por identificador ---------- */
function idDesdeUrl(url){
  var s = String(url || '').trim();
  var m = s.match(/musicbrainz\.org\/release\/([0-9a-f\-]{36})/i);
  if(m) return {tipo:'release', id:m[1]};
  m = s.match(/musicbrainz\.org\/release-group\/([0-9a-f\-]{36})/i);
  if(m) return {tipo:'rg', id:m[1]};
  m = s.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if(m) return {tipo:'release', id:m[1]};
  m = s.match(/discogs\.com\/(?:[a-z]{2}\/)?release\/(\d+)/i);
  if(m) return {tipo:'discogs', id:m[1], url:s};
  return null;
}
function porMbid(d, relId, force){
  return mbDetalle(relId).then(function(mb){
    return coverArchive(mb.id, mb.rgId).then(function(cov){
      var texto = mb.tags + ' ' + mb.sec;
      var pre = clasificar(texto, false, d.artista);
      var seguir = function(gen){
        var r = {
          portada: cov || '', tracklist: mb.tracklist, 'año': mb.anioOriginal || mb['año'], sello: mb.sello,
          numeroCatalogo: mb.numeroCatalogo, pais: mb.pais, formatoDetalle: mb.formatoDetalle,
          codigoBarras: mb.codigoBarras, mbid: mb.id, rgid: mb.rgId, genero: gen, confianza: 'alta'
        };
        var c = aplicar(d, r, force);
        d.mbid = mb.id; d.rgid = mb.rgId; d.confianza = '';
        persist();
        return true;
      };
      if(!necesitaNacionalidad(pre)) return seguir(pre);
      return esArtistaEspanol(d.artista, texto).then(function(es){ return seguir(clasificar(texto, es, d.artista)); });
    });
  });
}
function porUrl(d, url, formato){
  var ref = idDesdeUrl(url);
  if(!ref) return Promise.reject(new Error('url'));
  if(ref.tipo === 'release') return porMbid(d, ref.id, true);
  if(ref.tipo === 'rg'){
    return mbGet('release?release-group=' + ref.id + '&inc=media&limit=50').then(function(j){
      var rel = j.releases || [];
      var quiereCD = (formato || d.formato) === 'CD';
      rel.sort(function(a, b){
        var fa = ((a.media && a.media[0] && a.media[0].format) || '').toLowerCase();
        var fb = ((b.media && b.media[0] && b.media[0].format) || '').toLowerCase();
        var ma = (quiereCD ? fa.indexOf('cd') >= 0 : fa.indexOf('vinyl') >= 0) ? 1 : 0;
        var mb2 = (quiereCD ? fb.indexOf('cd') >= 0 : fb.indexOf('vinyl') >= 0) ? 1 : 0;
        if(ma !== mb2) return mb2 - ma;
        return String(a.date || '9999').localeCompare(String(b.date || '9999'));
      });
      if(!rel.length) throw new Error('vacío');
      return porMbid(d, rel[0].id, true);
    });
  }
  d.discogs = ref.url;
  return fetchInfo(d.titulo, d.artista, d.formato, {sello:true, catalogo:true, pais:true, formato:true, 'año':true})
    .then(function(r){ aplicar(d, r, true); persist(); return true; });
}

/* ---------- candidatos de edición ---------- */
function candidatos(titulo, artista, formato){
  var out = [];
  return itCandidatos(titulo, artista).then(function(cs){
    cs.slice(0, 6).forEach(function(x){
      out.push({
        origen:'apple', id:x.c.collectionId, titulo:x.c.collectionName, artista:x.c.artistName,
        'año':String(x.c.releaseDate || '').slice(0, 4), portada:artBig(x.c.artworkUrl100, 200),
        detalle:(x.c.trackCount || '?') + ' temas · Apple Music'
      });
    });
  }).catch(function(){}).then(function(){
    return mbBuscarReleases(titulo, artista, formato, 10).catch(function(){ return []; });
  }).then(function(rel){
    rel.slice(0, 8).forEach(function(r){
      var fmt = (r.media && r.media[0] && r.media[0].format) || '';
      out.push({
        origen:'mb', id:r.id, titulo:r.title,
        artista:(r['artist-credit'] || []).map(function(c){ return c.name; }).join(', '),
        'año':String(r.date || '').slice(0, 4),
        portada:'https://coverartarchive.org/release/' + r.id + '/front-250',
        detalle:[fmt, r.country, (r['label-info'] && r['label-info'][0] && r['label-info'][0].label && r['label-info'][0].label.name)].filter(Boolean).join(' · ') || 'MusicBrainz'
      });
    });
    return out;
  });
}
function aplicarCandidato(d, cand){
  if(cand.origen === 'mb') return porMbid(d, cand.id, true);
  return itTracks(cand.id).then(function(tr){
    d.portada = artBig(String(cand.portada).replace('200x200bb', '100x100bb'), 600);
    if(tr.length) d.tracklist = conservarFavoritas(tr, d.tracklist);
    if(cand['año']) d['año'] = cand['año'];
    d.confianza = '';
    d.color = '';
    refrescarFaltan(d);
    persist();
    return true;
  });
}

/* ---------- Discogs (opcional, con token propio) ---------- */
function hayDiscogs(){ return !!(CFG && CFG.discogs); }
function hayAnthropic(){ return !!(CFG && CFG.anthropic); }
function hayLastfm(){ return !!(CFG && CFG.lastfm); }
function hayTicketmaster(){ return !!(CFG && CFG.ticketmaster); }
function hayAudd(){ return !!(CFG && CFG.audd); }

/* ============================================================
   ¿QUÉ ESTÁ SONANDO? (identificación por micrófono, AudD)
   ============================================================ */
function queEstaSonando(){
  if(!hayAudd()){ toast('Configura antes tu clave de AudD en Ajustes', true); return; }
  var s = sheet('¿Qué está sonando?',
    '<div style="text-align:center;padding:20px 10px">'
    + '<div id="qsIco" style="width:90px;height:90px;border-radius:50%;background:var(--blue-s);color:var(--blue);'
    + 'display:flex;align-items:center;justify-content:center;margin:0 auto 18px">' + I.aguja + '</div>'
    + '<div id="qsNota" style="font-size:15px;color:var(--txt2)">Pulsa grabar y acerca el móvil a la música, unos 7 segundos.</div>'
    + '</div>', '<span></span><button type="button" class="btn pri" id="qsGo">Grabar</button>', true);
  var ico = s.querySelector('#qsIco'), nota = s.querySelector('#qsNota');
  /* Limpieza de mic/pistas/temporizador ante CUALQUIER forma de cerrar la hoja
     -el botón, Escape, tocar fuera, deslizar-, no solo cuando termina sola:
     un MutationObserver detecta que la hoja salió del DOM sea cual sea el motivo. */
  var streamActivo = null, timerAuto = null, mrActivo = null, limpiado = false;
  var limpiar = function(){
    if(limpiado) return; limpiado = true;
    if(timerAuto){ clearTimeout(timerAuto); timerAuto = null; }
    if(mrActivo && mrActivo.state !== 'inactive'){ try{ mrActivo.stop(); }catch(e){} }
    if(streamActivo){ streamActivo.getTracks().forEach(function(t){ t.stop(); }); streamActivo = null; }
  };
  var obsCierre = new MutationObserver(function(){
    if(!document.body.contains(s)){ limpiar(); obsCierre.disconnect(); }
  });
  obsCierre.observe(document.body, {childList: true});
  s.querySelector('#qsGo').onclick = function(e){
    var boton = e.currentTarget;
    boton.disabled = true;
    navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream){
      streamActivo = stream;
      ico.style.background = 'rgba(255,59,48,.15)'; ico.style.color = 'var(--red)';
      nota.textContent = 'Grabando… no lo cierres';
      var chunks = [];
      var mr;
      /* Se pide expresamente un formato soportado en vez de dejar que el
         navegador elija a ciegas: Chrome/Android graban webm/opus, Safari/
         iPhone solo sabe grabar mp4 (no soporta webm) -si se le pide un tipo
         que no soporta, new MediaRecorder(stream, {mimeType}) lanza excepción,
         así que se prueban los candidatos en orden y solo se pasa "mimeType" al
         constructor cuando alguno es compatible. */
      var candidatosMime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      var mimeElegido = (window.MediaRecorder && MediaRecorder.isTypeSupported)
        ? candidatosMime.filter(function(m){ return MediaRecorder.isTypeSupported(m); })[0] : null;
      try{ mr = mimeElegido ? new MediaRecorder(stream, {mimeType: mimeElegido}) : new MediaRecorder(stream); }
      catch(errRec){ limpiar(); nota.textContent = 'Este navegador no puede grabar audio.'; boton.disabled = false; return; }
      mrActivo = mr;
      mr.ondataavailable = function(e2){ if(e2.data.size) chunks.push(e2.data); };
      mr.onstop = function(){
        streamActivo = null;
        stream.getTracks().forEach(function(t){ t.stop(); });
        nota.textContent = 'Reconociendo…';
        /* El tipo real lo decide el navegador (Chrome/Android graban webm,
           Safari/iOS graban mp4): el nombre de archivo tiene que llevar la
           extensión que corresponde a ese tipo, nunca ".webm" fijo, o AudD
           puede fallar al identificar el formato en Safari. */
        var tipo = mr.mimeType || 'audio/webm';
        var ext = /mp4|m4a/i.test(tipo) ? 'm4a' : /ogg/i.test(tipo) ? 'ogg' : /wav/i.test(tipo) ? 'wav' : 'webm';
        var blob = new Blob(chunks, {type: tipo});
        var fd = new FormData();
        fd.append('api_token', CFG.audd);
        fd.append('file', blob, 'audio.' + ext);
        fd.append('return', 'apple_music');
        fetch('https://api.audd.io/', {method: 'POST', body: fd})
          .then(function(r){ return r.json(); })
          .then(function(j){
            var r = j.result;
            if(!r){ nota.textContent = 'No se ha reconocido nada. Prueba con más volumen y menos ruido de fondo.'; boton.disabled = false; return; }
            var propio = coleccion().filter(function(d){
              return plain(d.artista) === plain(r.artist) && (plain(d.titulo) === plain(r.album) || similitud(d.titulo, r.album) >= .7);
            })[0];
            var cuerpo = s.querySelector('div[style*="text-align:center"]');
            cuerpo.innerHTML = '<div style="font-size:13px;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;font-weight:700">Reconocido</div>'
              + '<div style="font-size:19px;font-weight:650;margin-top:6px">' + esc(r.title) + '</div>'
              + '<div style="font-size:15px;color:var(--blue);margin-top:2px">' + esc(r.artist) + '</div>'
              + (r.album ? '<div style="font-size:13.5px;color:var(--txt2);margin-top:2px">' + esc(r.album) + '</div>' : '')
              + '<div class="rowb" style="justify-content:center;margin-top:18px">'
              + (propio
                ? '<button type="button" class="btn pri" id="qsVer">' + I.check + 'Ya lo tienes · ver ficha</button>'
                : '<button type="button" class="btn" id="qsDeseo">' + I.lampara + 'Añadir a deseos</button>')
              + '</div>';
            var bv = cuerpo.querySelector('#qsVer');
            if(bv) bv.onclick = function(){ s.remove(); openDetail(propio.id); };
            var bd = cuerpo.querySelector('#qsDeseo');
            if(bd) bd.onclick = function(){
              DB.discos.push(normDisc({id: uid(), lista: 'deseos', artista: r.artist, titulo: r.album || r.title, fechaAlta: nowISO()}));
              persist();
              s.remove();
              toast('Añadido a deseos');
            };
          }).catch(function(){
            nota.textContent = 'No se pudo consultar AudD. Comprueba tu clave y tu conexión.';
            boton.disabled = false;
          });
      };
      mr.start();
      timerAuto = setTimeout(function(){ if(mr.state === 'recording') mr.stop(); }, 7000);
    }).catch(function(){
      nota.textContent = 'No se pudo usar el micrófono.';
      boton.disabled = false;
    });
  };
}

function datosDelAno(){
  var ds = coleccion();
  var anio = String(new Date().getFullYear());
  var nuevos = ds.filter(function(d){ return (d.fechaAlta || '').slice(0, 4) === anio; });
  var escuchasAno = [];
  ds.forEach(function(d){
    (d.escuchasFechas || []).forEach(function(f){ if(f.slice(0, 4) === anio) escuchasAno.push({d:d, f:f}); });
  });
  var porArtista = {};
  escuchasAno.forEach(function(x){ porArtista[x.d.artista] = (porArtista[x.d.artista] || 0) + 1; });
  var topArtista = Object.keys(porArtista).sort(function(a, b){ return porArtista[b] - porArtista[a]; })[0];
  var porDisco = {};
  escuchasAno.forEach(function(x){ porDisco[x.d.id] = (porDisco[x.d.id] || 0) + 1; });
  var topDiscoId = Object.keys(porDisco).sort(function(a, b){ return porDisco[b] - porDisco[a]; })[0];
  var topDisco = topDiscoId ? DB.discos.filter(function(x){ return x.id === topDiscoId; })[0] : null;
  var a = horasAguja ? horasAguja() : {horas: 0};
  return {
    anio: anio, total: ds.length, nuevos: nuevos.length,
    escuchas: escuchasAno.length, topArtista: topArtista, topArtistaN: porArtista[topArtista] || 0,
    topDisco: topDisco, topDiscoN: topDisco ? porDisco[topDisco.id] : 0, horasAguja: a.horas
  };
}
function tuAnoEnUnVistazo(){
  var d = datosDelAno();
  var slides = [
    {t: 'Tu ' + d.anio, s: 'en Discoteca', v: d.total, k: 'discos en tu colección', c: '#0071e3,#5ac8fa'},
    {t: 'Este año entraron', s: '', v: d.nuevos, k: d.nuevos === 1 ? 'disco nuevo' : 'discos nuevos', c: '#34c759,#30d158'},
    {t: 'Has escuchado', s: '', v: d.escuchas, k: d.escuchas === 1 ? 'vez' : 'veces', c: '#ff9500,#ffcc00'},
    {t: 'Tu artista', s: 'de este año', v: d.topArtista || '—', k: d.topArtistaN ? d.topArtistaN + ' escuchas' : '', c: '#af52de,#ff2d55', texto: true},
    {t: 'Tu disco', s: 'más puesto', v: d.topDisco ? d.topDisco.titulo : '—', k: d.topDisco ? esc(d.topDisco.artista) : '', c: '#ff3b30,#ff9500', texto: true, img: d.topDisco && d.topDisco.portada},
    {t: 'Horas de aguja', s: 'este año y siempre', v: Math.round(d.horasAguja), k: 'horas de vinilo', c: '#5856d6,#af52de'}
  ].filter(function(sl){ return sl.v !== 0 && sl.v !== '—'; });
  if(!slides.length){ toast('Aún no hay datos suficientes este año', true); return; }
  var i = 0;
  var wrap = document.createElement('div');
  wrap.className = 'anowrap';
  document.body.appendChild(wrap);
  var pinta = function(){
    var sl = slides[i];
    var grad = sl.c.split(',');
    wrap.innerHTML = '<div class="anoslide" style="background:linear-gradient(150deg,' + grad[0] + ',' + grad[1] + ')">'
      + '<button type="button" class="anox" id="anoX" aria-label="Cerrar">' + I.x + '</button>'
      + (sl.img ? '<img class="anoimg" src="' + esc(sl.img) + '" alt="" data-img-error="remove">' : '')
      + '<div class="anok">' + esc(sl.t) + (sl.s ? ' <span>' + esc(sl.s) + '</span>' : '') + '</div>'
      + '<div class="anov' + (sl.texto ? ' txt' : '') + '">' + (sl.texto ? esc(String(sl.v)) : sl.v) + '</div>'
      + (sl.k ? '<div class="anom">' + esc(sl.k) + '</div>' : '')
      + '<div class="anodots">' + slides.map(function(_, j){ return '<i class="' + (j === i ? 'on' : '') + '"></i>'; }).join('') + '</div>'
      + '<div class="anonav"><button type="button" id="anoPrev">‹</button><button type="button" id="anoNext">' + (i === slides.length - 1 ? 'Compartir' : '›') + '</button></div>'
      + '</div>';
    wrap.querySelector('#anoX').onclick = function(){ wrap.remove(); };
    wrap.querySelector('#anoPrev').onclick = function(){ if(i > 0){ i--; pinta(); } };
    wrap.querySelector('#anoNext').onclick = function(){
      if(i < slides.length - 1){ i++; pinta(); return; }
      compartirSlide(sl, grad);
    };
  };
  pinta();
}
function compartirSlide(sl, grad){
  var W = 1080, H = 1350;
  var c = document.createElement('canvas'); c.width = W; c.height = H;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, grad[0]); g.addColorStop(1, grad[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = '600 40px -apple-system, Helvetica, Arial';
  x.fillText(sl.t + (sl.s ? ' ' + sl.s : ''), W / 2, 420);
  x.font = sl.texto ? '700 62px -apple-system, Helvetica, Arial' : '700 150px -apple-system, Helvetica, Arial';
  var texto = String(sl.v);
  if(sl.texto && texto.length > 22) texto = texto.slice(0, 20) + '…';
  x.fillText(texto, W / 2, 620);
  if(sl.k){ x.font = '500 36px -apple-system, Helvetica, Arial'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(sl.k, W / 2, 690); }
  x.font = '600 30px -apple-system, Helvetica, Arial'; x.fillStyle = 'rgba(255,255,255,.7)';
  x.fillText('Discoteca', W / 2, H - 80);
  c.toBlob(function(blob){
    if(!blob) return;
    var file = new File([blob], 'mi-ano.png', {type: 'image/png'});
    if(navigator.canShare && navigator.canShare({files: [file]})) navigator.share({files: [file]}).catch(function(){});
    else{ download('mi-ano-en-discoteca.png', blob); toast('Imagen descargada'); }
  }, 'image/png');
}


/* ============================================================
   CONCIERTOS CERCA DE TI (Ticketmaster Discovery API)
   ============================================================ */
function tmBuscarArtista(nombre, lat, lon){
  var u = 'https://app.ticketmaster.com/discovery/v2/events.json?apikey=' + encodeURIComponent(CFG.ticketmaster)
    + '&keyword=' + encodeURIComponent(nombre) + '&classificationName=music&size=5&sort=date,asc';
  if(lat != null) u += '&latlong=' + lat + ',' + lon + '&radius=150&unit=km';
  return fetch(u).then(function(r){
    if(!r.ok) throw new Error('http' + r.status);
    return r.json();
  }).then(function(j){
    var eventos = (j._embedded && j._embedded.events) || [];
    /* Ticketmaster no filtra por artista exacto: nos quedamos con los que
       de verdad mencionan a este artista en el cartel. */
    return eventos.filter(function(ev){
      var artistas = ((ev._embedded && ev._embedded.attractions) || []).map(function(a){ return plain(a.name); });
      return artistas.indexOf(plain(nombre)) >= 0;
    }).map(function(ev){
      var venue = ((ev._embedded && ev._embedded.venues) || [])[0] || {};
      return {
        artista: nombre, nombre: ev.name,
        fecha: ev.dates && ev.dates.start && ev.dates.start.localDate,
        ciudad: venue.city && venue.city.name, sala: venue.name,
        url: ev.url
      };
    });
  }).catch(function(){ return []; });
}
async function conciertosCerca(){
  if(!hayTicketmaster()){ toast('Configura antes tu clave de Ticketmaster en Ajustes', true); return; }
  var m = {};
  coleccion().forEach(function(d){ if(d.artista) m[d.artista] = (m[d.artista] || 0) + 1; });
  var artistas = Object.keys(m).sort(function(a, b){ return m[b] - m[a]; }).slice(0, 25);
  var s = sheet('Conciertos cerca de ti',
    '<div class="warnb info">' + I.info + '<span>Se comprueban tus ' + artistas.length
    + ' artistas con más discos. Puede tardar medio minuto.</span></div>'
    + '<div class="note busy" id="cnote">Pidiendo tu ubicación…</div><div id="cres"></div>', null, true);
  var lat = null, lon = null;
  try{
    var pos = await new Promise(function(res, rej){
      if(!navigator.geolocation) return rej(new Error('sin geolocalización'));
      navigator.geolocation.getCurrentPosition(res, rej, {timeout: 6000});
    });
    lat = pos.coords.latitude; lon = pos.coords.longitude;
  }catch(e){ /* seguimos sin ubicación: Ticketmaster también acepta buscar solo por nombre */ }
  var nota = s.querySelector('#cnote');
  var out = [];
  for(var i = 0; i < artistas.length; i++){
    nota.textContent = 'Comprobando ' + artistas[i] + '… (' + (i + 1) + '/' + artistas.length + ')';
    var eventos = await tmBuscarArtista(artistas[i], lat, lon);
    out = out.concat(eventos);
    await new Promise(function(r){ setTimeout(r, 120); });
  }
  nota.style.display = 'none';
  var caja = s.querySelector('#cres');
  if(!out.length){
    caja.innerHTML = '<div class="tl-empty">' + (lat != null
      ? 'Ninguno de tus artistas tiene conciertos anunciados cerca en los próximos meses.'
      : 'Ninguno tiene conciertos anunciados. No se pudo usar tu ubicación, así que la búsqueda ha sido más amplia.') + '</div>';
    return;
  }
  out.sort(function(a, b){ return (a.fecha || '').localeCompare(b.fecha || ''); });
  caja.innerHTML = '<div class="tl">' + out.map(function(ev){
    return '<a class="trk" href="' + esc(urlSegura(ev.url)) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">'
      + '<span class="nm">' + esc(ev.artista) + '<span style="color:var(--txt3)"> · ' + esc(ev.sala || '') + ', ' + esc(ev.ciudad || '') + '</span></span>'
      + '<span class="dur">' + (ev.fecha ? fdate(ev.fecha).split(',')[0] : '') + '</span></a>';
  }).join('') + '</div>';
}

/* ============================================================
   AVISO DE DISCOS NUEVOS DE ARTISTAS QUE YA TIENES
   ============================================================ */
var K_NOVEDADES = 'discoteca.novedades';
function estadoNovedades(){
  try{ return JSON.parse(localStorage.getItem(K_NOVEDADES) || '{}'); }catch(e){ return {}; }
}
function guardarNovedades(o){ try{ localStorage.setItem(K_NOVEDADES, JSON.stringify(o)); }catch(e){} }
async function buscarNovedades(){
  var m = {};
  coleccion().forEach(function(d){
    if(!d.artista || !parseInt(d['año'])) return;
    var y = parseInt(d['año']);
    if(!m[d.artista] || y > m[d.artista]) m[d.artista] = y;
  });
  var artistas = Object.keys(m);
  var s = sheet('Discos nuevos de tus artistas',
    '<div class="warnb info">' + I.info + '<span>Mira, artista por artista, si hay algo publicado después del año '
    + 'más reciente que ya tienes suyo. Con ' + artistas.length + ' artistas, tarda unos minutos; se puede cerrar '
    + 'y seguirá donde iba la próxima vez.</span></div>'
    + '<div id="nProg"></div><div id="nRes"></div>',
    '<span></span><button type="button" class="btn destr" id="nStop">Parar</button>', true);
  var parar = false;
  s.querySelector('#nStop').onclick = function(){ parar = true; };
  var progreso = s.querySelector('#nProg'), caja = s.querySelector('#nRes');
  var est = estadoNovedades(), encontrados = [], saltados = 0;
  for(var i = 0; i < artistas.length; i++){
    if(parar) break;
    var art = artistas[i];
    progreso.innerHTML = '<div class="revbar"><div class="revt">' + esc(art) + '</div>'
      + '<div class="bar" style="width:100%"><div style="width:' + Math.round(i / artistas.length * 100) + '%"></div></div>'
      + '<div class="revs">' + (i + 1) + ' de ' + artistas.length + '</div></div>';
    try{
      var j = await jget('https://musicbrainz.org/ws/2/artist/?query=' + encodeURIComponent('artist:"' + lucene(art) + '"') + '&fmt=json&limit=1', 'mb', 1100);
      var a = (j.artists || [])[0];
      /* si el grupo se disolvió o la persona falleció, MusicBrainz ya lo dice en
         esta misma respuesta (life-span.ended): no tiene sentido preguntarle por
         discos nuevos, así que se salta sin gastar la consulta siguiente */
      if(a && a['life-span'] && a['life-span'].ended){ saltados++; est[art] = nowISO(); continue; }
      if(a){
        var rgj = await jget('https://musicbrainz.org/ws/2/release-group?artist=' + a.id
          + '&type=album&limit=25&fmt=json', 'mb', 1100);
        var nuevos = (rgj['release-groups'] || []).filter(function(rg){
          var y = parseInt((rg['first-release-date'] || '').slice(0, 4));
          return y && y > m[art];
        });
        if(nuevos.length){
          nuevos.sort(function(x, y2){ return (y2['first-release-date'] || '').localeCompare(x['first-release-date'] || ''); });
          encontrados.push({artista: art, tienes: m[art], titulo: nuevos[0].title, año: nuevos[0]['first-release-date'].slice(0, 4)});
        }
      }
    }catch(e){}
    est[art] = nowISO();
  }
  guardarNovedades(est);
  progreso.innerHTML = '';
  if(!encontrados.length){
    caja.innerHTML = '<div class="tl-empty">Nada nuevo por ahora en los ' + (parar ? i : artistas.length) + ' artistas revisados'
      + (saltados ? ' · ' + saltados + ' ya no están en activo, no se les pregunta' : '') + '.</div>';
  }else{
    caja.innerHTML = '<div class="tl-hd"><h4>Novedades encontradas'
      + (saltados ? '<span class="n"> · ' + saltados + ' artistas ya no activos, saltados</span>' : '') + '</h4></div><div class="tl">' + encontrados.map(function(x){
      return '<div class="trk"><span class="nm">' + esc(x.titulo) + '<span style="color:var(--txt3)"> · ' + esc(x.artista) + '</span></span>'
        + '<span class="dur">' + x.año + ' · tenías hasta ' + x.tienes + '</span></div>';
    }).join('') + '</div>';
  }
  s.querySelector('.sheet-ft').innerHTML = '<span></span><button type="button" class="btn pri" data-nx>Cerrar</button>';
  s.querySelector('[data-nx]').onclick = function(){ s.remove(); };
}

/* Respaldo de Wikipedia: la biografía de Last.fm, casi siempre en inglés y
   escrita por la comunidad, pero mejor que nada cuando no hay artículo. */
function lastfmBio(artista){
  return fetch('https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist='
      + encodeURIComponent(artista) + '&api_key=' + encodeURIComponent(CFG.lastfm) + '&format=json')
    .then(function(r){ return r.json(); }).then(function(j){
      var bio = j && j.artist && j.artist.bio;
      var texto = bio && (bio.content || bio.summary);
      if(!texto) throw new Error('sin biografía');
      texto = texto.replace(/<a href="[^"]*">Read more on Last\.fm<\/a>\.?/i, '').trim();
      return {
        titulo: j.artist.name,
        extracto: texto,
        img: ((j.artist.image || []).filter(function(im){ return im.size === 'large'; })[0] || {})['#text'] || '',
        /* la URL viene tal cual de la respuesta de Last.fm: se valida el
           esquema antes de que llegue a asignarse a un href, igual que
           cualquier otro enlace que no construimos nosotros mismos */
        url: urlSegura(j.artist.url)
      };
    });
}
/* Convierte la foto a un JPEG razonable en base64, SIN el tratamiento de
   blanco y negro que usa fotoParaLeer para los códigos de barras: aquí
   hace falta el color de verdad de la portada. */
function fotoParaVision(file, lado){
  return new Promise(function(res, rej){
    var fr = new FileReader();
    fr.onload = function(){
      var img = new Image();
      img.onload = function(){
        var m = lado || 1000, sc = Math.min(1, m / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
      };
      img.onerror = function(){ rej(new Error('imagen no válida')); };
      img.src = fr.result;
    };
    fr.onerror = function(){ rej(new Error('no se pudo leer el archivo')); };
    fr.readAsDataURL(file);
  });
}
/* Identifica artista y título a partir de la foto de la portada.
   Respaldo del escáner cuando el código de barras no se puede leer. */
function identificarPortada(file){
  if(!hayAnthropic()) return Promise.reject(new Error('sin clave'));
  return fotoParaVision(file, 1000).then(function(b64){
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': CFG.anthropic,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODELO_ANTHROPIC_RAPIDO,
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            {type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: b64}},
            {type: 'text', text: 'Esto es la portada de un disco (vinilo o CD). Identifica el artista y el título '
              + 'del álbum tal como aparecen impresos. Responde solo con JSON, sin explicación ni marcado: '
              + '{"artista":"...", "titulo":"..."}. Si no se distingue con claridad, responde {"artista":"","titulo":""}.'}
          ]
        }]
      })
    });
  }).then(function(r){
    if(!r.ok) return r.json().catch(function(){ return null; }).then(function(j){
      throw new Error((j && j.error && j.error.message) || ('http' + r.status));
    });
    return r.json();
  }).then(function(j){
    var texto = ((j.content || [])[0] || {}).text || '{}';
    var m = texto.match(/\{[\s\S]*\}/);
    var obj = JSON.parse(m ? m[0] : texto);
    if(!obj.artista && !obj.titulo) throw new Error('no se distingue la portada');
    return obj;
  });
}

function dgGet(path){
  return jget('https://api.discogs.com/' + path + (path.indexOf('?') >= 0 ? '&' : '?')
    + 'token=' + encodeURIComponent(CFG.discogs), 'dg', 1100);
}
function dgPorBarcode(codigo){
  return dgGet('database/search?barcode=' + encodeURIComponent(codigo) + '&type=release&per_page=5').then(function(j){
    var r = (j.results || [])[0];
    if(!r) throw new Error('no encontrado');
    return dgGet('releases/' + r.id);
  }).then(dgNormaliza);
}
function dgPorId(id){ return dgGet('releases/' + id).then(dgNormaliza); }

/* ---------- precio en tres niveles ----------
   Discogs da precios reales por estado de conservación, pero solo si el
   token pertenece a una cuenta de vendedor dada de alta (aunque sea sin
   vender nada). Sin eso, el único dato que da a cualquiera es el precio
   más bajo en venta ahora mismo. Se intenta lo bueno y, si falla, se cae
   al dato sencillo, dejando claro en la interfaz cuál de los dos es. */
var TTL_PRECIO_H = 24 * 30; /* un mes; se puede volver a consultar antes a mano */
function precioCaducado(d){
  var f = d.tecnica && d.tecnica.precioFecha;
  if(!f) return true;
  return (Date.now() - new Date(f).getTime()) > TTL_PRECIO_H * 3600000;
}
function idDeRelease(d){
  var m = String(d.discogs || '').match(/release\/(\d+)/);
  return m ? m[1] : '';
}
function cargarPrecios(d){
  if(!hayDiscogs()) return Promise.reject(new Error('sin token'));
  var rid = idDeRelease(d);
  var conId = rid ? Promise.resolve(rid) : dgGet('database/search?type=release&per_page=1&q='
      + encodeURIComponent((d.artista || '') + ' ' + (d.titulo || '')))
    .then(function(j){
      var r = (j.results || [])[0];
      if(!r) throw new Error('sin edición');
      return String(r.id);
    });
  return conId.then(function(id){
    return dgGet('marketplace/price_suggestions/' + id).then(function(precios){
      var niveles = {
        bajo: precios['Very Good (VG)'] || precios['Good Plus (G+)'],
        media: precios['Very Good Plus (VG+)'],
        alto: precios['Near Mint (NM or M-)'] || precios['Mint (M)']
      };
      if(!niveles.bajo && !niveles.media && !niveles.alto) throw new Error('sin niveles');
      return {
        tipo: 'suerte',
        bajo: niveles.bajo ? niveles.bajo.value : null,
        media: niveles.media ? niveles.media.value : null,
        alto: niveles.alto ? niveles.alto.value : null,
        moneda: (niveles.media || niveles.bajo || niveles.alto).currency || 'EUR'
      };
    }).catch(function(){
      /* sin cuenta de vendedor, o sin oferta activa para calcular sugerencias:
         nos quedamos con el precio más bajo en venta ahora, que sí es público */
      return dgGet('releases/' + id).then(function(r){
        if(r.lowest_price == null) throw new Error('sin precio');
        return {tipo:'simple', bajo: r.lowest_price, media: null, alto: null, moneda: 'USD'};
      });
    });
  }).then(function(p){
    d.tecnica = d.tecnica || {};
    d.tecnica.precio = p;
    d.tecnica.precioFecha = nowISO();
    /* se mantiene el campo antiguo para no romper lo que ya lee tecnica.valor */
    d.tecnica.valor = p.media || p.bajo || d.tecnica.valor || null;
    persist(true);
    return p;
  });
}

function dgNormaliza(r){
  var lab = (r.labels || [])[0] || {};
  var fmt = (r.formats || [])[0] || {};
  var tl = (r.tracklist || []).filter(function(t){ return t.type_ === 'track' || !t.type_; })
    .map(function(t){ return {titulo: t.title, duracion: t.duration || '', preview: ''}; });
  var artista = (r.artists || []).map(function(a){ return limpiaNombre(a.name); }).join(', ');
  var estilos = (r.styles || []).concat(r.genres || []).join(' ');
  return {
    id:'', rgId:'', titulo: r.title || '', artista: artista,
    'año': String(r.year || (r.released || '').slice(0, 4) || ''),
    anioOriginal:'', sello: limpiaSello(lab.name || ''), numeroCatalogo: lab.catno || '',
    pais: codigoDePaisDiscogs(r.country || ''),
    paisTexto: r.country || '',
    formatoDetalle: [fmt.name, (fmt.descriptions || []).join(', ')].filter(Boolean).join(', '),
    codigoBarras: ((r.identifiers || []).filter(function(i){ return /barcode/i.test(i.type); })[0] || {}).value || '',
    portada: (r.images && r.images[0] && (r.images[0].uri || r.images[0].resource_url)) || '',
    tracklist: tl, tags: estilos, sec: '', discogsUrl: r.uri || ''
  };
}

/* ---------- código de barras ---------- */
function porCodigoBarras(codigo){
  return mbGet('release?query=barcode:' + encodeURIComponent(codigo) + '&limit=5').then(function(j){
    var r = (j.releases || [])[0];
    if(!r) throw new Error('mb');
    return mbDetalle(r.id);
  }).catch(function(){
    if(!hayDiscogs()) throw new Error('no encontrado');
    return dgPorBarcode(codigo);
  });
}

/* ---------- huecos en la discografía ---------- */
/* MusicBrainz devuelve como mucho 100 release-groups por página. Un artista
   con más de 100 (compilaciones y reediciones incluidas antes de filtrar)
   se quedaba con una lista incompleta; se pide página a página -una detrás
   de otra, respetando el mismo hueco entre peticiones de mbGet- solo
   mientras el propio MusicBrainz diga que quedan más por recibir. */
function huecosArtista(nombre){
  var LIMITE = 100, TOPE_PAGINAS = 10; /* tope defensivo: 1000 discos de un mismo artista */
  return mbArtistaId(nombre).then(function(id){
    if(!id) throw new Error('artista');
    var acumulado = [];
    var pedirPagina = function(offset){
      return mbGet('release-group?artist=' + id + '&type=album&limit=' + LIMITE + '&offset=' + offset).then(function(j){
        var pagina = j['release-groups'] || [];
        acumulado = acumulado.concat(pagina);
        var total = Number(j['release-group-count']) || acumulado.length;
        var siguienteOffset = offset + pagina.length;
        if(pagina.length && siguienteOffset < total && (siguienteOffset / LIMITE) < TOPE_PAGINAS){
          return pedirPagina(siguienteOffset);
        }
        return acumulado;
      });
    };
    return pedirPagina(0);
  }).then(function(todos){
    var mios = {};
    DB.discos.filter(function(d){ return (d.artista || '').trim().toLowerCase() === nombre.trim().toLowerCase(); })
      .forEach(function(d){ mios[plain(d.titulo)] = 1; });
    var rgs = todos.filter(function(g){
      return g['primary-type'] === 'Album' && (!g['secondary-types'] || !g['secondary-types'].length);
    });
    rgs.sort(function(a, b){ return String(a['first-release-date'] || '9999').localeCompare(String(b['first-release-date'] || '9999')); });
    return rgs.map(function(g){
      return {
        id: g.id, titulo: g.title, 'año': String(g['first-release-date'] || '').slice(0, 4),
        tengo: !!mios[plain(g.title)]
      };
    });
  });
}

/* ---------- color dominante de la carátula ---------- */
function colorDominante(url){
  return new Promise(function(res, rej){
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      try{
        var c = document.createElement('canvas'); c.width = 16; c.height = 16;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 16, 16);
        var px = ctx.getImageData(0, 0, 16, 16).data;
        var r = 0, g = 0, b = 0, n = 0;
        for(var i = 0; i < px.length; i += 4){
          if(px[i+3] < 128) continue;
          r += px[i]; g += px[i+1]; b += px[i+2]; n++;
        }
        if(!n) return rej();
        res([Math.round(r/n), Math.round(g/n), Math.round(b/n)].join(','));
      }catch(e){ rej(e); }
    };
    img.onerror = rej;
    img.src = url;
  });
}
function aseguraColor(d){
  if(d.color || !d.portada) return Promise.resolve(d.color);
  return colorDominante(d.portada).then(function(c){ d.color = c; persist(true); return c; }).catch(function(){ return ''; });
}

/* ---------- último recurso: modelo de lenguaje ---------- */
function askAI(titulo, artista, formato, pistas){
  /* este es el último recurso, después de que MusicBrainz y Apple Music
     ya hayan fallado los dos; sin clave configurada, ni se intenta */
  if(!hayAnthropic()) return Promise.reject(new Error('sin clave de Anthropic'));
  var L = [];
  L.push('Busca información verificada de este disco y responde solo con JSON.');
  L.push('Álbum: "' + titulo + '" · Artista: "' + artista + '" · Soporte: ' + formato);
  if(pistas) L.push('Datos conocidos: ' + pistas);
  L.push('Campos: portada (URL directa a imagen pública), tracklist (array de {"titulo","duracion"}), anio, sello, numeroCatalogo, pais, formatoDetalle, genero, notas.');
  L.push('El género debe ser exactamente uno de: ' + GENEROS.join(' | '));
  L.push('Nacional = artista de España; Internacional = resto. BSO para bandas sonoras.');
  L.push('Formato: {"portada":"","tracklist":[],"anio":"","sello":"","numeroCatalogo":"","pais":"","formatoDetalle":"","genero":"","notas":""}');
  L.push('No inventes: si no verificas un dato, deja "" o [].');
  return fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'content-type':'application/json', 'x-api-key':CFG.anthropic, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({
      model:MODELO_ANTHROPIC_COMPLETO, max_tokens:2000,
      messages:[{role:'user', content:L.join('\n')}],
      tools:[{type:'web_search_20250305', name:'web_search'}]
    })
  }).then(function(r){
    /* antes era un "api" genérico que no decía nada: si Anthropic retira este
       modelo (404/model_not_found) o cambia algo en la petición, el mensaje
       real de Anthropic queda enterrado y parece un fallo de red cualquiera. */
    if(!r.ok) return r.json().catch(function(){ return null; }).then(function(j){
      throw new Error((j && j.error && j.error.message) || ('Anthropic respondió con error http' + r.status));
    });
    return r.json();
  }).then(function(data){
    var text = (data.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('\n');
    var m = text.match(/\{[\s\S]*\}/);
    if(!m) throw new Error('json');
    var p = JSON.parse(m[0]);
    var g = (p.genero || '').trim();
    if(g && GENEROS.indexOf(g) < 0) g = clasificar(g, /nacional/i.test(g), artista);
    return {
      portada:(p.portada || '').trim(), tracklist: normTracks(p.tracklist),
      'año':(p.anio || p['año'] || '').toString().trim(), sello:(p.sello || '').trim(),
      numeroCatalogo:(p.numeroCatalogo || '').trim(), pais:(p.pais || '').trim(),
      formatoDetalle:(p.formatoDetalle || '').trim(), genero:g, notas:(p.notas || '').trim(), confianza:'baja'
    };
  });
}

/* ---------- lote ---------- */
function pendientes(){ return DB.discos.filter(incompleto); }
async function bulkRun(lista){
  var list = lista || pendientes();
  if(!list.length){ toast('No hay nada que completar'); return; }
  cancelBulk = false;
  bulk = {done:0, total:list.length, ok:0, actual:''};
  paintBanner();
  for(var i = 0; i < list.length; i++){
    if(cancelBulk) break;
    bulk.actual = (list[i].artista ? list[i].artista + ' — ' : '') + list[i].titulo;
    paintBanner();
    var ok = await enrich(list[i].id, false);
    if(ok) bulk.ok++;
    bulk.done++;
    paintBanner();
  }
  var res = bulk;
  bulk = null;
  renderAll();
  toast(res.ok + ' de ' + res.done + ' fichas completadas' + (cancelBulk ? ' · detenido' : ''), res.ok === 0);
}


