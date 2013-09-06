First, try it:
    * http://osmy.com/la-parks.html
    * or http://osmly.com/la-libraries.html
    * or http://osmly.com/la-schools.html

OSMLY is a simple import editor for OpenStreetMap. It makes importing simple by presenting features one at a time, allowing you to manually review each object and make any necessary adjustment to positions or tags, flag problems, or upload directly to OSM. Other users can also edit simultaneously from the same pool of features. The aim is to make importing basic features quick, easy, and cooperative.

I built OSMLY while preparing an import for Los Angeles County and inspired by Maproulette and iD. I've done lots of repetitive editing before but when considering the many thousands of items I was going to have to go through manually, I wasn't looking forward to it. In addition, I wanted to include as many other local users as possible to help out and share their knowledge. I read up on past imports, tried out some scripts/tools, and organized things according to how I see they are being done today (wiki, spreadsheets, large .osm files, JOSM). I wasn't into it. The organization and tools involved seems too complicated or clunky for getting more than a small number of people involved. Most imports are solo ventures, those that aren't are limited to a few powerusers.

Even though the data I have is very simple we would have to deal with dozens of .osm files each containing many features inside, a central spreadsheet for tracking who is doing what and the status of each group of items, and everyone would have to use JOSM. Then editing would involve managing multiple layers in JOSM, downloading the area around each feature, looking around and resolving any conflicts, uploading in a small batch, and making sure to tag changesets correctly. Ideally, someone would then go back, search for the changesets and confirm each feature was done correctly.

<!-- link to seattle imports wiki? -->

That's too complicated for my liking and I don't trust any of the local users I know to do all this without making mistakes, I would just leave them out of it. On the other hand, most of that complexity is necessary for organizing the people involved and maintaining some quality to the data going into OSM. I want a simpler and more automated way of handling the most manual and repetitive parts for really basic imports. I just want a simple way for someone with OSM experience and knowledge but not necessarily a GIS data or programming background to help out with basic tasks.

I built OSMLY to reduce the complexity of dealing with many items and many people for importing simple geometry. It's just the essentials: editing geometry, fixing tags, displaying relevant nearby features from OSM, flagging problems and uploading to OSM. Features are served from a simple database to keep track of everything/everyone and different actions are allowed based on an feature's status. Once an item is submitted it's available for QA where other users can confirm everything was done correctly while flagged results can get attention from more experienced users in JOSM.

Some key feature:
    - context, nearby relevant features that might collide are shown alongside the item you're editing with detailed tags
    - user whitelist, only specific users are allowed to import, or everyone if you want (default)
    - Quality Assurance, administrative users, specified in the setting, can review everything that has been submitted and confirm each item has been done correctly
    - edit in JOSM, every item can be remotely opened in JOSM if you prefer
    - tag manipulation, depending on your source, you might not have to do any tag manipulation before OSMLY. Tags can be renamed, added, and removed

Some limitations:
    - simple features only, no shared nodes, nothing too large for the browser the download or render
    - just simple polygons for now, no holes, no multipolygons
        - some of this is technical, some of this is ease of use
        - right now all complex features are pushed to edit with JOSM
        - I'd like to work on supporting simple nodes next

Source code @ http://github.com/aaronlidman/osmly

I'd like to hear your opinion. Please keep it short, we all have better things to do.
