# GitHub Actions Workflows (disabled)

* These workflows are currently disabled (which I did by appending `-disabled` to the dir name)
  because Funding Circle is on a legacy GitHub plan that doesn’t support GitHub Actions.
  * (These actions were introduced while Actions was in “preview” and did, at that time, work with
    that legacy plan.)
* This situation caused the Actions system to initiate “runs” for these workflows which would then
  immediately fail with a message about the plan.
* This caused the corresponding commit to be annotated with a scary red “X” in GitHub, which I want
  to prevent.
* So that’s the reason these workflows are disabled — to prevent that scary red “X” from showing up.
