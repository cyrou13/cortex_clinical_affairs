import { builder } from './builder.js';

// Import modules to register their types, queries, and mutations
import '../modules/auth/graphql/types.js';
import '../modules/auth/graphql/queries.js';
import '../modules/auth/graphql/mutations.js';
import '../modules/project/graphql/types.js';
import '../modules/project/graphql/queries.js';
import '../modules/project/graphql/mutations.js';
import '../modules/project/graphql/dashboard-types.js';
import '../modules/project/graphql/dashboard-queries.js';
import '../modules/audit/graphql/types.js';
import '../modules/audit/graphql/queries.js';
import '../modules/async-tasks/graphql/types.js';
import '../modules/async-tasks/graphql/queries.js';
import '../modules/async-tasks/graphql/mutations.js';
import '../modules/async-tasks/graphql/subscriptions.js';
import '../modules/sls/graphql/types.js';
import '../modules/sls/graphql/queries.js';
import '../modules/sls/graphql/mutations.js';
import '../modules/llm/graphql/types.js';
import '../modules/llm/graphql/queries.js';
import '../modules/llm/graphql/mutations.js';
import '../modules/soa/graphql/types.js';
import '../modules/soa/graphql/queries.js';
import '../modules/soa/graphql/mutations.js';
import '../modules/validation/graphql/types.js';
import '../modules/validation/graphql/queries.js';
import '../modules/validation/graphql/mutations.js';
import '../modules/cer/graphql/types.js';
import '../modules/cer/graphql/queries.js';
import '../modules/cer/graphql/mutations.js';
import '../modules/pms/graphql/types.js';
import '../modules/pms/graphql/queries.js';
import '../modules/pms/graphql/mutations.js';
import '../modules/settings/graphql/index.js';

export { builder } from './builder.js';
export const schema = builder.toSchema();
