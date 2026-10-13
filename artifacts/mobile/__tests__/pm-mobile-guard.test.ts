import { isPmProject, projectWebPath, PROJECTS_WEB_PATH } from "@/lib/pm-guard";

describe("isPmProject", () => {
  it("is true for a project carrying a pm block", () => {
    expect(isPmProject({ pm: { no: "PJ-2026/001", lifecycle: "live" } })).toBe(true);
    expect(isPmProject({ pm: {} })).toBe(true);
  });

  it("is false for a legacy project, a missing project, or a non-object pm", () => {
    expect(isPmProject({})).toBe(false);
    expect(isPmProject({ pm: null })).toBe(false);
    expect(isPmProject({ pm: undefined })).toBe(false);
    expect(isPmProject({ pm: "yes" })).toBe(false);
    expect(isPmProject({ pm: true })).toBe(false);
    expect(isPmProject(null)).toBe(false);
    expect(isPmProject(undefined)).toBe(false);
  });
});

describe("web paths", () => {
  it("points at the website's contractor projects pages", () => {
    expect(PROJECTS_WEB_PATH).toBe("/contractor/projects");
    expect(projectWebPath("abc123")).toBe("/contractor/projects/abc123");
  });
});
