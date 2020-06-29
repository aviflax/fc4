# 5. Installation « FC4 User Manual


## Requirements

1. A [Java Runtime Environment (JRE)][adoptopenjdk] or [Java Development Kit (JDK)][adoptopenjdk]
  1. On MacOS if you have [Homebrew][homebrew] you can run
       `brew cask install adoptopenjdk11-jre`
1. An installation of [Chrome][chrome] or [Chromium][chromium] **70–83** (inclusive)
   1. On MacOS:
      1. If you have [Homebrew][homebrew] you can run `brew cask install chromium`
      1. Chromium/Chrome must be at either `/Applications/Chromium.app` or
         `/Applications/Google Chrome.app`
1. The [on-premisis version of Structurizr][s9r-on-prem]


## Download and Install

### With Homebrew

[Homebrew][homebrew] is the recommended installation method for anyone using Linux, MacOS, or
[Windows Subsystem for Linux][wsl].

Once you’ve installed Homebrew, you can install FC4 with this command:

```shell
brew install fundingcircle/floss/fc4
```

If you cannot use Homebrew, or would prefer not to, you can [manually](#manually) download and
install the tool:

### Manually

1. Download the archive for your platform from [the latest release][latest-release]
1. Expand the archive
1. Optional: move the extracted files to somewhere on your `$PATH`
   1. e.g. `mv ~/Downloads/fc4/fc4* ~/bin/`

----

Please continue to [The Repository](./repository) or go back to [the top page of the manual](./).


[adoptopenjdk]: https://adoptopenjdk.net/installation.html?variant=openjdk11&jvmVariant=hotspot
[chrome]: https://www.google.com/chrome/browser/
[chromium]: https://www.chromium.org/Home
[homebrew]: https://brew.sh/
[latest-release]: https://github.com/FundingCircle/fc4-framework/releases/latest
[s9r-on-prem]: https://structurizr.com/help/on-premises
[wsl]: https://docs.microsoft.com/en-us/windows/wsl/about
