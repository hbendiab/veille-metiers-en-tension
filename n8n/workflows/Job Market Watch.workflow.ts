const weekly_Schedule = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Weekly Schedule',
    parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 7, triggerAtMinute: 0 }] } },
    position: [0, 0],
    notes: 'Runs every Monday at 07:00 on all active jobs and zones.',
    notesInFlow: true
  }
});

const manual_Run_Form = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: {
    name: 'Manual Run Form',
    parameters: {
      authentication: 'none',
      formTitle: 'Veille métiers en tension : lancement manuel',
      formDescription: 'Choisis un métier et une zone. Le lancement hebdomadaire couvre automatiquement tous les couples actifs.',
      formFields: {
        values: [
          {
            fieldLabel: 'metier',
            fieldType: 'dropdown',
            requiredField: true,
            fieldOptions: { values: [{ option: 'Électricien du bâtiment' }, { option: 'Plombier' }, { option: 'Mécanicien automobile' }, { option: 'Mécanicien poids lourd' }] }
          },
          {
            fieldLabel: 'zone',
            fieldType: 'dropdown',
            requiredField: true,
            fieldOptions: { values: [{ option: 'Île-de-France' }, { option: 'Lyon (Rhône)' }] }
          }
        ]
      },
      responseMode: 'onReceived',
      options: {}
    },
    position: [0, 200],
    webhookId: '3f6a2c1e-8b4d-4e7a-9c2f-1d5e6b7a8c90',
    notes: 'On-demand run for one job and one zone.',
    notesInFlow: true
  }
});

const build_Run_Context = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Run Context',
    parameters: {
      jsCode: `// Normalises both triggers into a single run context.
const input = $input.first().json;
const isManual = input.metier !== undefined || input.zone !== undefined;
const dateRun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const runId = 'run-' + dateRun + '-' + $execution.id;
return [{ json: {
  runId,
  dateRun,
  mode: isManual ? 'manual' : 'scheduled',
  requestedMetier: isManual ? String(input.metier || '').trim() : null,
  requestedZone: isManual ? String(input.zone || '').trim() : null
} }];`
    },
    position: [240, 100],
    notes: 'Builds the run context (run id, date, mode, requested job and zone) from either trigger.',
    notesInFlow: true
  }
});

const read_Jobs_Config = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Jobs Config',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      authentication: 'oAuth2',
      documentId: { __rl: true, mode: 'list', value: '', cachedResultName: 'classeur_veille_metiers_en_tension' },
      sheetName: { __rl: true, mode: 'name', value: 'config_metiers_zones' },
      options: { dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A2:E6' } } }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    executeOnce: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    position: [480, 100],
    notes: 'Reads the tracked jobs table (header on row 2).',
    notesInFlow: true
  }
});

const read_Zones_Config = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: {
    name: 'Read Zones Config',
    parameters: {
      resource: 'sheet',
      operation: 'read',
      authentication: 'oAuth2',
      documentId: { __rl: true, mode: 'list', value: '', cachedResultName: 'classeur_veille_metiers_en_tension' },
      sheetName: { __rl: true, mode: 'name', value: 'config_metiers_zones' },
      options: { dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A10:E12' } } }
    },
    credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
    executeOnce: true,
    alwaysOutputData: true,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    position: [720, 100],
    notes: 'Reads the tracked zones table (header on row 10).',
    notesInFlow: true
  }
});

const build_Job_Zone_Pairs = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Job Zone Pairs',
    parameters: {
      jsCode: `// Crosses active jobs and zones, then keeps only the requested pair on a manual run.
const ctx = $('Build Run Context').first().json;
const isActive = (v) => v === true || ['TRUE', 'VRAI', '1'].includes(String(v).trim().toUpperCase());
const clean = (v) => (v === undefined || v === null ? '' : String(v).trim());

const jobs = $('Read Jobs Config').all().map(i => i.json)
  .filter(r => clean(r.metier) && clean(r.code_rome) && isActive(r.actif))
  .map(r => ({
    metier: clean(r.metier),
    codeRome: clean(r.code_rome),
    motsClesFiltre: clean(r.mots_cles_filtre),
    metierAVerifier: clean(r.a_verifier)
  }));

const zones = $('Read Zones Config').all().map(i => i.json)
  .filter(r => clean(r.zone) && clean(r.code) && isActive(r.actif))
  .map(r => ({
    zone: clean(r.zone),
    typeFiltre: clean(r.type_filtre),
    codeZone: clean(r.code),
    zoneAVerifier: clean(r.a_verifier)
  }));

if (jobs.length === 0 || zones.length === 0) {
  throw new Error('Configuration vide : aucun métier ou aucune zone actif dans config_metiers_zones.');
}

let pairs = [];
for (const j of jobs) for (const z of zones) pairs.push({ ...j, ...z });

if (ctx.mode === 'manual') {
  pairs = pairs.filter(p => p.metier === ctx.requestedMetier && p.zone === ctx.requestedZone);
  if (pairs.length === 0) {
    throw new Error('Couple introuvable ou inactif dans la config : ' + ctx.requestedMetier + ' x ' + ctx.requestedZone);
  }
}

return pairs.map(p => ({ json: { runId: ctx.runId, dateRun: ctx.dateRun, mode: ctx.mode, ...p } }));`
    },
    position: [960, 100],
    notes: 'Builds one item per active job and zone pair, filtered to the requested pair on manual runs.',
    notesInFlow: true
  }
});

const wf = workflow('Job Market Watch', 'Job Market Watch', {
  description: 'Weekly watch of the labour market for shortage jobs (electrician, plumber, car and truck mechanic) in Ile-de-France and Rhone. Step 1: triggers and job and zone configuration.',
  executionOrder: 'v1'
});

export default wf
  .add(weekly_Schedule)
  .to(build_Run_Context)
  .add(manual_Run_Form)
  .to(build_Run_Context)
  .add(build_Run_Context)
  .to(read_Jobs_Config)
  .to(read_Zones_Config)
  .to(build_Job_Zone_Pairs);
