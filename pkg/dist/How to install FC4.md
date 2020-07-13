# How to install FC4

Congratulations for downloading FC4! While we generally recommend [Homebrew][homebrew] for
installing FC4, we understand that that’s not possible or not desireable for lots of folks.


## Running FC4

* FC4 doesn’t actually need to be installed anywhere — it can be run from any directory on your
  system, e.g. wherever you downloaded and expanded it
* For example, if you’ve downloaded the archive to `~/Downloads` and it’s been expanded to
  the directory `~/Downloads/fc4` then you can run FC4 from anywhere on your system by using its
  full path, e.g.: `~/Downloads/fc4/fc4 --help`
* While “installation” is completely optional, it is recommended, in order to make using the tool
  more convenient
* **Please note:** FC4 has system and runtime [requirements][reqs] that must be satisfied for the
  tool to function successfully


## Installing FC4

As per the above, “installation” is optional, and consists merely of moving the files into a
directory that is listed in your `PATH` or `Path` environment variable.

1. There should be two files in the same directory as _this_ file: `fc4` and `fc4.jar`
1. Copy or move those two files to any directory that’s included in your `PATH` or `Path`
   environment variable

If you’re unsure what directories are included in your `PATH/Path` environment variable, or you’d
like to add a new directory to the variable and you’re unsure of how to do so, we recommend this
page: [What are PATH and other environment variables, and how can I set or use them?][how-to-path]


## Using FC4

Basic information on command-line options can be printed by running `fc4 --help`.

For full documentation on how to use FC4, please see [the website][website].


[homebrew]: https://brew.sh/
[how-to-path]: https://superuser.com/questions/284342/what-is-path-and-how-do-i-use-it
[reqs]: https://fundingcircle.github.io/fc4-framework/docs/manual/installation.html
[website]: https://fundingcircle.github.io/fc4-framework/
