import * as migration_20261122_193752_initial from "./20261122_193752_initial";

export const migrations = [
  {
    up: migration_20261122_193752_initial.up,
    down: migration_20261122_193752_initial.down,
    name: "20261122_193752_initial",
  },
];
