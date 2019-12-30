# 5. Installation « FC4 User Manual


## Quick start for Homebrew users

If you already use [Homebrew][homebrew], one or both of these commands might be  all you need to get
started:

```shell
# If you’re using MacOS and you don’t already have Chromium or Chrome installed:
brew cask install chromium
# If you’re using a different OS and you don’t already have Chromium or Chrome installed
# then install Chromium or Chrome however you generally install such software on your system.

# The main event (should work on any OS that supports Homebrew)
brew install fundingcircle/floss/fc4
```


## Requirements

1. A [Java Runtime Environment (JRE)][adoptopenjdk] or [Java Development Kit (JDK)][adoptopenjdk]
  1. On MacOS if you have [Homebrew][homebrew] you can run
       `brew cask install adoptopenjdk11-jre`
1. An installation of [Chrome][chrome] or [Chromium][chromium] **70–77** (inclusive)
   1. On MacOS:
      1. If you have [Homebrew][homebrew] you can run `brew cask install chromium`
      1. Chromium/Chrome must be at either `/Applications/Chromium.app` or
         `/Applications/Google Chrome.app`


## Download and Install

### With Homebrew

[Homebrew][homebrew] is the recommended installation method for anyone using Linux, MacOS, or
[Windows Subsystem for Linux][wsl]. Please see [Quick start for Homebrew
users](#quick-start-for-homebrew-users) above.

If you don’t already use Homebrew, we recommend you install it and then see [Quick start for
Homebrew users](#quick-start-for-homebrew-users) above.

If you cannot use Homebrew, or would prefer not to, you can [manually](#manually) download and
install the tool:

### Manually

1. Download the archive for your platform from [the latest release][latest-release]
1. Expand the archive
1. Optional: move the extracted files to somewhere on your `$PATH`
   1. e.g. `mv ~/Downloads/fc4/fc4* ~/bin/`

----

Please continue to [The Repository](/docs/manual/repository) or go back to [the top page of the manual](/docs/manual).


[adoptopenjdk]: https://adoptopenjdk.net/installation.html?variant=openjdk11&jvmVariant=hotspot
[chrome]: https://www.google.com/chrome/browser/
[chromium]: https://www.chromium.org/Home
[homebrew]: https://brew.sh/
[latest-release]: https://github.com/FundingCircle/fc4-framework/releases/latest
[wsl]: https://docs.microsoft.com/en-us/windows/wsl/about
