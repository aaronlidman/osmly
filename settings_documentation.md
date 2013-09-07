types and uses of osmly.settings properties

### title (required)
- string
- very basic description of what needs to be done
- eg. 'Outline the park', 'Locate the library'

### instructions (required)
- html string
- a basic set of instructions
- max width of the element is 640px
- don't forget to escape quotes with a slash \
- if your using multiple lines end each line with a slash \, it's valid js
- eg. `'<ul><li>Don't forget the tags</li><li>Watch out for other parks</li></ul>'`

### db (required)
- string
- full url of the database location
- eg. `'http://127.0.0.1:5000/?db=parks-5'`, `'http://l33tdomain.com/?db=POIz'`
    - these resolve to `parks-5.sqlite`, `POIz.sqlite`

### writeApi
- string
- the OSM API endpoint to write data
- http://wiki.openstreetmap.org/wiki/API_v0.6
- default: `'http://api06.dev.openstreetmap.org'`
    - dev server

### oauth_secret
- string
- oauth_secret registered on OSM
- default: `'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff'`
    - just my test application on the dev server

### consumerKey
- string
- consumerKey registered on OSM with oauth_secret
- default: `'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg'`
    - just my test application on the dev server

### readApi
- string
- the server endpoint from which to read OSM data
- http://wiki.openstreetmap.org/wiki/Xapi#Implementations
- also compatible with the regular OSM API
    - 'http://api.openstreetmap.org/api/0.6/map?'
- default: `'http://www.overpass-api.de/api/xapi?map?'`
    - downloads are faster and it allows for larger areas
    - disadvantage: lags behind the main api up to a couple minutes

### context (required)
- object
- keys and values to items that provide relevant context to the features being edited
- for example: if schools are being edited, a context of other schools should be included. `{amenity: ['school']}`
but other key/values should also be included for items that are often near schools that might be mistaken or be nearby schools. Things like colleges, universities, libraries, parks. It depends, go nuts.
    - our final object might look something like this:

``` js
{
    amenity: ['school', 'library', 'college', 'university'],
    leisure: ['park']
}
```

### problems (required)
- object
- a list of options for the 'Problem' dropdown
- eg. `['no library here', 'library already there', 'imagery is too poor', 'not enough info']`

### origin
- array
- coordinates to center the map on load
- default: `[0,0]`

### zoom
- integer
- zoom level for the map on load
- default: `2`

### region
- geojson object
- a geojson outline of the region that the import is taking place in
- serves as a general overview before login, give users something to look at
- use geojson.io to generate something, paste it here

### demo
- bool
- allows a demonstration mode, setting to `false` doesn't allow it
- default: `true`

### changesetTags
- object
- tags to use for changesets
- will probably add an additional tag to track particular imports
    - eg. 'osmly:import': 'la-parks'
- default: 

``` js
{
    'created_by': 'osmly',
    'osmly:version': '0',
    'imagery_used': 'Bing'
}
```

### renameProperty
- object
- renames a property from the original data to a usable key for OSM
- eg. `{wackyCompany_internal_id: 'XYZimport:id'}`

### usePropertyAsTag (required)
- array
- properties in the original data to use as tags which get uploaded to OSM
    - anything not specified will be ignored
- this assumes you have all tags named correctly
    - for quick fixes/adjustments use renameProperty
    - for serious changes you should fix your source data in something like QGIS
- eg. `['name', 'leisure', 'source']`

### appendTag
- object
- tag to add to every object uploaded
- useful for a 'source' tag or something like it which must be applied to everything
- or if you're data is already of a common type and just missing the necessary OSM tag
    - for example: you have just parks for a particular county but no leisure=park tag, this can add it to everything
- eg. 

``` js
{
    leisure: 'park',
    source: 'TIGER 2027'
}
```

### featureStyle
- object
- how to feature is styled on the map when being edited
- maps directly to leaflet, full options here: http://leafletjs.com/reference.html#path-options
- default:

``` js
{
    color: '#00FF00',
    weight: 3,
    opacity: 1,
    clickable: false
}
```

### contextStyle
- object
- how features from OSM (as defined in the 'context' setting) are styled along side the feature
- maps directly to leaflet, full options here: http://leafletjs.com/reference.html#path-options
- default:

``` js
{
    color: '#FFFF00',
    fillOpacity: 0.3,
    weight: 3,
    opacity: 1
}
```

###users
- object
- a list of OSM users that are allowed on this import
- if no one is specified, any OSM user is allowed
- eg. `['Aaron Lidman', 'psapp', 'Archive']`

###admins
- object
- a list of OSM users that have admin access
    - currently just QA mode, which allows for reviewing and confirming what all users have submitted to OSM
- if no one is specified, everyone has admin access
- eg. `['Hot Chip', 'Ladytron', 'grimes']`
