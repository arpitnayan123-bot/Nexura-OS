import { GROUPS, type HiwSection } from "./types";
import { SECTIONS_START_PATIENTS } from "./sections-patients";
import { SECTIONS_CLINICAL } from "./sections-clinical";
import { SECTIONS_PLATFORM } from "./sections-platform";

export const HIW_SECTIONS: HiwSection[] = [
  ...SECTIONS_START_PATIENTS,
  ...SECTIONS_CLINICAL,
  ...SECTIONS_PLATFORM,
];

export const HIW_GROUPS = GROUPS;

export function sectionsByGroup(group: string): HiwSection[] {
  return HIW_SECTIONS.filter((s) => s.group === group);
}
