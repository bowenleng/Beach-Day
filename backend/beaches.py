# Texas beaches shown on the Discover page.
# tide_station: NOAA CO-OPS station used for tide predictions.
# popularity: 0-1, how busy the beach tends to get (used by the crowd estimate).
# bay: True for bay-side beaches, where waves are much smaller than the open Gulf.
# Amenities are hand-entered and should be double-checked before relying on them.

BEACHES = [
    {
        "id": "south-padre", "name": "South Padre Island", "city": "South Padre Island",
        "lat": 26.1118, "lon": -97.1681, "tide_station": "8779749", "popularity": 0.9, "bay": False,
        "tagline": "Clear water and big resort energy",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Public parking"],
    },
    {
        "id": "boca-chica", "name": "Boca Chica Beach", "city": "Brownsville",
        "lat": 25.9970, "lon": -97.1550, "tide_station": "8779749", "popularity": 0.15, "bay": False,
        "tagline": "Wild and empty, bring everything",
        "amenities": ["No services", "Drive-on beach"],
    },
    {
        "id": "padre-ns", "name": "Padre Island National Seashore", "city": "Corpus Christi",
        "lat": 27.4260, "lon": -97.2990, "tide_station": "8775870", "popularity": 0.35, "bay": False,
        "tagline": "Undeveloped seashore with room to roam",
        "amenities": ["Visitor center", "Restrooms", "Park entry fee"],
    },
    {
        "id": "mustang-island", "name": "Mustang Island State Park", "city": "Port Aransas",
        "lat": 27.6730, "lon": -97.1700, "tide_station": "8775870", "popularity": 0.4, "bay": False,
        "tagline": "Quiet dunes and long walks",
        "amenities": ["Restrooms", "Showers", "Park entry fee"],
    },
    {
        "id": "port-aransas", "name": "Port Aransas Beach", "city": "Port Aransas",
        "lat": 27.8339, "lon": -97.0611, "tide_station": "8775237", "popularity": 0.8, "bay": False,
        "tagline": "Lively beach town, drive right up",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Drive-on beach"],
    },
    {
        "id": "north-beach-cc", "name": "North Beach", "city": "Corpus Christi",
        "lat": 27.8236, "lon": -97.3878, "tide_station": "8775296", "popularity": 0.6, "bay": True,
        "tagline": "Calm bay water next to the city",
        "amenities": ["Restrooms", "Public parking"],
    },
    {
        "id": "rockport", "name": "Rockport Beach", "city": "Rockport",
        "lat": 28.0290, "lon": -97.0480, "tide_station": "8774770", "popularity": 0.6, "bay": True,
        "tagline": "Gentle bay swimming, great for kids",
        "amenities": ["Restrooms", "Pavilions", "Parking fee"],
    },
    {
        "id": "matagorda", "name": "Matagorda Beach", "city": "Matagorda",
        "lat": 28.5960, "lon": -95.9800, "tide_station": "8773767", "popularity": 0.25, "bay": False,
        "tagline": "Remote and uncrowded, few services",
        "amenities": ["Drive-on beach", "Limited services"],
    },
    {
        "id": "surfside", "name": "Surfside Beach", "city": "Surfside Beach",
        "lat": 28.9440, "lon": -95.2880, "tide_station": "8772447", "popularity": 0.6, "bay": False,
        "tagline": "Laid-back drive-on beach near Houston",
        "amenities": ["Drive-on beach", "Beach parking permit"],
    },
    {
        "id": "galveston-sp", "name": "Galveston Island State Park", "city": "Galveston",
        "lat": 29.1950, "lon": -94.9600, "tide_station": "8771510", "popularity": 0.45, "bay": False,
        "tagline": "Natural shoreline, less busy than town",
        "amenities": ["Restrooms", "Showers", "Park entry fee"],
    },
    {
        "id": "galveston-east", "name": "East Beach", "city": "Galveston",
        "lat": 29.3140, "lon": -94.7570, "tide_station": "8771510", "popularity": 0.85, "bay": False,
        "tagline": "Big, busy, and full of amenities",
        "amenities": ["Seasonal lifeguards", "Restrooms", "Parking fee"],
    },
    {
        "id": "crystal-beach", "name": "Crystal Beach", "city": "Bolivar Peninsula",
        "lat": 29.4650, "lon": -94.6300, "tide_station": "8771341", "popularity": 0.55, "bay": False,
        "tagline": "Wide sand and beach houses",
        "amenities": ["Drive-on beach", "Beach parking permit"],
    },
]
