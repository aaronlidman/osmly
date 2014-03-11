#OSMLY-Server API
REST-ish and JSON.

## GET /
- a list of all sqlite databases in the osmly-server root
- one of the items is for use in osmly.settings.db
- request example: <pre>http://162.243.13.100/</pre>
- response: JSON array
- response example: <pre>["la-golf", "la-parks", "sample", "la-libraries"]</pre>
	- corresponds to `la-golf.sqlite`, `la-parks.sqlite`, `sample.sqlite`, `la-libraries.sqlite`

## GET db
- a random object from the database
- request example: <pre>http://162.243.13.100/<b>?db=la-parks</b></pre>
- response: GeoJSON object
- response example: <pre>{"geometry": {"type": "Polygon", "coordinates": [[[-118.11721249321899, 33.767366414691786], [-118.11970813722426, 33.76700809124473], [-118.12003126182422, 33.767519765358145], [-118.11884481338828, 33.76735124086415], [-118.11830225519383, 33.76815204184461], [-118.11861185242472, 33.76880277129597], [-118.11777879978014, 33.76904476351768], [-118.11721249321899, 33.767366414691786]]]}, "type": "Feature", "id": 1066, "properties": {"id": 629, "name": "Del Lago Park", "bounds": [-118.12003, 33.76701, -118.11718, 33.76904]}}</pre>

## GET id
- a specific feature in the database
- requires `?db=*`
- request example: <pre>http://162.243.13.100/?db=la-parks<b>&id=256</b></pre>
- response: GeoJSON object
- response example: <pre>{"geometry": {"type": "Polygon", "coordinates": [[[-117.96772732787107, 34.13635828254466], [-117.96771870519294, 34.137052006659395], [-117.96674640569397, 34.13705716850884], [-117.96676403709706, 34.13613236497294], [-117.9677239523902, 34.1361122631302], [-117.96772732787107, 34.13635828254466]]]}, "type": "Feature", "id": 445, "properties": {"id": 256, "name": "Northview Park", "bounds": [-117.96773, 34.13611, -117.96674, 34.13706]}}</pre>
- TODO: action=* queryies, https://github.com/aaronlidman/osmly-server/blob/master/server.py#L93-L99

## GET overview
- a summary of all items in the database, for the Overview mode in OSMLY
- requires `?db=*`
- request example: <pre>http://162.243.13.100/?db=la-parks<b>&overview</b></pre>
- response: JSON array
- respond example (truncated, can be large):
<pre>
[[0, "Pio Pico State Historic Park", "", "", ""], [1, "San Gabriel Mission", "", "", ""], [2, "Acton Park", "", "", ""], [3, "Acuna Park", "", "", ""], [4, "Algin Sutton Recreation Center", "", "", ""], [5, "All American Park", "", "", ""], [6, "Allen J Martin Park", "", "", ""], [7, "Allendale Park", "", "", ""], [8, "Almendra Park", "", "", ""], [9, "Aloysia Moore Park", "", "", ""], [10, "Alpine Park", "", "", ""], [11, "Alta Loma Park", "", "", ""], [12, "Amelia Mayberry Park", "", "", ""], [13, "Anaconda Park", "", "", ""], [14, "Anderson Park", "", "", ""], [15, "Anderson Playground and Senior Citizen Center", "", "", ""], [16, "Andrews Park", "", "1", "namdil-testing"], [17, "Anna J. Martin Park", "", "", ""], [18, "Area H Park", "already mapped", "", "AnderPijoan"], [19, "Artesia Park", "", "", ""], [20, "Arthur Gerdes Park", "", "", ""]]
</pre>
- TODO: INDEX SPECIFICS

## GET qa
- a random item that has already been uploaded to OSM but has not been confirmed by anyone
- requires `?db=*`
- request example: <pre>http://162.243.13.100/?db=la-parks<b>&qa</b></pre>
- response: JSON array
- response example: <pre>[615, "{\"geometry\": {\"type\": \"Polygon\", \"coordinates\": [[[-118.63450093872794, 34.20522467476307], [-118.6356150322026, 34.20515023856613], [-118.6356176207216, 34.20587270986838], [-118.63453706808397, 34.20586172960196], [-118.63450093872794, 34.20522467476307]]]}, \"type\": \"Feature\", \"id\": 1045, \"properties\": {\"id\": 615, \"name\": \"Cohasset Melba Park\", \"bounds\": [-118.63562, 34.20515, -118.6345, 34.20587]}}", "", "1", "namdil-testing", 1379698596]</pre>
- TODO: INDEX SPECIFICS

## POST id
- change a certain column for a specific id in the database
- requires `?db=*` and `&action=*`
	- possible actions: `problem`, `remote`, `submit`, `confirm`
- request example: <pre>http://162.243.13.100/?db=la-parks<b>&id=204</b>&action=problem</pre>
- response: JSON object
- response example:
	- action=problem: `{"id": "204"}`
		- meaningless, not checked for anything
	- action=remote: `remoted`
		- meaningless, not checked for anything
	- action=submit: `{"status": "ok"}`
		- meaningless, not checked for anything
	- action=confirm:	`confirmed`
		- meaningless, not checked for anything
