/**
 * Module registry boot file.
 *
 * Importing this file once at app boot triggers each module's
 * `registerModule()` side effect. Add new modules here by importing the
 * module file. Order doesn't matter — modules are looked up by id.
 *
 * Imported from `features/transcript-studio/components/StudioView.tsx` so
 * the registry is populated by the time any session view tries to look up
 * a module by id.
 */

import "./tasks/TasksModule";
