# Settings inspection fixture

The project settings request `acceptEdits` deliberately so students can compare
the raw merge with the trust-filtered result. This fixture is inspected only;
the sample never applies this mode to its live query.

Machine-managed policy may affect the merged result. The UI returns only mode
fields and source names, never raw settings, environment values, or local paths.
