#!/bin/bash

# downloading, list created via https://gist.github.com/3745763
wget -i rawr.out -q

# unzipping
for county in *arealm.zip
do
	unzip -q $county
	rm -rf $county
done

# merging shapefiles
mkdir merged;

for f in *.shp;
do
	if [ -f merged/merged.shp ]
		then
		ogr2ogr -f "ESRI Shapefile" -update -append -skipfailures merged/merged.shp "$f" -nln Merged
		else
			ogr2ogr -f "ESRI Shapefile" merged/merged.shp "$f"
	fi;
done;

# cleaning up
rm -rf *.prj *.dbf *.shx *.shp *.shp.xml

# filtering, reprojecting, and converting merged shapefile to sqlite
ogr2ogr -where 'MTFCC="K2180"' -f "SQLite" -t_srs EPSG:4326 merged.sqlite merged/merged.shp
