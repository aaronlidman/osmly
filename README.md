These are the server components to [osmly](http://github.com/aaronlidman/osmly).

##Use cases
- build your own database for use with osmly
    - see `build.py`
- run your own instance of osmly
    - see `server.py`

##build.py
- converts a geojson file to a special sqlite database with individuals features as rows for osmly
    - makes sure geometry is valid, simplifies, seperates easy and difficult items, and gets a bounding box of each item
    - currently only works with polygons, multipolygons
- dependency: [Shapely](http://toblerity.org/shapely/)
- `python build.py YOURFILE.geojson` creates `YOURFILE.sqlite`
- options:
    - `--simplify FLOAT` - Simplification tolerance for [shapely's simplify function](http://toblerity.org/shapely/manual.html#object.simplify). (default: 0.0001)
    - `--names STRING` - The name property.

##server.py
- a simple application that serves requests against an osmly database
- dependency: [Flask](http://flask.pocoo.org/)
    - `pip install --requirement requirements.txt` - Shapely and Flask so you can build and serve from the same place
- local server: `python server.py`
- remote Ubuntu server:
    - `sh setup.sh` will install all necessary dependencies and run the server
    - __BEWARE__: this is ment for a dedicated ubuntu server, it doesn't play nice with any existing nginx, uwsgi, or flask instances that might be running
- once running, requests are made against `http://your-ip-address/?db=YOURFILE`
    - try the included sample database: `http://your-ip-address/?db=sample`
    - going to root, http://ip-address/, should show an index of available .sqlite databases
    - no sqlite extension needed on the db query
    - this entry point is used by the osmly client, see the `db` setting in the osmly [settings documentation](https://github.com/aaronlidman/osmly/blob/master/settings_documentation.md).
    - if you have any problems getting flask or uwsgi working with nginx refer to this: https://gist.github.com/mplewis/6076082 it's what I've been using. The process can be a bit finiky, `apt-get purge nginx` and reinstalling has saved me a few times.
