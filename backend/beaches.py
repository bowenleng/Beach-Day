# Texas beaches shown on the Discover page.
# tide_station: NOAA CO-OPS station used for tide predictions.
# obs_station:  NOAA CO-OPS station with live water temperature / wind sensors.
# buoy:         NDBC station with live wave measurements, or None if none is close enough.
# nws_zone:     NWS public forecast zone, used for alerts and the Surf Zone Forecast.
# popularity:   0-1, how busy the beach tends to get (used by the crowd estimate).
# bay:          True for bay-side beaches, where waves are much smaller than the open Gulf.
# patrol_url:   Official page with the beach patrol's flag status, where one exists.
# photo:        Freely licensed photo from Wikimedia Commons (credit and license are shown in the app).
# Amenities are hand-entered and should be double-checked before relying on them.

GALVESTON_FLAGS = "https://www.visitgalveston.com/beachpatrol/beach-safety/flag-warning-system/"

BEACHES = [
    {
        "id": "south-padre", "name": "South Padre Island", "city": "South Padre Island",
        "lat": 26.1118, "lon": -97.1681, "popularity": 0.9, "bay": False,
        "tide_station": "8779749", "obs_station": "8779748", "buoy": None, "nws_zone": "TXZ455",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/South_Padre_Island_beach.jpg/500px-South_Padre_Island_beach.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:South_Padre_Island_beach.jpg",
                  "credit": "Brendajane", "license": "Public domain"},
        "tagline": "Clear water and big resort energy",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Public parking"],
    },
    {
        "id": "boca-chica", "name": "Boca Chica Beach", "city": "Brownsville",
        "lat": 25.9970, "lon": -97.1550, "popularity": 0.15, "bay": False,
        "tide_station": "8779749", "obs_station": "8779749", "buoy": None, "nws_zone": "TXZ455",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/BocaChicaTXwaves.JPG/500px-BocaChicaTXwaves.JPG",
                  "page": "https://commons.wikimedia.org/wiki/File:BocaChicaTXwaves.JPG",
                  "credit": "Justin Hundsnurscher", "license": "Public domain"},
        "tagline": "Wild and empty, bring everything",
        "amenities": ["No services", "Drive-on beach"],
    },
    {
        "id": "padre-ns", "name": "Padre Island National Seashore", "city": "Corpus Christi",
        "lat": 27.4260, "lon": -97.2990, "popularity": 0.35, "bay": False,
        "tide_station": "8775870", "obs_station": "8775792", "buoy": "42092", "nws_zone": "TXZ442",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Padre_Island_National_Seashore%2C_dunes%2C_Kleberg_Co%2C_TX%3B_1_Nov_2022.jpg/500px-Padre_Island_National_Seashore%2C_dunes%2C_Kleberg_Co%2C_TX%3B_1_Nov_2022.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Padre_Island_National_Seashore,_dunes,_Kleberg_Co,_TX;_1_Nov_2022.jpg",
                  "credit": "William L. Farr", "license": "CC BY-SA 4.0"},
        "tagline": "Undeveloped seashore with room to roam",
        "amenities": ["Visitor center", "Restrooms", "Park entry fee"],
    },
    {
        "id": "mustang-island", "name": "Mustang Island State Park", "city": "Port Aransas",
        "lat": 27.6730, "lon": -97.1700, "popularity": 0.4, "bay": False,
        "tide_station": "8775870", "obs_station": "8775792", "buoy": "42092", "nws_zone": "TXZ443",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Beach_%40_Mustang_Island_State_Park_%5Ejcutrer_-_Flickr_-_joncutrer.jpg/500px-Beach_%40_Mustang_Island_State_Park_%5Ejcutrer_-_Flickr_-_joncutrer.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Beach_@_Mustang_Island_State_Park_%5Ejcutrer_-_Flickr_-_joncutrer.jpg",
                  "credit": "Jonathan Cutrer", "license": "CC BY 2.0"},
        "tagline": "Quiet dunes and long walks",
        "amenities": ["Restrooms", "Showers", "Park entry fee"],
    },
    {
        "id": "port-aransas", "name": "Port Aransas Beach", "city": "Port Aransas",
        "lat": 27.8339, "lon": -97.0611, "popularity": 0.8, "bay": False,
        "tide_station": "8775237", "obs_station": "8775237", "buoy": "PHCT2", "nws_zone": "TXZ443",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Port_Aransas_-Mustang_Island_Beach_-_panoramio.jpg/500px-Port_Aransas_-Mustang_Island_Beach_-_panoramio.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Port_Aransas_-Mustang_Island_Beach_-_panoramio.jpg",
                  "credit": "dwh1974 (Panoramio)", "license": "CC BY 3.0"},
        "tagline": "Lively beach town, drive right up",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Drive-on beach"],
    },
    {
        "id": "north-beach-cc", "name": "North Beach", "city": "Corpus Christi",
        "lat": 27.8236, "lon": -97.3878, "popularity": 0.6, "bay": True,
        "tide_station": "8775296", "obs_station": "8775296", "buoy": None, "nws_zone": "TXZ343",
        "tagline": "Calm bay water next to the city",
        "amenities": ["Restrooms", "Public parking"],
    },
    {
        "id": "rockport", "name": "Rockport Beach", "city": "Rockport",
        "lat": 28.0290, "lon": -97.0480, "popularity": 0.6, "bay": True,
        "tide_station": "8774770", "obs_station": "8774770", "buoy": None, "nws_zone": "TXZ245",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Rockport_Beach_-_panoramio.jpg/500px-Rockport_Beach_-_panoramio.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Rockport_Beach_-_panoramio.jpg",
                  "credit": "dwh1974 (Panoramio)", "license": "CC BY 3.0"},
        "tagline": "Gentle bay swimming, great for kids",
        "amenities": ["Restrooms", "Pavilions", "Parking fee"],
    },
    {
        "id": "matagorda", "name": "Matagorda Beach", "city": "Matagorda",
        "lat": 28.5960, "lon": -95.9800, "popularity": 0.25, "bay": False,
        "tide_station": "8773767", "obs_station": "8773767", "buoy": None, "nws_zone": "TXZ436",
        "tagline": "Remote and uncrowded, few services",
        "amenities": ["Drive-on beach", "Limited services"],
    },
    { 
        "id": "surfside", "name": "Surfside Beach", "city": "Surfside Beach",
        "lat": 28.949767, "lon": -95.284810, "popularity": 0.6, "bay": False,
        "tide_station": "8772447", "obs_station": "8772471", "buoy": None, "nws_zone": "TXZ437",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Surfside_Beach_Longview_of_Beach_-_panoramio.jpg/500px-Surfside_Beach_Longview_of_Beach_-_panoramio.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Surfside_Beach_Longview_of_Beach_-_panoramio.jpg",
                  "credit": "Lance L Lowry", "license": "CC BY 3.0"},
        "tagline": "Laid-back drive-on beach near Houston",
        "amenities": ["Drive-on beach", "Beach parking permit"],
    },
    {
        "id": "galveston-sp", "name": "Galveston Island State Park", "city": "Galveston",
        "lat": 29.190887, "lon": -94.955788, "popularity": 0.45, "bay": False,
        "tide_station": "8771510", "obs_station": "8771972", "buoy": "42035", "nws_zone": "TXZ438",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Gfp-texas-galveston-island-state-park-skies-over-the-gulf.jpg/500px-Gfp-texas-galveston-island-state-park-skies-over-the-gulf.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Gfp-texas-galveston-island-state-park-skies-over-the-gulf.jpg",
                  "credit": "Yinan Chen", "license": "Public Domain"},
        "tagline": "Natural shoreline, less busy than town",
        "amenities": ["Restrooms", "Showers", "Park entry fee"],
    },
    {
        "id": "galveston-east", "name": "East Beach", "city": "Galveston",
        "lat": 29.3140, "lon": -94.7570, "popularity": 0.85, "bay": False,
        "tide_station": "8771510", "obs_station": "8771341", "buoy": "42035", "nws_zone": "TXZ438",
        "patrol_url": GALVESTON_FLAGS,
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston%2C_Galveston_County%2C_Texas.jpg/500px-2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston%2C_Galveston_County%2C_Texas.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston,_Galveston_County,_Texas.jpg",
                  "credit": "Famartin", "license": "CC BY-SA 4.0"},
        "tagline": "Big, busy, and full of amenities",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Parking fee"],
    },
    {
        "id": "crystal-beach", "name": "Crystal Beach", "city": "Bolivar Peninsula",
        "lat": 29.449537, "lon": -94.637024, "popularity": 0.55, "bay": False,
        "tide_station": "8771341", "obs_station": "8771341", "buoy": "42035", "nws_zone": "TXZ439",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Crystal_Beach_before_the_Hurricane_-_panoramio.jpg/500px-Crystal_Beach_before_the_Hurricane_-_panoramio.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:Crystal_Beach_before_the_Hurricane_-_panoramio.jpg",
                  "credit": "AudreyIski", "license": "CC BY-SA 3.0"},
        "tagline": "Wide sand and beach houses",
        "amenities": ["Drive-on beach", "Beach parking permit"],
    },
]
