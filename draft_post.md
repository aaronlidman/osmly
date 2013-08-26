```
---
layout: post
title:
permalink:
date: 2013-08-30 00:00:00
---
```

`the why`

I was preparing an import for Los Angeles County but I wanted to get other local users involved, as many as possible. I read up on past imports on the OSM wiki and import mailing list, focusing on imports with more than one importer. What I found was that the organization and tools involved seemed too complicated or clunky for getting more than a small number of people involved. Most imports are solo ventures, those that aren't are limited to a few powerusers.

Even though the data I have is very simple we would have to deal with dozens of .osm files each containing many features inside, a central spreadsheet for tracking who is doing what and the status of each group of items, and everyone would have to use JOSM. Then editing would involve managing multiple layers in JOSM, downloading the area around each feature, looking around and resolving any conflicts, uploading in a small batch, and making sure to tag changesets correctly. Someone would then have to go back, search for the changesets, and confirm each feature was done correctly.

That's too complicated for my liking and I don't trust any of the local users I know to learn the tools and not make mistakes, I'd just leave them out of it. On the other hand, most of the complexity is necessary both for organizing the people involved and preserving quality to the data going into OSM. I want a simpler and more automated way of handling the most manual and repetitive parts for really basic imports. I just want a simple way for someone with OSM experience and knowledge but not necessarily a GIS data or programming background to help out with basic tasks.

I built OSMLY to reduce the complexity of having multiple people working on an import of simple features. It's just the essentials: it can display relevent nearby features from OSM, edit features, fix tags, flag problems and upload to OSM. Features are served from a simple database to keep track of everything/everyone and different actions are allowed based on an feature's status. Flagged results can get attention from more experienced users in JOSM, just as it's done now. The goal is to lower the bar for very simple imports which can hopefully get more people involved and more data of quality on the map.

`the how`
...

todo:
- pros and cons list?
    - it can ...
    - it can't ...
        - edit existing osm features
        - edit multipolygons
- go into used libraries?
- plenty of screenshots, possibly gifs/video
- try and preempt as much bullshit as possible, diplomatically
