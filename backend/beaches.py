# Texas beaches shown on the Discover page.
# tide_station: NOAA CO-OPS station used for tide predictions.
# obs_station:  NOAA CO-OPS station with live water temperature / wind sensors.
# buoy:         NDBC station with live wave measurements, or None if none is close enough.
# nws_zone:     NWS public forecast zone, used for alerts and the Surf Zone Forecast.
# popularity:   0-1, how busy the beach tends to get (used by the crowd estimate).
# bay:          True for bay-side beaches, where waves are much smaller than the open Gulf.
# patrol_url:   Official page with the beach patrol's flag status, where one exists.
# photo:        Freely licensed photo from Wikimedia Commons (credit and license are shown in the app).
# google:       Google Maps rating, copied by hand on GOOGLE_AS_OF (shown when no Google API key is set).
#               place is the Google listing it came from, when that differs from the beach name.
# cams:         Public live cams at or near the beach. embed is a player URL the owner offers for
#               embedding; cams without one are shown as a link to the owner's page.
# Amenities are hand-entered and should be double-checked before relying on them.

GALVESTON_FLAGS = "https://www.visitgalveston.com/beachpatrol/beach-safety/flag-warning-system/"


def youtube(video_id):
    return f"https://www.youtube-nocookie.com/embed/{video_id}?autoplay=1&mute=1&playsinline=1"


def ozolio(oid):
    if oid.startswith("EMB_"):
        return f"https://relay.ozolio.com/pub.api?cmd=embed&oid={oid}"
    return f"https://relay.ozolio.com/pub.cgi?cmd=iframe&oid={oid}&app_mode=view"


GOOGLE_AS_OF = "2026-10-24"

CC_CAMS = "https://visitcorpuschristi.com/beaches/beach-cameras/"

