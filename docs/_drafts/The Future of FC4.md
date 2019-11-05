---
layout: post
title: The Future of FC4
---

# The Future of FC4

## Today

Today, FC4 is a:

> …framework that enables software creators and documentarians to author, publish, and maintain
> software architecture diagrams more effectively, efficiently, and collaboratively over time.

I’ve been calling it a framework because for a good while I was just as focused on its methodology
as its tooling.

Over time, however, I’ve noticed that the terms “framework” and “methodology“ are doing me no
favors. They’re vague and off-putting, and they dampen interest in the framework. On the other hand,
when I’ve tried describing FC4 as a *tool* the response has been uniformly positive and eager.

More fundamentally, I’ve found that the core element of FC4, defining *diagrams* as *data in text
files*, doesn’t go quite far enough. As pointed out numerous times by my peers inside Funding Circle
and by Simon Brown, the creator of Structurizr and Structurizr Express, tightly coupling the
definitions of software systems and related elements with visualizations of those elements leads to
duplication, inconsistencies, and toil. While the simple data format used by Structurizr Express is
convenient for one-off diagrams and learning C4, the separation of concerns employed by the
full-blown Structurizr, wherein a single model is defined and maintained independently of
visualizations thereof, yields more benefits with, over time, lower costs.

I’ve come to believe two things:

1. We should call it a tool, and we should focus on, and emphasize, its tool-ness.
1. Its core value proposition lies in its potential to facilitate the creation and maintenance of a
   centralized, unified, single-source-of-truth catalog/model of an organization’s systems, rather
   than a set of diagrams of those systems.

Those two things might be in tension with each other; we need to explore that.

I’ve never actually made any diagrams of the _framework_, which hints that maybe that conception was
always somewhat forced or unnecessary.

I *have* made diagrams of _the tool_.

Here’s our current *Context* diagram of the tool:

![fc4-tool-01-context](/media/2019/future-of-fc4/fc4-tool-01-context.png)

The tool is the subject, so it’s at the center of the diagram.

Unfortunately, I never made a diagram of FC4 as a *system*. But if I had, I would have placed a
corpus of diagrams at the center of that diagram. After all, creating and maintaining a corpus of
diagrams was the purpose of the framework.

However, I’ve come to realize that such a corpus is extremely close

![Scribbled future of FC4](/media/2019/future-of-fc4/scribbled-future-of-fc4.png)

Bar

![fc4-future-02-container](/media/2019/future-of-fc4/fc4-future-02-container.png)
