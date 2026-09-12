// The Arabic dictionary, assembled from the per-module files in ./modules.
// Typed against the English one, so the two can never drift apart.
import type { Translations } from "./types";
import * as core from "./modules/core";
import * as auth from "./modules/auth";
import * as profile from "./modules/profile";
import * as procurement from "./modules/procurement";
import * as team from "./modules/team";
import * as crm from "./modules/crm";
import * as projects from "./modules/projects";
import * as inventory from "./modules/inventory";
import * as finance from "./modules/finance";

const ar: Translations = {
  ...core.ar,
  ...auth.ar,
  ...profile.ar,
  ...procurement.ar,
  ...team.ar,
  ...crm.ar,
  ...projects.ar,
  ...inventory.ar,
  ...finance.ar,
};

export default ar;