BEACHES = [
    {
        "id": "south-padre", "name": "South Padre Island", "city": "South Padre Island",
        "lat": 26.1118, "lon": -97.1681, "popularity": 0.9, "bay": False,
        "tide_station": "8779749", "obs_station": "8779748", "buoy": None, "nws_zone": "TXZ455",
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/South_Padre_Island_beach.jpg/500px-South_Padre_Island_beach.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:South_Padre_Island_beach.jpg",
                  "credit": "Brendajane", "license": "Public domain"},
        "cams": [
            {"name": "Isla Blanca Beach Park surf cam", "provider": "South Padre Surf Company",
             "page": "https://www.youtube.com/watch?v=0FaRaPPTS8M", "embed": youtube("0FaRaPPTS8M"), "lat": 26.0764, "lon": -97.1605},
            {"name": "Courtyard by Marriott beach cam", "provider": "South Padre Island (YouTube)",
             "page": "https://www.youtube.com/watch?v=dzylsC0KcOE", "embed": youtube("dzylsC0KcOE"), "lat": 26.1188, "lon": -97.1805},
            {"name": "North Beach at Sand Rose resort", "provider": "South Padre Island (YouTube)",
             "page": "https://www.youtube.com/watch?v=kJ_EXhKsH30", "embed": youtube("kJ_EXhKsH30"), "lat": 26.1420, "lon": -97.1690},
        ],
        "google": {"place": "Isla Blanca Park", "rating": 4.5, "count": 4512, "place_id": "ChIJP0D2m-utb4YRw3sgqTSzUKY"},
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
        "google": {"place": "Boca Chica Beach", "rating": 4.6, "count": 569, "place_id": "ChIJExpa7rqzb4YRtfqNkpyow-Y"},
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
        "google": {"place": "Padre Island National Seashore", "rating": 4.8, "count": 2164, "place_id": "ChIJIakuJC33aIYRYK_SNaO2Alk"},
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
        "cams": [
            {"name": "Whitecap Beach toward Bob Hall Pier", "provider": "City of Corpus Christi",
             "page": CC_CAMS, "embed": ozolio("CID_XCLW000002D1"), "lat": 27.611, "lon": -97.208},
            {"name": "St. Augustine Beach Access", "provider": "City of Corpus Christi",
             "page": CC_CAMS, "embed": ozolio("CID_BHYP000002DB"), "lat": 27.585, "lon": -97.218},
        ],
        "google": {"place": "Mustang Island State Park", "rating": 4.7, "count": 6124, "place_id": "ChIJ2UCycbX-aIYRD4vljOsY3W8"},
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
        "cams": [
            {"name": "Aransas Pass Harbor Park (bay side)", "provider": "City of Aransas Pass",
             "page": "https://www.youtube.com/watch?v=Mn3vY8bordE", "embed": youtube("Mn3vY8bordE"), "lat": 27.9090, "lon": -97.1440},
            {"name": "The Dunes, near Horace Caldwell Pier", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/259405/the-dunes-port-aransas-live-beach-cam/", "embed": None,
             "lat": 27.8340, "lon": -97.0600},
            {"name": "Sandcastle Condos", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/896845/sandcastle-condos-port-aransas-live-beach-cam/", "embed": None,
             "lat": 27.8320, "lon": -97.0610},
            {"name": "Aransas Princess", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/167516/aransas-princess-port-aransas-beach-live-webcam/", "embed": None,
             "lat": 27.8105, "lon": -97.0710},
            {"name": "Sandpiper Condos", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/518728/port-aransas-beach-live-webvam/", "embed": None,
             "lat": 27.8060, "lon": -97.0740},
            {"name": "Gulf Shores Condos", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/776400/gulf-shores-port-aransas-live-beach-cam/", "embed": None,
             "lat": 27.8010, "lon": -97.0780},
            {"name": "Casa Condos", "provider": "HDOnTap",
             "page": "https://hdontap.com/stream/831616/casa-condos-port-aransas-beach-live-webcam/", "embed": None,
             "lat": 27.7960, "lon": -97.0830},
        ],
        "google": {"place": "Port Aransas Beach", "rating": 4.7, "count": 1040, "place_id": "ChIJhfWx0XmraYYRxYjoh5CD6RE"},
        "tagline": "Lively beach town, drive right up",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Drive-on beach"],
    },
    {
        "id": "north-beach-cc", "name": "North Beach", "city": "Corpus Christi",
        "lat": 27.8236, "lon": -97.3878, "popularity": 0.6, "bay": True,
        "tide_station": "8775296", "obs_station": "8775296", "buoy": None, "nws_zone": "TXZ343",
        "photo": {"url": "https://i.imgur.com/aPm4EWs.jpeg",
                "page": "https://commons.wikimedia.org/wiki/File:Port_Aransas_-Mustang_Island_Beach_-_panoramio.jpg",
                "credit": "dwh1974 (Panoramio)", "license": "CC BY 3.0"},
        "google": {"place": "North Beach", "rating": 4.4, "count": 1037, "place_id": "ChIJVTgKyylcaIYRKczijLQZP6A"},
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
        "google": {"place": "Rockport Beach", "rating": 4.6, "count": 1899, "place_id": "ChIJs-1XnX-0aYYRu6hX3zXgkcU"},
        "tagline": "Gentle bay swimming, great for kids",
        "amenities": ["Restrooms", "Pavilions", "Parking fee"],
    },
    {
        "id": "matagorda", "name": "Matagorda Beach", "city": "Matagorda",
        "lat": 28.5960, "lon": -95.9800, "popularity": 0.25, "bay": False,
        "tide_station": "8773767", "obs_station": "8773767", "buoy": None, "nws_zone": "TXZ436",
        "google": {"place": "Matagorda Beach", "rating": 4.5, "count": 1630, "place_id": "ChIJpSv1ZC7ZQYYRr1Wl3EC7tnY"},
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
        "google": {"place": "Surfside Jetty County Park", "rating": 4.6, "count": 4141, "place_id": "ChIJHREgXUwTQIYRM50qzmXt9Ek"},
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
        "google": {"place": "Galveston Island State Park", "rating": 4.6, "count": 4260, "place_id": "ChIJOaB1ZVuEP4YRMo9bSFNwXVM"},
        "tagline": "Natural shoreline, less busy than town",
        "amenities": ["Restrooms", "Showers", "Park entry fee"],
    },
    {
        "id": "galveston-seawall", "name": "Galveston Beach", "city": "Galveston",
        "lat": 29.2870, "lon": -94.7930, "popularity": 0.9, "bay": False,
        "tide_station": "8771510", "obs_station": "8771341", "buoy": "42035", "nws_zone": "TXZ438",
        "patrol_url": GALVESTON_FLAGS,
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/2025-09-13_12_03_05_Panoramic_view_towards_the_beach_from_the_sea_wall_in_Galveston%2C_Galveston_County%2C_Texas.jpg/500px-2025-09-13_12_03_05_Panoramic_view_towards_the_beach_from_the_sea_wall_in_Galveston%2C_Galveston_County%2C_Texas.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:2025-09-13_12_03_05_Panoramic_view_towards_the_beach_from_the_sea_wall_in_Galveston,_Galveston_County,_Texas.jpg",
                  "credit": "Famartin", "license": "CC BY-SA 4.0"},
        "cams": [
            {"name": "Galveston 24/7 beach camera", "provider": "ABC13 Houston",
             "page": "https://www.youtube.com/watch?v=HkHhXsWci7Q", "embed": youtube("HkHhXsWci7Q"), "lat": 29.3084, "lon": -94.7785},
            {"name": "Murdoch's on the Seawall", "provider": "Galveston TV (YouTube)",
             "page": "https://www.youtube.com/watch?v=aZ0tx7eeLYU", "embed": youtube("aZ0tx7eeLYU"), "lat": 29.2975, "lon": -94.7770},
            {"name": "Seawall surf cam at 43rd Street", "provider": "Galveston TV (YouTube)",
             "page": "https://www.youtube.com/watch?v=r9PwbZwEFas", "embed": youtube("r9PwbZwEFas"), "lat": 29.2836, "lon": -94.8015},
            {"name": "Seawall Boulevard at 28th Street", "provider": "Visit Galveston",
             "page": "https://visitgalveston.com/webcams/seawall-beach-webcam", "embed": ozolio("EMB_EXSX00000340"),
             "lat": 29.2950, "lon": -94.7830},
            {"name": "61st Street Fishing Pier", "provider": "61st Street Pier",
             "page": "https://www.61stpier.com/pier-cam", "embed": ozolio("EMB_CTOK0000018D"), "lat": 29.2705, "lon": -94.8270},
        ],
        "google": {"place": "Galveston Seawall", "rating": 4.7, "count": 3082, "place_id": "ChIJccQJzE-eP4YRphKgX07y2bY"},
        "review_query": "Galveston Seawall, Galveston, TX",
        "tagline": "The classic Seawall beach, right in town",
        "amenities": ["Lifeguard towers", "Restrooms and showers", "Paid parking on the Seawall"],
    },
    {
        "id": "galveston-east", "name": "East Beach", "city": "Galveston",
        "lat": 29.3140, "lon": -94.7570, "popularity": 0.85, "bay": False,
        "tide_station": "8771510", "obs_station": "8771341", "buoy": "42035", "nws_zone": "TXZ438",
        "patrol_url": GALVESTON_FLAGS,
        "photo": {"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston%2C_Galveston_County%2C_Texas.jpg/500px-2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston%2C_Galveston_County%2C_Texas.jpg",
                  "page": "https://commons.wikimedia.org/wiki/File:2025-09-13_12_19_56_View_east-southeast_from_the_beach_in_Galveston,_Galveston_County,_Texas.jpg",
                  "credit": "Famartin", "license": "CC BY-SA 4.0"},
        "google": {"place": "East Beach (R.A. Apffel Park)", "rating": 4.5, "count": 1609, "place_id": "ChIJ0TpwXPyfP4YR5n_viaBOn5s"},
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
        "cams": [
            {"name": "Crystal Beach surf cam", "provider": "Bolivar Peninsula Tourism",
             "page": "https://bolivarpeninsulatexas.com/Webcams/Crystal-Beach-Surf",
             "embed": "https://player.brownrice.com/embed/coastalsurfcam", "lat": 29.4650, "lon": -94.6300},
        ],
        "google": {"place": "Bolivar Beach", "rating": 4.5, "count": 74, "place_id": "ChIJQZkT-G4LP4YRLqpNKJY-TlU"},
        "tagline": "Wide sand and beach houses",
        "amenities": ["Drive-on beach", "Beach parking permit"],
    },
]
