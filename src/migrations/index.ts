import * as migration_20261122_193752_initial from './20261122_193752_initial';
import * as migration_20261123_021849_visitor_submissions from './20261123_021849_visitor_submissions';
import * as migration_20261123_091446_payments from './20261123_091446_payments';
import * as migration_20261123_091637_payments_iphash from './20261123_091637_payments_iphash';
import * as migration_20261123_112840_reporting_fx from './20261123_112840_reporting_fx';
import * as migration_20261123_121653_donor_accounts from './20261123_121653_donor_accounts';
import * as migration_20261123_181031_media_storage_fields from './20261123_181031_media_storage_fields';
import * as migration_20261124_175115_donor_codes_passwords from './20261124_175115_donor_codes_passwords';

export const migrations = [
  {
    up: migration_20261122_193752_initial.up,
    down: migration_20261122_193752_initial.down,
    name: '20261122_193752_initial',
  },
  {
    up: migration_20261123_021849_visitor_submissions.up,
    down: migration_20261123_021849_visitor_submissions.down,
    name: '20261123_021849_visitor_submissions',
  },
  {
    up: migration_20261123_091446_payments.up,
    down: migration_20261123_091446_payments.down,
    name: '20261123_091446_payments',
  },
  {
    up: migration_20261123_091637_payments_iphash.up,
    down: migration_20261123_091637_payments_iphash.down,
    name: '20261123_091637_payments_iphash',
  },
  {
    up: migration_20261123_112840_reporting_fx.up,
    down: migration_20261123_112840_reporting_fx.down,
    name: '20261123_112840_reporting_fx',
  },
  {
    up: migration_20261123_121653_donor_accounts.up,
    down: migration_20261123_121653_donor_accounts.down,
    name: '20261123_121653_donor_accounts',
  },
  {
    up: migration_20261123_181031_media_storage_fields.up,
    down: migration_20261123_181031_media_storage_fields.down,
    name: '20261123_181031_media_storage_fields',
  },
  {
    up: migration_20261124_175115_donor_codes_passwords.up,
    down: migration_20261124_175115_donor_codes_passwords.down,
    name: '20261124_175115_donor_codes_passwords'
  },
];
