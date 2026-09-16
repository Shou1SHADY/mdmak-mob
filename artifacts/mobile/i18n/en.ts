// The English dictionary, assembled from the per-module files in ./modules.
// Add strings in the module that owns the screen, not here.
import * as core from "./modules/core";
import * as auth from "./modules/auth";
import * as profile from "./modules/profile";
import * as procurement from "./modules/procurement";
import * as team from "./modules/team";
import * as crm from "./modules/crm";
import * as projects from "./modules/projects";
import * as inventory from "./modules/inventory";
import * as finance from "./modules/finance";
import * as sales from "./modules/sales";
import * as manufacturing from "./modules/manufacturing";
import * as accounting from "./modules/accounting";

const en = {
  ...core.en,
  ...auth.en,
  ...profile.en,
  ...procurement.en,
  ...team.en,
  ...crm.en,
  ...projects.en,
  ...inventory.en,
  ...finance.en,
  ...sales.en,
  ...manufacturing.en,
  ...accounting.en,
};

export default en;
