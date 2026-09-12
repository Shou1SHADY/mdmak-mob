// The dictionary shape is whatever the English source says it is. There is no
// hand-maintained interface to keep in step: adding a string to a module file
// extends the type, and the Arabic side is checked against it.
import en from "./en";

export type Translations = typeof en;
