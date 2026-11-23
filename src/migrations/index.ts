import * as migration_20261122_193752_initial from './20261122_193752_initial';
import * as migration_20261123_021849_visitor_submissions from './20261123_021849_visitor_submissions';

export const migrations = [
  {
    up: migration_20261122_193752_initial.up,
    down: migration_20261122_193752_initial.down,
    name: '20261122_193752_initial',
  },
  {
    up: migration_20261123_021849_visitor_submissions.up,
    down: migration_20261123_021849_visitor_submissions.down,
    name: '20261123_021849_visitor_submissions'
  },
];
