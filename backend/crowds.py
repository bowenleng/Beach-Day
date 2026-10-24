"""Rough crowd estimate. There's no live crowd data for Texas beaches, so this models
how busy a beach is likely to be from its popularity, the day, season, hour and weather."""

from datetime import date

# How busy each month tends to be (summer peak, spring break in March)
SEASON = {1: 0.2, 2: 0.25, 3: 0.75, 4: 0.6, 5: 0.75, 6: 1.0, 7: 1.0, 8: 0.9, 9: 0.6, 10: 0.45, 11: 0.3, 12: 0.25}

# How busy the beach is at each hour of the day, peaking early afternoon
HOUR = [0, 0, 0, 0, 0, 0, 0.05, 0.1, 0.25, 0.45, 0.65, 0.8, 0.95, 1.0, 1.0, 0.95, 0.85, 0.7, 0.5, 0.3, 0.15, 0.05, 0, 0]


def us_holidays(year):
    """Fixed and floating US holidays when beaches get busy."""
    def nth_weekday(month, weekday, n):
        first = date(year, month, 1)
        offset = (weekday - first.weekday()) % 7
        return date(year, month, 1 + offset + 7 * (n - 1))

    may_31 = date(year, 5, 31)
    memorial = may_31.replace(day=31 - may_31.weekday())  # last Monday in May
    return {
        date(year, 1, 1),
        memorial,
        date(year, 7, 4),
        nth_weekday(9, 0, 1),   # Labor Day
        nth_weekday(11, 3, 4),  # Thanksgiving
    }


def estimate_crowds(beach, day, hourly):
    """0-1 crowd level for each hour of the day."""
    busy_day = day.weekday() >= 5 or day in us_holidays(day.year)
    day_factor = 1.0 if busy_day else 0.45
    base = beach["popularity"] * day_factor * SEASON[day.month]

    levels = []
    for hour in range(24):
        weather = 1.0
        rain = hourly["rain_chance"][hour] or 0
        temp = hourly["temp_f"][hour] or 75
        weather -= min(rain, 80) / 100           # rain keeps people home
        if temp < 65:
            weather -= (65 - temp) / 30          # so does cold
        levels.append(round(max(0.0, min(1.0, base * HOUR[hour] * max(weather, 0.1) * 1.6)), 2))
    return levels
