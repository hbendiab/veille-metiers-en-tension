const error_Trigger = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Error Trigger', notes: 'Receives the failed execution of a workflow that uses this Error Workflow.', notesInFlow: true }
});

const configuration_Error_Log = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Configuration - Error Log', parameters: { assignments: { assignments: [{ id: 'err-workflow', name: 'workflowName', value: expr('{{ $json.workflow.name }}'), type: 'string' }, { id: 'err-execution', name: 'executionId', value: expr('{{ $json.execution.id }}'), type: 'string' }, { id: 'err-url', name: 'executionUrl', value: expr('{{ $json.execution.url }}'), type: 'string' }, { id: 'err-node', name: 'failedNode', value: expr('{{ $json.execution.lastNodeExecuted }}'), type: 'string' }, { id: 'err-message', name: 'errorMessage', value: expr('{{ String($json.execution.error?.message || \'erreur inconnue\').slice(0, 1000) }}'), type: 'string' }] }, options: {} }, position: [220, 0], notes: 'Keeps the useful fields of the error: workflow, execution link, failed node, message.', notesInFlow: true }
});

const postgres_Log_Error = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Postgres - Log Error', parameters: { operation: 'executeQuery', query: '-- Error log of all workflows; the table is created on the first error.\ncreate table if not exists workflow_errors (id bigserial primary key, workflow_name text, execution_id text, execution_url text, failed_node text, error_message text, created_at timestamptz not null default now());\nalter table workflow_errors enable row level security;\ninsert into workflow_errors (workflow_name, execution_id, execution_url, failed_node, error_message) values ($1, $2, $3, $4, $5);', options: { queryReplacement: expr('{{ [ $json.workflowName, $json.executionId, $json.executionUrl, $json.failedNode, $json.errorMessage ] }}') } }, credentials: { postgres: newCredential('Postgres account', 'AAsHauLCknL0ZLaC') }, position: [440, 0], notes: 'Stores the error in Supabase (table workflow_errors).', notesInFlow: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 }
});

const wf = workflow('Error Handler', 'Error Handler', { description: 'Shared Error Workflow: logs the failed executions of the other workflows (workflow, node, message, execution link) in the Supabase table workflow_errors.', executionOrder: 'v1' });

export default wf
  .add(sticky('## Error Handler\n\n**Goal:** shared Error Workflow (Utils). Any workflow that names it in its settings sends its failed executions here.\n\n**What it does:** stores the workflow name, the failed node, the error message and the link to the execution in the Supabase table workflow_errors, created on the first run.\n\n**Note:** n8n runs an Error Workflow only for production executions (published workflow), not for manual tests.', [], { name: 'Specs Note', color: 2, width: 440, height: 300, position: [-520, -200] }))
  .add(error_Trigger)
  .to(configuration_Error_Log)
  .to(postgres_Log_Error)