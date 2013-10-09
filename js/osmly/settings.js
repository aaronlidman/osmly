var settings = {
    // refer to settings_documentation.md for details
    title: '',
    db: '',
    writeApi: 'http://api06.dev.openstreetmap.org',
    oauth_secret: 'Mon0UoBHaO3qvfgwWrMkf4QAPM0O4lITd3JRK4ff',
    consumerKey: 'yx996mtweTxLsaxWNc96R7vpfZHKQdoI9hzJRFwg',
    readApi: 'http://www.overpass-api.de/api/xapi?map?',
    context: {},
    origin: [0,0],
    zoom: 2,
    demo: true,
    changesetTags: {
        'created_by': 'OSMLY',
        'osmly:version': '1.1.0',
        'imagery_used': 'Bing'
    },
    renameProperty: {},
    usePropertyAsTag: [],
    appendTag: {},
    featureStyle: {
        color: '#00FF00',
        weight: 3,
        opacity: 1,
        clickable: false,
        dashArray: '5, 10'
    },
    contextStyle: {
        color: '#FFFF00',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 1
    },
    users: [],
    admins: [],
    discardTags: [
    // https://github.com/systemed/iD/blob/master/data/discarded.json
        "created_by",
        "odbl",
        "odbl:note",

        "tiger:upload_uuid",
        "tiger:tlid",
        "tiger:source",
        "tiger:separated",

        "geobase:datasetName",
        "geobase:uuid",
        "sub_sea:type",

        "KSJ2:ADS",
        "KSJ2:ARE",
        "KSJ2:AdminArea",
        "KSJ2:COP_label",
        "KSJ2:DFD",
        "KSJ2:INT",
        "KSJ2:INT_label",
        "KSJ2:LOC",
        "KSJ2:LPN",
        "KSJ2:OPC",
        "KSJ2:PubFacAdmin",
        "KSJ2:RAC",
        "KSJ2:RAC_label",
        "KSJ2:RIC",
        "KSJ2:RIN",
        "KSJ2:WSC",
        "KSJ2:coordinate",
        "KSJ2:curve_id",
        "KSJ2:curve_type",
        "KSJ2:filename",
        "KSJ2:lake_id",
        "KSJ2:lat",
        "KSJ2:long",
        "KSJ2:river_id",
        "yh:LINE_NAME",
        "yh:LINE_NUM",
        "yh:STRUCTURE",
        "yh:TOTYUMONO",
        "yh:TYPE",
        "yh:WIDTH_RANK",

        "SK53_bulk:load",
    ]
};
