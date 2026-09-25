import fs from 'node:fs';
import assert from 'node:assert/strict';

// Manifiesto de regresión: garantiza que el cierre no pueda omitir accidentalmente una familia crítica.
const required=[
 'validate.mjs','sync-tests.mjs','transfer-regression-tests.mjs','robustness-source-tests.mjs',
 'extreme-recovery-tests.mjs','persistence-migration-tests.mjs','extreme-sync-contract-tests.mjs',
 'phase4-import-integrity-tests.mjs','phase5-security-network-tests.mjs','phase6-architecture-pwa-tests.mjs',
 'phase7-tests.mjs','phase7-final-security-tests.mjs','phase8-tests.mjs','phase8-final-ux-tests.mjs',
 'phase9-tests.mjs','phase9-final-session-tests.mjs','phase10-final-cleanup-tests.mjs',
 'quality-tests.mjs','design-tests.mjs','pwa-update-tests.mjs','module-tests.mjs',
 'accessibility-tests.mjs','step10-4-browser.mjs','scale-browser.mjs'
];
for(const f of required) assert.ok(fs.existsSync('scripts/'+f),`falta ${f}`);
const workflow=fs.readFileSync('.github/workflows/validate.yml','utf8');
for(const f of required) assert.ok(workflow.includes(f),`${f} debe ejecutarse en CI final`);

const data=JSON.parse(fs.readFileSync('datos.json','utf8'));
assert.ok(Array.isArray(data.discos),'datos.json mantiene discos');
assert.ok(Array.isArray(data.borrados),'datos.json mantiene tombstones');
assert.ok(data.version>=4,'esquema de datos compatible');

console.log(`✓ fase 11: ${required.length} familias críticas presentes y obligatorias en CI`);
console.log(`✓ fase 11: datos.json válido con ${data.discos.length} discos`);
