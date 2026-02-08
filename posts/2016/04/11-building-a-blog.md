---
title: Building a Blog
date: 2016-04-11
tags:
  - blog
excerpt: How I set up my blog using Hugo, GitHub Pages, and Cloudflare
---

I've been contemplating starting my own blog for quite some time now, but I've never followed through with it. However, I recently came across "[Become a Social Developer](http://getinvolved.hanselman.com/)" that finally convinced me to setup my own blog.

While I am still in the process of watching all the video content that [Scott Hanselman](https://twitter.com/shanselman) and [Jeff Atwood](https://twitter.com/codinghorror) have made available, I've already started working on my blog.

## What's in this post

In this post, I'll talk about the requirements I set out for myself for my blog and how that influenced my choice of technologies/frameworks/services to build and host my blog.

In future posts in the series, I'll go into greater details about how I set up each one the pieces and how you can replicate my setup.

## But.. Does it scale?

Let me paint you a picture: you write up a blog post and share it on [Hacker News](https://news.ycombinator.com/). Your post is wildly popular and you end up making the front page. Someone who sees it on the front page of HN, thinks it's worth sharing on Reddit as well. Your site is now receiving 2k-3k unique visitors a second. Let's assume your blog post has a logo, a couple of css/js files, a couple of images and a favicon ( around 10-20 web requests for every new visitor). So the question is will your site be able to handle around 50k requests per second without going down, turning unresponsive, or burning a giant hole in your pocket (oops, auto-scale)? A simple way around this problem was to build my blog as a static site. Since every visitor to my blog sees the same content, I could easily get by without serving any dynamic content.

### Static site

Over the past couple of years, static sites have surged in popularity again. Amazon AWS S3 is ridiculously cheap and [GitHub Pages](https://pages.github.com/) is free to host static sites (Sorry! [No love for Azure here](https://feedback.azure.com/forums/217298-storage/suggestions/1180039-support-a-default-blob-for-blob-storage-containers) ). Additionally, using S3/GitHub Pages means I no longer have to worry about OS updates, system reboots, security vulnerabilities, or even poor performance in my web application. [NPR had a fantastic piece](http://blog.apps.npr.org/2013/02/14/app-template-redux.html) on how they use just a couple of servers and S3 to build news applications.

### Builds on Windows; builds on Mac

While having a static site is desirable when it comes to hosting, it unreasonable to have to write a blog in just raw HTML. NPR built their own static site generator that is based on Flask (Python microframework). Most static site generators use some sort of templating engine and build system that allows you to author your content in plain-text based formats like `Markdown` and `reStructuredText` and output rendered HTML. [Jekyll](https://jekyllrb.com/) and [Octopress](http://octopress.org/)(a collection of plugins and configuration for Jekyll) seem to among the most popular static site generators. However, Jekyll is not officially supported on Windows. I ended up choosing [Hugo](https://gohugo.io/), a static site generator built using Go, as my platform of choice. Having previously used [Sphinx](http://www.sphinx-doc.org/en/stable/) at work and being annoyed by the long build times, I chose Hugo solely because of the extremely fast build times. Hugo seems to have burgeoning community around it and a lot of popular Jekyll themes seem to have already been ported to Hugo. While I've been intending to give a [Go](https://golang.org/) a spin, I ended up using the pre-compiled binaries for Hugo instead of opting to build from source. I was able to use `brew` to install Hugo on my Mac, and `chocolatey` to install Hugo on my Windows box.

### SSL

While I don't expect to do any payment processing on my personal blog nor do I serve up any login page, having an SSL issued from a trusted CA will still protect readers of my blog from a [Man-in-the-middle (MITM) attack](https://wikipedia.org/wiki/Man-in-the-middle_attack). Additionally, a huge motivation for me to use SSL was that Google now uses [HTTPS as a ranking signal](https://security.googleblog.com/2014/08/https-as-ranking-signal_6.html).

![Free SSL Certs](freesslcerts.png)

It used to be the case that SSL certificates were very expensive and I would have never even considered getting one in the past for a personal website. However, both [Let's Encrypt](https://letsencrypt.org/) and [Cloudflare](https://www.cloudflare.com/) have recently started offering free Domain Validated (DV) certificates. While Let's Encrypt is it's own CA, Cloudflare provides certificates issued by Comodo. Using Cloudflare as my DNS service and allowing the edge server in it's Content Delivery Network (CDN) to serve up my SSL certificate proved to be a easier option for me than getting set up with Let's Encrypt.

## Closing thoughts

While I continue to try and set up this infrastructure for my blog, I've reached my first base camp. The screenshot below shows a couple of things I've already accomplished.

- DNS Name: I was able update the DNS records for my site such that https://blog.shirhatti.com points at https://shirhatti.github.io
- SSL: Did you notice the green padlock in the URL? SSL support has been implemented
- Placeholder page: I uploaded a simple static site for the time being whose source can be found in [shirhatti.github.io repo](https://github.com/shirhatti/shirhatti.github.io/tree/v1.0).

![Eventually- Placeholder site](eventually.png)
