---
redirect_from:
  - tool/index.html
---
# FC4

<style>
  figure {
    float: right;
    border: 1px solid silver;
    padding: 1em;
    text-align: center;

    /* Hides the rule under the headings where it would otherwise appear behind the figure. */
    background-color: white;
  }

  figure > img {
    border: 1px solid silver;
    min-width: 350px;
    min-height: 299px;
  }

  figure + p { font-size: 125%; }

  ul#info {
    margin-top: 2em;
    margin-bottom: 3em;
  }

  ul#info > li {
    margin-bottom: 1em;
  }

  /* list-style-type with a string value is supported by Firefox and Chrome, but not Safari.
     The character after the emoji is a unicode non-breaking space (U+00A0) — I tried to reference
     it via a hex code so it would be clearer but I couldn’t figure that out. The reason it’s there
     is to add some space between the list item markers and the list item content but *only* in
     those browsers that support list-style-type with a string, because if I used, say, margin or
     padding to acheive that, then in those browsers that *don’t* support list-style-type with a
     string, there’d be too much space between the markers and content. This way the list looks good
     in all three of the browsers I care about: Firefox, Chrome, and Safari.

     If you’re wondering why I didn’t use list-style-type: symbols("🏗 " "🙏 " "💡 ") it’s because
     symbols is supported only by Firefox.

     BTW I wanted to make the list markers larger (say, 150%) but couldn’t figure that out. */
  li#builds { list-style-type: "🏗 "; }
  li#thanks { list-style-type: "🙏 "; }
  li#origin { list-style-type: "💡 "; }
</style>

<figure>
  <img src="img/diagrams/fc4-02-container.png" width="350" height="299"
       alt="Example: a container diagram of FC4 itself.">
  <figcaption>Example: a container diagram of FC4 itself.</figcaption>
</figure>

FC4 is a [_Docs as Code_][docs-as-code] tool that helps software creators and
[documentarians][documentarians] author software architecture diagrams using
[the C4 model for visualising software architecture][c4-model].

<ul id="info">
  <li id="builds">
    It builds on <a href="https://structurizr.com/express">Structurizr Express</a>.
  </li>
  <li id="thanks">
    Many thanks to <a href="http://simonbrown.je/">Simon Brown</a> for creating and maintaining both
    the C4 model and Structurizr Express.
  </li>
  <li id="origin">
    It originated at and is maintained by <a href="https://engineering.fundingcircle.com/">Funding
    Circle</a>.
  </li>
</ul>


## Get Started

To get started, please see [Get started with FC4](docs/get-started).


## Help & Feedback

If you have any questions or feedback please [create an issue][new-issue] and one of the maintainers
will get back to you shortly.


## Documentation

* [Change History](change-history)
* [Command Line Interface (CLI) Reference](docs/reference/cli)
* [Developing and Testing](docs/dev)
* [Features](docs/features)
* [Installation](docs/manual/installation)
* [The Name](docs/name)
* [User Manual](docs/manual)


## See Also

* For the origin story of FC4, see [this blog post][fc4-blog-post].


## Source Code

This tool is [Free and Libre Open Source Software (FLOSS)][floss]; its source code is readily
available for review or modification via [its GitHub repository][repo].


## Copyright & License

Copyright © 2018–2019 Funding Circle Ltd.

Distributed under [the BSD 3-Clause License][license].


[c4-model]: https://c4model.com/
[docs-as-code]: https://www.writethedocs.org/guide/docs-as-code/
[documentarians]: https://www.writethedocs.org/documentarians/
[fc4-blog-post]: https://engineering.fundingcircle.com/blog/2018/09/07/the-fc4-framework/
[floss]: https://en.wikipedia.org/wiki/Free_and_open-source_software
[license]: https://github.com/FundingCircle/fc4-framework/blob/main/LICENSE
[new-issue]: https://github.com/FundingCircle/fc4-framework/issues/new
[repo]: https://github.com/FundingCircle/fc4-framework
