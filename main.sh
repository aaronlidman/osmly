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

# filtering, reprojecting, and converting merged shapefile to sqlite
ogr2ogr -where 'MTFCC="K2180" or MTFCC="K2181" or MTFCC="K2183" or MTFCC="K2184" or MTFCC="K2185" or MTFCC="K2186" or MTFCC="K2187" or MTFCC="K2188" or MTFCC="K2189" or MTFCC="K2190" and ALAND < 5000000 and ALAND > 0' -f "SQLite" -t_srs EPSG:4326 merged.sqlite merged/merged.shp

# cleaning up
rm -rf *.prj *.dbf *.shx *.shp *.shp.xml